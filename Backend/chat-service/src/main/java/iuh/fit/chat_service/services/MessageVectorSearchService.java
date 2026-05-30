package iuh.fit.chat_service.services;

import iuh.fit.chat_service.entities.Message;

import java.util.List;

public interface MessageVectorSearchService {
    void upsertMessage(Message message);

    void deleteMessage(String messageId);

    List<ScoredPoint> search(String conversationId, String query, int limit);

    boolean isEnabled();

    record ScoredPoint(String messageId, double score) {
    }
}
