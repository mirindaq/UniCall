package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.ChatSendStompPayload;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.enums.MessageEnum;
import iuh.fit.chat_service.enums.MessageType;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.chat_service.services.ChatMessageService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
        Page<Message> result = messageRepository.findByIdConversationOrderByTimeSentDesc(
                conversationId,
                PageRequest.of(page - 1, limit)
        );
        return PageResponse.fromPage(result, MessageResponse::from);
    }

    @Override
    public MessageResponse sendRest(String identityUserId, String conversationId, SendChatMessageRequest request) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        return persistAndBroadcast(identityUserId, conversationId, request.getContent(), request.getType());
    }

    @Override
    public void sendFromStomp(String identityUserId, ChatSendStompPayload payload) {
        if (payload == null || payload.getConversationId() == null || payload.getConversationId().isBlank()) {
            throw new InvalidParamException("Thiếu conversationId");
        }
        if (payload.getContent() == null || payload.getContent().isBlank()) {
            throw new InvalidParamException("content không được để trống");
        }
        MessageType type = payload.getType() == null ? MessageType.TEXT : payload.getType();
        chatConversationService.requireParticipant(payload.getConversationId(), identityUserId);
        persistAndBroadcast(identityUserId, payload.getConversationId(), payload.getContent(), type);
    }

    private MessageResponse persistAndBroadcast(
            String identityUserId,
            String conversationId,
            String content,
            MessageType type
    ) {
        LocalDateTime now = LocalDateTime.now();
        Message message = new Message();
        message.setIdMessage(UUID.randomUUID().toString());
        message.setIdConversation(conversationId);
        message.setIdAccountSent(identityUserId);
        message.setStatus(MessageEnum.SENT);
        message.setContent(content);
        message.setType(type == null ? MessageType.TEXT : type);
        message.setTimeSent(now);
        message.setTimeUpdate(now);
        message.setEdited(false);

        Message saved = messageRepository.save(message);

        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        if (conversation != null) {
            conversation.setLastMessageContent(content);
            conversation.setDateUpdateMessage(now);
            conversationRepository.save(conversation);
        }

        MessageResponse dto = MessageResponse.from(saved);
        messagingTemplate.convertAndSend(topicForConversation(conversationId), dto);
        return dto;
    }

    private static String topicForConversation(String conversationId) {
        return "/topic/conversations." + conversationId + ".messages";
    }
}
