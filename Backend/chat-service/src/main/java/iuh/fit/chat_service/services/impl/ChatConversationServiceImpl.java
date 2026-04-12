package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.clients.GrpcUserServiceClient;
import iuh.fit.chat_service.dtos.request.CreateDirectConversationRequest;
import iuh.fit.chat_service.dtos.response.ConversationResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.entities.MessageReadStatus;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.AttachmentType;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.MessageType;
import iuh.fit.chat_service.enums.ParicipantRole;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.repositories.MessageReadStatusRepository;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatConversationServiceImpl implements ChatConversationService {

    private static final Pattern URL_PATTERN = Pattern.compile("https?://\\S+", Pattern.CASE_INSENSITIVE);

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageReadStatusRepository messageReadStatusRepository;
    private final GrpcUserServiceClient grpcUserServiceClient;

    @Override
    public List<ConversationResponse> listMyConversations(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }

        List<Conversation> myConversations = conversationRepository.findByParticipantAccount(identityUserId);
        if (myConversations.isEmpty()) {
            return List.of();
        }

        List<String> conversationIds = myConversations.stream()
                .map(Conversation::getIdConversation)
                .filter(id -> id != null && !id.isBlank())
                .toList();
        Map<String, MessageReadStatus> readStatusByConversationId = messageReadStatusRepository
                .findByIdConversationIn(conversationIds)
                .stream()
                .collect(Collectors.toMap(
                        MessageReadStatus::getIdConversation,
                        status -> status,
                        (left, right) -> left
                ));

        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = new HashMap<>();
        List<ConversationResponse> responses = new ArrayList<>();
        for (Conversation conversation : myConversations) {
            ConversationResponse response = toConversationResponse(conversation, identityUserId, userDisplayCache);
            if (response == null) {
                continue;
            }
            response.setUnreadCount(resolveUnreadCount(conversation.getIdConversation(), identityUserId, readStatusByConversationId));
            responses.add(response);
        }
        return responses;
    }

    @Override
    public ConversationResponse getOrCreateDirect(String identityUserId, CreateDirectConversationRequest request) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        String other = request.getOtherUserId();
        if (other == null || other.isBlank()) {
            throw new InvalidParamException("otherUserId không hợp lệ");
        }
        if (other.equals(identityUserId)) {
            throw new InvalidParamException("Không thể tạo hội thoại 1-1 với chính mình");
        }
        List<String> pair = Stream.of(identityUserId, other)
                .sorted(Comparator.naturalOrder())
                .toList();
        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = new HashMap<>();
        return conversationRepository.findDirectConversationBetweenPair(pair)
                .map(conversation -> toConversationResponse(conversation, identityUserId, userDisplayCache))
                .orElseGet(() -> toConversationResponse(
                        conversationRepository.save(newDirectConversation(identityUserId, other)),
                        identityUserId,
                        userDisplayCache
                ));
    }

    @Override
    public void markConversationAsRead(String identityUserId, String conversationId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        if (!StringUtils.hasText(conversationId)) {
            throw new InvalidParamException("conversationId không hợp lệ");
        }

        requireParticipant(conversationId, identityUserId);

        Message latestVisible = messageRepository.findVisibleForParticipant(
                conversationId,
                identityUserId,
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "timeSent"))
        ).stream().findFirst().orElse(null);

        LocalDateTime seenAt = latestVisible != null && latestVisible.getTimeSent() != null
                ? latestVisible.getTimeSent()
                : LocalDateTime.now();
        String seenMessageId = latestVisible == null ? null : latestVisible.getIdMessage();

        MessageReadStatus status = messageReadStatusRepository.findByIdConversation(conversationId)
                .orElseGet(() -> {
                    MessageReadStatus created = new MessageReadStatus();
                    created.setIdConversation(conversationId);
                    return created;
                });

        List<MessageReadStatus.SeenInfo> seenBy = status.getSeenBy();
        if (seenBy == null) {
            seenBy = new ArrayList<>();
        }

        boolean updated = false;
        for (MessageReadStatus.SeenInfo seenInfo : seenBy) {
            if (identityUserId.equals(seenInfo.getIdAccount())) {
                seenInfo.setTimeSeen(seenAt);
                updated = true;
                break;
            }
        }
        if (!updated) {
            seenBy.add(new MessageReadStatus.SeenInfo(identityUserId, seenAt));
        }

        status.setSeenBy(seenBy);
        status.setIdLastMessageSeen(seenMessageId);
        status.setTimeSeen(seenAt);
        messageReadStatusRepository.save(status);
    }

    @Override
    public void requireParticipant(String conversationId, String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hội thoại"));
        List<ParticipantInfo> infos = conversation.getParticipantInfos();
        if (infos == null || infos.isEmpty()) {
            throw new InvalidParamException("Hội thoại không có thành viên");
        }
        boolean allowed = infos.stream().anyMatch(p -> identityUserId.equals(p.getIdAccount()));
        if (!allowed) {
            throw new InvalidParamException("Bạn không thuộc cuộc hội thoại này");
        }
    }

    private static Conversation newDirectConversation(String identityUserId, String otherUserId) {
        LocalDateTime now = LocalDateTime.now();
        List<ParticipantInfo> participantInfos = new ArrayList<>();
        participantInfos.add(new ParticipantInfo(identityUserId, ParicipantRole.USER, null, now));
        participantInfos.add(new ParticipantInfo(otherUserId, ParicipantRole.USER, null, now));

        Conversation conversation = new Conversation();
        conversation.setIdConversation(UUID.randomUUID().toString());
        conversation.setType(ConversationType.DOUBLE);
        conversation.setName(null);
        conversation.setAvatar(null);
        conversation.setDateCreate(now);
        conversation.setDateUpdateMessage(now);
        conversation.setLastMessageContent(null);
        conversation.setNumberMember(2);
        conversation.setParticipantInfos(participantInfos);
        return conversation;
    }

    private ConversationResponse toConversationResponse(
            Conversation conversation,
            String currentIdentityUserId,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        ConversationResponse response = ConversationResponse.from(conversation);
        if (response == null) {
            return null;
        }
        enrichLastMessageMeta(response, conversation.getIdConversation(), currentIdentityUserId);
        if (conversation.getType() != ConversationType.DOUBLE) {
            return response;
        }
        if (response.getName() != null && !response.getName().isBlank()) {
            return response;
        }

        String peerIdentityUserId = conversation.getParticipantInfos() == null
                ? null
                : conversation.getParticipantInfos().stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(id -> id != null && !id.isBlank() && !id.equals(currentIdentityUserId))
                .findFirst()
                .orElse(null);
        if (peerIdentityUserId == null || peerIdentityUserId.isBlank()) {
            return response;
        }

        GrpcUserServiceClient.UserDisplayInfo displayInfo = userDisplayCache.computeIfAbsent(
                peerIdentityUserId,
                key -> grpcUserServiceClient.getUserDisplayInfo(key)
                        .orElse(new GrpcUserServiceClient.UserDisplayInfo(key, null))
        );

        response.setName(displayInfo.displayName());
        if (response.getAvatar() == null || response.getAvatar().isBlank()) {
            response.setAvatar(displayInfo.avatar());
        }
        return response;
    }

    private void enrichLastMessageMeta(
            ConversationResponse response,
            String conversationId,
            String identityUserId
    ) {
        Message latest = messageRepository.findVisibleForParticipant(
                conversationId,
                identityUserId,
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "timeSent"))
        ).stream().findFirst().orElse(null);

        if (latest == null) {
            return;
        }

        response.setLastMessageContent(buildPreviewFromMessage(latest));
        response.setLastMessageSenderId(latest.getIdAccountSent());
    }

    private int resolveUnreadCount(
            String conversationId,
            String identityUserId,
            Map<String, MessageReadStatus> readStatusByConversationId
    ) {
        if (!StringUtils.hasText(conversationId)) {
            return 0;
        }

        LocalDateTime seenAt = resolveSeenAt(conversationId, identityUserId, readStatusByConversationId);
        long unreadCount = seenAt == null
                ? messageRepository.countIncomingVisibleForParticipant(conversationId, identityUserId)
                : messageRepository.countUnreadForParticipantSince(conversationId, identityUserId, seenAt);
        if (unreadCount <= 0) {
            return 0;
        }
        return unreadCount > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) unreadCount;
    }

    private LocalDateTime resolveSeenAt(
            String conversationId,
            String identityUserId,
            Map<String, MessageReadStatus> readStatusByConversationId
    ) {
        LocalDateTime now = LocalDateTime.now();

        MessageReadStatus status = readStatusByConversationId.get(conversationId);
        if (status == null) {
            MessageReadStatus created = new MessageReadStatus();
            created.setIdConversation(conversationId);
            created.setTimeSeen(now);
            created.setSeenBy(new ArrayList<>(List.of(new MessageReadStatus.SeenInfo(identityUserId, now))));
            MessageReadStatus saved = messageReadStatusRepository.save(created);
            readStatusByConversationId.put(conversationId, saved);
            return now;
        }

        List<MessageReadStatus.SeenInfo> seenBy = status.getSeenBy();
        if (seenBy == null) {
            seenBy = new ArrayList<>();
        }

        for (MessageReadStatus.SeenInfo seenInfo : seenBy) {
            if (!identityUserId.equals(seenInfo.getIdAccount())) {
                continue;
            }
            if (seenInfo.getTimeSeen() != null) {
                return seenInfo.getTimeSeen();
            }
            seenInfo.setTimeSeen(now);
            status.setSeenBy(seenBy);
            status.setTimeSeen(now);
            messageReadStatusRepository.save(status);
            return now;
        }

        seenBy.add(new MessageReadStatus.SeenInfo(identityUserId, now));
        status.setSeenBy(seenBy);
        status.setTimeSeen(now);
        messageReadStatusRepository.save(status);
        return now;
    }

    private static String buildPreviewFromMessage(Message message) {
        if (message == null) {
            return "";
        }

        if (message.isRecalled()) {
            return StringUtils.hasText(message.getContent()) ? message.getContent() : "Tin nhắn đã thu hồi";
        }

        if (message.getType() == MessageType.CALL) {
            return "Cuộc gọi thoại";
        }

        if (message.getAttachments() != null && !message.getAttachments().isEmpty()) {
            AttachmentType type = message.getAttachments().get(0).getType();
            if (type == AttachmentType.GIF) {
                return "Đã gửi GIF";
            }
            if (type == AttachmentType.STICKER) {
                return "Đã gửi sticker";
            }
            if (type == AttachmentType.IMAGE) {
                return "Đã gửi hình ảnh";
            }
            if (type == AttachmentType.VIDEO) {
                return "Đã gửi video";
            }
            if (type == AttachmentType.AUDIO) {
                return "Đã gửi file âm thanh";
            }
            if (type == AttachmentType.LINK) {
                return "Đã gửi link";
            }
            if (type == AttachmentType.FILE) {
                if (StringUtils.hasText(message.getContent())) {
                    return message.getContent();
                }
                return "Đã gửi file";
            }
            return "Đã gửi tệp đính kèm";
        }

        if (StringUtils.hasText(message.getContent()) && URL_PATTERN.matcher(message.getContent()).find()) {
            return "Đã gửi link";
        }

        return message.getContent();
    }
}
