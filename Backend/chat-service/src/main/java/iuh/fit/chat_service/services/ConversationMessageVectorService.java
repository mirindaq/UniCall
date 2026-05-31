package iuh.fit.chat_service.services;

import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;

import java.time.LocalDateTime;
import java.util.List;

public interface ConversationMessageVectorService {

    void upsertMessage(Message message, Conversation conversation);

    void deleteMessage(String messageId);

    List<MemoryHit> searchConversation(String conversationId, String requesterId, String query, Integer limit);

    record MemoryHit(
            String messageId,
            String conversationId,
            String senderId,
            String text,
            LocalDateTime timeSent,
            double score
    ) {
    }
}

