package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.response.ConversationCallSignalResponse;
import iuh.fit.chat_service.dtos.response.ConversationResponse;
import iuh.fit.chat_service.dtos.response.MessageResponse;

public interface RealtimeEventPublisher {
    void publishUserMessageEvent(String userId, String conversationId, MessageResponse message);

    void publishUserCallSignalEvent(String userId, String conversationId, ConversationCallSignalResponse signal);

    void publishUserConversationEvent(String userId, String conversationId, ConversationResponse conversation);
}
