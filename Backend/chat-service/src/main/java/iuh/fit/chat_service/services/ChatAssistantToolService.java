package iuh.fit.chat_service.services;

import iuh.fit.chat_service.entities.Attachment;
import iuh.fit.chat_service.enums.ChatAssistantScope;
import iuh.fit.chat_service.enums.ChatAssistantTool;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.MessageType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ChatAssistantToolService {

    List<ConversationToolItem> listMyConversations(String requesterId, Integer limit);

    MessageToolPage getConversationMessages(String requesterId, String conversationId, Integer page, Integer limit);

    MessageToolPage searchMessagesByKeyword(
            String requesterId,
            String conversationId,
            String keyword,
            Integer page,
            Integer limit
    );

    List<SemanticMessageHit> semanticSearchConversation(
            String requesterId,
            String conversationId,
            String query,
            Integer limit
    );

    List<SemanticMessageHit> semanticSearchMyChatSpace(
            String requesterId,
            String query,
            Integer limit,
            String participantId
    );

    Optional<WhoSaidToolResult> findWhoSaid(
            String requesterId,
            String query,
            String conversationId,
            String participantId,
            Integer limit
    );

    record ConversationToolItem(
            String conversationId,
            ConversationType type,
            String name,
            String avatar,
            String lastMessageContent,
            String lastMessageSenderId,
            String lastMessageSenderName,
            LocalDateTime lastMessageTime,
            int unreadCount,
            int memberCount,
            List<ConversationMember> members
    ) {
    }

    record ConversationMember(
            String userId,
            String displayName,
            String avatar
    ) {
    }

    record MessageToolItem(
            String messageId,
            String conversationId,
            String senderId,
            String senderName,
            MessageType type,
            String content,
            LocalDateTime timeSent,
            boolean recalled,
            boolean edited,
            List<Attachment> attachments
    ) {
    }

    record MessageToolPage(
            List<MessageToolItem> items,
            int page,
            int totalPage,
            int limit,
            long totalItem
    ) {
    }

    record SemanticMessageHit(
            String messageId,
            String conversationId,
            String conversationName,
            ConversationType conversationType,
            String senderId,
            String senderName,
            String text,
            LocalDateTime timeSent,
            double score
    ) {
    }

    record WhoSaidToolResult(
            String messageId,
            String conversationId,
            String conversationName,
            ConversationType conversationType,
            String senderId,
            String senderName,
            String text,
            LocalDateTime timeSent,
            double score,
            ChatAssistantScope scope,
            Map<String, Object> evidence
    ) {
    }
}
