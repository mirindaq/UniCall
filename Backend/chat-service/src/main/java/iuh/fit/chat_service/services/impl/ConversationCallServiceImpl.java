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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationCallServiceImpl implements ConversationCallService {
    private static final int MAX_SDP_LENGTH = 120_000;
    private static final int MAX_ICE_CANDIDATE_LENGTH = 8_192;

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

        if (conversation.getType() != ConversationType.DOUBLE) {
            throw new InvalidParamException("Hiện chỉ hỗ trợ gọi thoại cho hội thoại 1-1");
        }

        List<ParticipantInfo> participants = conversation.getParticipantInfos();
        if (participants == null || participants.size() != 2) {
            throw new InvalidParamException("Hội thoại 1-1 không hợp lệ");
        }

        boolean allowed = participants.stream()
                .map(ParticipantInfo::getIdAccount)
                .anyMatch(identityUserId::equals);
        if (!allowed) {
            throw new InvalidParamException("Bạn không thuộc cuộc hội thoại này");
        }

        String targetUserId = participants.stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(id -> id != null && !id.isBlank() && !identityUserId.equals(id))
                .findFirst()
                .orElseThrow(() -> new InvalidParamException("Không xác định được người nhận cuộc gọi"));

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
        validateSignalPayload(request, type);

        CallSession session = syncCallSession(conversationId, callId, identityUserId, targetUserId, type, request);

        ConversationCallSignalResponse response = ConversationCallSignalResponse.builder()
                .conversationId(conversationId)
                .callId(callId)
                .type(type)
                .fromUserId(identityUserId)
                .toUserId(targetUserId)
                .audioOnly(Boolean.TRUE.equals(request.getAudioOnly()))
                // Preserve SDP/candidate exactly as sent; trimming can corrupt SDP semantics.
                .sdp(request.getSdp())
                .candidate(request.getCandidate())
                .sdpMid(request.getSdpMid())
                .sdpMLineIndex(request.getSdpMLineIndex())
                .sentAt(LocalDateTime.now())
                .build();

        realtimeEventPublisher.publishUserCallSignalEvent(identityUserId, conversationId, response);
        realtimeEventPublisher.publishUserCallSignalEvent(targetUserId, conversationId, response);
        if (session.getEndedAt() != null && session.getOutcome() != null && session.getSummaryMessageId() == null) {
            persistCallSummaryMessage(session);
        }
    }

    private static String normalize(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new InvalidParamException(message);
        }
        return value.trim();
    }

    private static void validateSignalPayload(ConversationCallSignalRequest request, CallSignalType type) {
        String sdp = request.getSdp();
        String candidate = request.getCandidate();
        if ((type == CallSignalType.OFFER || type == CallSignalType.ACCEPT) && isBlank(sdp)) {
            throw new InvalidParamException("Thiếu SDP cho tín hiệu cuộc gọi");
        }
        if (type == CallSignalType.ICE_CANDIDATE && isBlank(candidate)) {
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

    private CallSession syncCallSession(
            String conversationId,
            String callId,
            String actorUserId,
            String targetUserId,
            CallSignalType type,
            ConversationCallSignalRequest request
    ) {
        LocalDateTime now = LocalDateTime.now();
        CallSession session = callSessionRepository.findById(callId).orElseGet(() -> {
            CallSession created = new CallSession();
            created.setCallId(callId);
            created.setConversationId(conversationId);
            created.setCallerUserId(actorUserId);
            created.setCalleeUserId(targetUserId);
            created.setAudioOnly(Boolean.TRUE.equals(request.getAudioOnly()));
            created.setInitiatedAt(now);
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
            session.setCalleeUserId(targetUserId);
            session.setAudioOnly(Boolean.TRUE.equals(request.getAudioOnly()));
            if (session.getInitiatedAt() == null) {
                session.setInitiatedAt(now);
            }
            return callSessionRepository.save(session);
        }

        if (type == CallSignalType.ACCEPT) {
            session.setAcceptedAt(now);
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
        message.setContent(session.isAudioOnly() ? "Cuộc gọi thoại" : "Cuộc gọi video");
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
        conversation.setLastMessageContent(buildCallPreview(session));
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

    private static String buildCallPreview(CallSession session) {
        String callKind = session.isAudioOnly() ? "thoại" : "video";
        if (session.getOutcome() == CallOutcome.COMPLETED) {
            return "Cuộc gọi " + callKind;
        }
        if (session.getOutcome() == CallOutcome.NO_ANSWER) {
            return session.isAudioOnly() ? "Cuộc gọi nhỡ" : "Cuộc gọi video nhỡ";
        }
        if (session.getOutcome() == CallOutcome.REJECTED) {
            return session.isAudioOnly() ? "Cuộc gọi bị từ chối" : "Cuộc gọi video bị từ chối";
        }
        return "Cuộc gọi kết thúc";
    }
}
