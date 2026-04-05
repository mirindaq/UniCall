package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.ChatSendStompPayload;
import iuh.fit.chat_service.dtos.request.MessageAttachmentRequest;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.entities.Attachment;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.enums.AttachmentType;
import iuh.fit.chat_service.enums.MessageEnum;
import iuh.fit.chat_service.enums.MessageType;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.chat_service.services.ChatMessageService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ChatConversationService chatConversationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public PageResponse<MessageResponse> listMessages(
            String identityUserId,
            String conversationId,
            int page,
            int limit
    ) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        if (page < 1) {
            throw new InvalidParamException("page phải >= 1");
        }
        if (limit < 1 || limit > 100) {
            throw new InvalidParamException("limit phải từ 1 đến 100");
        }
        Page<Message> result = messageRepository.findVisibleForParticipant(
                conversationId,
                identityUserId,
                PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "timeSent"))
        );
        return PageResponse.fromPage(result, MessageResponse::from);
    }

    @Override
    public MessageResponse sendRest(String identityUserId, String conversationId, SendChatMessageRequest request) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        return persistAndBroadcast(
                identityUserId,
                conversationId,
                request.getContent(),
                request.getType(),
                request.getAttachments(),
                request.getReplyToMessageId()
        );
    }

    @Override
    public void sendFromStomp(String identityUserId, ChatSendStompPayload payload) {
        if (payload == null || payload.getConversationId() == null || payload.getConversationId().isBlank()) {
            throw new InvalidParamException("Thiếu conversationId");
        }
        MessageType type = payload.getType() == null ? MessageType.TEXT : payload.getType();
        chatConversationService.requireParticipant(payload.getConversationId(), identityUserId);
        persistAndBroadcast(
                identityUserId,
                payload.getConversationId(),
                payload.getContent(),
                type,
                payload.getAttachments(),
                payload.getReplyToMessageId()
        );
    }

    private MessageResponse persistAndBroadcast(
            String identityUserId,
            String conversationId,
            String content,
            MessageType type,
            List<MessageAttachmentRequest> attachmentRequests,
            String replyToMessageId
    ) {
        List<Attachment> attachments = toAttachments(attachmentRequests);
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isBlank() && attachments.isEmpty()) {
            throw new InvalidParamException("content hoặc attachments không được để trống");
        }

        LocalDateTime now = LocalDateTime.now();
        Message message = new Message();
        message.setIdMessage(UUID.randomUUID().toString());
        message.setIdConversation(conversationId);
        message.setIdAccountSent(identityUserId);
        message.setStatus(MessageEnum.SENT);
        message.setContent(normalizedContent);
        message.setType(type == null ? MessageType.TEXT : type);
        message.setTimeSent(now);
        message.setTimeUpdate(now);
        message.setAttachments(attachments);
        message.setEdited(false);
        message.setReplyToMessageId(resolveReplyToMessageId(conversationId, replyToMessageId));

        Message saved = messageRepository.save(message);

        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        if (conversation != null) {
            conversation.setLastMessageContent(buildLastMessagePreview(normalizedContent, attachments));
            conversation.setDateUpdateMessage(now);
            conversationRepository.save(conversation);
        }

        MessageResponse dto = MessageResponse.from(saved);
        messagingTemplate.convertAndSend(topicForConversation(conversationId), dto);
        return dto;
    }

    @Override
    public MessageResponse recallMessage(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = messageRepository
                .findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin nhắn"));
        if (!conversationId.equals(message.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn không thuộc hội thoại này");
        }
        if (!identityUserId.equals(message.getIdAccountSent())) {
            throw new InvalidParamException("Chỉ người gửi mới thu hồi được tin nhắn");
        }
        if (message.isRecalled()) {
            throw new InvalidParamException("Tin nhắn đã được thu hồi");
        }
        LocalDateTime now = LocalDateTime.now();
        message.setRecalled(true);
        message.setContent("Tin nhắn đã thu hồi");
        message.setAttachments(List.of());
        message.setType(MessageType.TEXT);
        message.setTimeUpdate(now);
        Message saved = messageRepository.save(message);
        MessageResponse dto = MessageResponse.from(saved);
        messagingTemplate.convertAndSend(topicForConversation(conversationId), dto);
        return dto;
    }

    @Override
    public void hideMessageForMe(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = messageRepository
                .findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin nhắn"));
        if (!conversationId.equals(message.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn không thuộc hội thoại này");
        }
        List<String> hidden = message.getHiddenForAccountIds();
        if (hidden == null) {
            hidden = new ArrayList<>();
        }
        if (hidden.contains(identityUserId)) {
            return;
        }
        hidden.add(identityUserId);
        message.setHiddenForAccountIds(hidden);
        messageRepository.save(message);
    }

    private String resolveReplyToMessageId(String conversationId, String replyToMessageId) {
        if (replyToMessageId == null || replyToMessageId.isBlank()) {
            return null;
        }
        String trimmed = replyToMessageId.trim();
        Message ref = messageRepository
                .findById(trimmed)
                .orElseThrow(() -> new InvalidParamException("Tin nhắn trả lời không tồn tại"));
        if (!conversationId.equals(ref.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn trả lời không thuộc hội thoại này");
        }
        return ref.getIdMessage();
    }

    private static String topicForConversation(String conversationId) {
        return "/topic/conversations." + conversationId + ".messages";
    }

    private static List<Attachment> toAttachments(List<MessageAttachmentRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        List<Attachment> attachments = new ArrayList<>(requests.size());
        for (MessageAttachmentRequest req : requests) {
            if (req == null || req.getType() == null || req.getUrl() == null || req.getUrl().isBlank()) {
                continue;
            }
            Attachment attachment = new Attachment();
            attachment.setIdAttachment(UUID.randomUUID().toString());
            attachment.setType(req.getType());
            attachment.setUrl(req.getUrl().trim());
            attachment.setSize(req.getSize());
            attachment.setMetaData(req.getMetaData());
            attachment.setOrder(req.getOrder() == null ? 0 : req.getOrder());
            attachment.setTimeUpload(LocalDateTime.now());
            attachments.add(attachment);
        }
        return attachments;
    }

    private static String buildLastMessagePreview(String content, List<Attachment> attachments) {
        if (attachments != null && !attachments.isEmpty()) {
            AttachmentType type = attachments.get(0).getType();
            if (type == AttachmentType.GIF) {
                return "Đã gửi GIF";
            }
            if (type == AttachmentType.STICKER) {
                return "Đã gửi sticker";
            }
            return "Đã gửi tệp đính kèm";
        }
        return content;
    }
}
