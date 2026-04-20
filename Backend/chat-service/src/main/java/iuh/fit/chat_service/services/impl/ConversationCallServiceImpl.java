package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.ConversationCallSignalRequest;
import iuh.fit.chat_service.dtos.response.ConversationCallSignalResponse;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.entities.CallMessageInfo;
import iuh.fit.chat_service.entities.CallSession;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.CallOutcome;
import iuh.fit.chat_service.enums.CallSignalType;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.MessageEnum;
import iuh.fit.chat_service.enums.MessageType;
import iuh.fit.chat_service.repositories.CallSessionRepository;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.services.ConversationCallService;
import iuh.fit.chat_service.services.RealtimeEventPublisher;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationCallServiceImpl implements ConversationCallService {
    private static final int MAX_SDP_LENGTH = 120_000;
    private static final int MAX_ICE_CANDIDATE_LENGTH = 8_192;
    private static final int MAX_GROUP_CALL_MEMBERS = 5;

    private final CallSessionRepository callSessionRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    @Override
    public void sendSignal(String identityUserId, ConversationCallSignalRequest request) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        if (request == null) {
            throw new InvalidParamException("Thiếu dữ liệu tín hiệu cuộc gọi");
        }
        String conversationId = normalize(request.getConversationId(), "Thiếu conversationId");
        CallSignalType type = request.getType();
        if (type == null) {
            throw new InvalidParamException("Thiếu loại tín hiệu cuộc gọi");
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hội thoại"));

        List<ParticipantInfo> participants = conversation.getParticipantInfos();
        if (participants == null || participants.isEmpty()) {
            throw new InvalidParamException("Hội thoại không có thành viên hợp lệ");
        }

        boolean allowed = participants.stream()
                .map(ParticipantInfo::getIdAccount)
                .anyMatch(identityUserId::equals);
        if (!allowed) {
            throw new InvalidParamException("Bạn không thuộc cuộc hội thoại này");
        }

        List<String> participantUserIds = participants.stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();

        if (conversation.getType() == ConversationType.DOUBLE && participantUserIds.size() != 2) {
            throw new InvalidParamException("Hội thoại 1-1 không hợp lệ");
        }

        String targetUserId = participants.stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(id -> id != null && !id.isBlank() && !identityUserId.equals(id))
                .findFirst()
                .orElse(null);

        if (conversation.getType() == ConversationType.DOUBLE && (targetUserId == null || targetUserId.isBlank())) {
            throw new InvalidParamException("Không xác định được người nhận cuộc gọi");
        }

        String callId = request.getCallId();
        if (callId == null || callId.isBlank()) {
            if (type == CallSignalType.OFFER) {
                callId = UUID.randomUUID().toString();
            } else {
                throw new InvalidParamException("Thiếu callId");
            }
        } else {
            callId = callId.trim();
        }
        validateSignalPayload(request, type, conversation.getType());
        boolean audioOnly = resolveAudioOnly(conversation.getType(), request.getAudioOnly());

        List<String> offerTargetUserIds = resolveOfferTargetUserIds(
                conversation,
                participantUserIds,
                identityUserId,
                request.getTargetUserIds()
        );
        CallSession session = syncCallSession(
                conversationId,
                callId,
                identityUserId,
                targetUserId,
                type,
                audioOnly,
                offerTargetUserIds
        );

        List<String> recipientUserIds = resolveRecipientUserIds(conversation, participantUserIds, session, offerTargetUserIds, type);
        LocalDateTime sentAt = LocalDateTime.now();
        for (String participantUserId : recipientUserIds) {
            ConversationCallSignalResponse response = ConversationCallSignalResponse.builder()
                    .conversationId(conversationId)
                    .callId(callId)
                    .type(type)
                    .fromUserId(identityUserId)
                    .toUserId(participantUserId)
                    .audioOnly(audioOnly)
                    .sdp(request.getSdp())
                    .candidate(request.getCandidate())
                    .sdpMid(request.getSdpMid())
                    .sdpMLineIndex(request.getSdpMLineIndex())
                    .sentAt(sentAt)
                    .build();
            realtimeEventPublisher.publishUserCallSignalEvent(participantUserId, conversationId, response);
        }
        if (session.getEndedAt() != null
                && session.getOutcome() != null
                && session.getSummaryMessageId() == null) {
            persistCallSummaryMessage(session);
        }
    }

    private static String normalize(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new InvalidParamException(message);
        }
        return value.trim();
    }

    private static void validateSignalPayload(
            ConversationCallSignalRequest request,
            CallSignalType type,
            ConversationType conversationType
    ) {
        String sdp = request.getSdp();
        String candidate = request.getCandidate();
        boolean requiresSdp = conversationType != ConversationType.GROUP
                && (type == CallSignalType.OFFER || type == CallSignalType.ACCEPT);
        if (requiresSdp && isBlank(sdp)) {
            throw new InvalidParamException("Thiếu SDP cho tín hiệu cuộc gọi");
        }
        if (conversationType != ConversationType.GROUP
                && type == CallSignalType.ICE_CANDIDATE
                && isBlank(candidate)) {
            throw new InvalidParamException("Thiếu ICE candidate");
        }
        if (!isBlank(sdp) && sdp.length() > MAX_SDP_LENGTH) {
            throw new InvalidParamException("SDP vượt quá giới hạn cho phép");
        }
        if (!isBlank(candidate) && candidate.length() > MAX_ICE_CANDIDATE_LENGTH) {
            throw new InvalidParamException("ICE candidate vượt quá giới hạn cho phép");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static boolean resolveAudioOnly(ConversationType conversationType, Boolean requestAudioOnly) {
        if (conversationType == ConversationType.GROUP) {
            return false;
        }
        return Boolean.TRUE.equals(requestAudioOnly);
    }

    private static List<String> resolveOfferTargetUserIds(
            Conversation conversation,
            List<String> participantUserIds,
            String actorUserId,
            List<String> requestedTargetUserIds
    ) {
        if (conversation.getType() != ConversationType.GROUP) {
            return List.of();
        }
        if (requestedTargetUserIds == null || requestedTargetUserIds.isEmpty()) {
            return List.of();
        }

        Set<String> allowedUserIds = new LinkedHashSet<>(participantUserIds);
        List<String> normalizedTargetUserIds = requestedTargetUserIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .filter(id -> !actorUserId.equals(id))
                .distinct()
                .toList();

        int maxTargets = Math.max(0, MAX_GROUP_CALL_MEMBERS - 1);
        if (normalizedTargetUserIds.size() > maxTargets) {
            throw new InvalidParamException("Cuộc gọi nhóm chỉ cho phép tối đa 5 người (bao gồm người gọi)");
        }
        for (String targetId : normalizedTargetUserIds) {
            if (!allowedUserIds.contains(targetId)) {
                throw new InvalidParamException("Danh sách người tham gia có thành viên không thuộc nhóm");
            }
        }
        return normalizedTargetUserIds;
    }

    private static List<String> resolveRecipientUserIds(
            Conversation conversation,
            List<String> participantUserIds,
            CallSession session,
            List<String> offerTargetUserIds,
            CallSignalType signalType
    ) {
        if (conversation.getType() != ConversationType.GROUP) {
            return participantUserIds;
        }

        List<String> sessionTargets = session.getParticipantUserIds();
        if (signalType == CallSignalType.OFFER && offerTargetUserIds != null && !offerTargetUserIds.isEmpty()) {
            return mergeCallerWithTargets(session.getCallerUserId(), offerTargetUserIds);
        }
        if (sessionTargets != null && !sessionTargets.isEmpty()) {
            return sessionTargets;
        }
        return participantUserIds;
    }

    private static List<String> mergeCallerWithTargets(String callerUserId, List<String> targetUserIds) {
        Set<String> userIds = new LinkedHashSet<>();
        if (callerUserId != null && !callerUserId.isBlank()) {
            userIds.add(callerUserId);
        }
        for (String target : targetUserIds) {
            if (target != null && !target.isBlank()) {
                userIds.add(target);
            }
        }
        return new ArrayList<>(userIds);
    }

    private CallSession syncCallSession(
            String conversationId,
            String callId,
            String actorUserId,
            String targetUserId,
            CallSignalType type,
            boolean audioOnly,
            List<String> offerTargetUserIds
    ) {
        LocalDateTime now = LocalDateTime.now();
        CallSession session = callSessionRepository.findById(callId).orElseGet(() -> {
            CallSession created = new CallSession();
            created.setCallId(callId);
            created.setConversationId(conversationId);
            created.setCallerUserId(actorUserId);
            created.setCalleeUserId(targetUserId);
            created.setAudioOnly(audioOnly);
            created.setInitiatedAt(now);
            created.setParticipantUserIds(List.of());
            return created;
        });

        if (!conversationId.equals(session.getConversationId())) {
            throw new InvalidParamException("callId không thuộc conversation hiện tại");
        }
        if (session.getEndedAt() != null) {
            return session;
        }

        if (type == CallSignalType.OFFER) {
            session.setCallerUserId(actorUserId);
            if (targetUserId != null && !targetUserId.isBlank()) {
                session.setCalleeUserId(targetUserId);
            }
            session.setAudioOnly(audioOnly);
            if (session.getInitiatedAt() == null) {
                session.setInitiatedAt(now);
            }
            if (offerTargetUserIds != null && !offerTargetUserIds.isEmpty()) {
                session.setParticipantUserIds(mergeCallerWithTargets(actorUserId, offerTargetUserIds));
            } else {
                session.setParticipantUserIds(List.of());
            }
            return callSessionRepository.save(session);
        }

        if (type == CallSignalType.ACCEPT) {
            session.setAcceptedAt(now);
            if (session.getCalleeUserId() == null || session.getCalleeUserId().isBlank()) {
                session.setCalleeUserId(actorUserId);
            }
            return callSessionRepository.save(session);
        }

        if (type == CallSignalType.REJECT) {
            session.setEndedAt(now);
            session.setEndedByUserId(actorUserId);
            session.setOutcome(CallOutcome.REJECTED);
            session.setDurationSeconds(0L);
            return callSessionRepository.save(session);
        }

        if (type == CallSignalType.END) {
            session.setEndedAt(now);
            session.setEndedByUserId(actorUserId);
            if (session.getAcceptedAt() != null) {
                session.setOutcome(CallOutcome.COMPLETED);
                long durationSeconds = Math.max(0, ChronoUnit.SECONDS.between(session.getAcceptedAt(), now));
                session.setDurationSeconds(durationSeconds);
            } else if (actorUserId.equals(session.getCallerUserId())) {
                session.setOutcome(CallOutcome.NO_ANSWER);
                session.setDurationSeconds(0L);
            } else {
                session.setOutcome(CallOutcome.CANCELED);
                session.setDurationSeconds(0L);
            }
            return callSessionRepository.save(session);
        }

        return callSessionRepository.save(session);
    }

    private void persistCallSummaryMessage(CallSession session) {
        Conversation conversation = conversationRepository.findById(session.getConversationId()).orElse(null);
        if (conversation == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        Message message = new Message();
        message.setIdMessage(UUID.randomUUID().toString());
        message.setIdConversation(session.getConversationId());
        message.setIdAccountSent(session.getCallerUserId());
        message.setStatus(MessageEnum.SENT);
        boolean isGroupConversation = conversation.getType() == ConversationType.GROUP;
        message.setContent(buildCallSummaryContent(session, isGroupConversation));
        message.setType(MessageType.CALL);
        message.setTimeSent(now);
        message.setTimeUpdate(now);
        message.setAttachments(List.of());
        message.setEdited(false);
        message.setRecalled(false);
        message.setCallInfo(new CallMessageInfo(
                session.getCallId(),
                session.isAudioOnly(),
                session.getCallerUserId(),
                session.getCalleeUserId(),
                session.getEndedByUserId(),
                session.getDurationSeconds(),
                session.getOutcome()
        ));

        Message saved = messageRepository.save(message);
        session.setSummaryMessageId(saved.getIdMessage());
        callSessionRepository.save(session);
        conversation.setLastMessageContent(buildCallPreview(session, isGroupConversation));
        conversation.setDateUpdateMessage(now);
        conversationRepository.save(conversation);
        MessageResponse dto = MessageResponse.from(saved);
        List<ParticipantInfo> participants = conversation.getParticipantInfos();
        if (participants != null) {
            participants.stream()
                    .map(ParticipantInfo::getIdAccount)
                    .filter(id -> id != null && !id.isBlank())
                    .distinct()
                    .forEach(id -> realtimeEventPublisher.publishUserMessageEvent(
                            id,
                            session.getConversationId(),
                            dto
                    ));
        }
    }

    private static String buildCallSummaryContent(CallSession session, boolean isGroupConversation) {
        if (!isGroupConversation) {
            return session.isAudioOnly() ? "Cuộc gọi thoại" : "Cuộc gọi video";
        }
        return session.isAudioOnly() ? "Cuộc gọi nhóm thoại" : "Cuộc gọi nhóm video";
    }

    private static String buildCallPreview(CallSession session, boolean isGroupConversation) {
        String callKind = session.isAudioOnly() ? "thoại" : "video";
        String prefix = isGroupConversation ? "Cuộc gọi nhóm " : "Cuộc gọi ";
        if (session.getOutcome() == CallOutcome.COMPLETED) {
            return prefix + callKind;
        }
        if (session.getOutcome() == CallOutcome.NO_ANSWER) {
            return session.isAudioOnly()
                    ? (isGroupConversation ? "Cuộc gọi nhóm nhỡ" : "Cuộc gọi nhỡ")
                    : (isGroupConversation ? "Cuộc gọi nhóm video nhỡ" : "Cuộc gọi video nhỡ");
        }
        if (session.getOutcome() == CallOutcome.REJECTED) {
            return session.isAudioOnly()
                    ? (isGroupConversation ? "Cuộc gọi nhóm bị từ chối" : "Cuộc gọi bị từ chối")
                    : (isGroupConversation ? "Cuộc gọi nhóm video bị từ chối" : "Cuộc gọi video bị từ chối");
        }
        return isGroupConversation ? "Cuộc gọi nhóm kết thúc" : "Cuộc gọi kết thúc";
    }
}
