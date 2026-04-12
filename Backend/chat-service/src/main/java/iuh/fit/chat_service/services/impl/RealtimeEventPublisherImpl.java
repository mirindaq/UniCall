package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.response.ConversationCallSignalResponse;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.dtos.response.UserRealtimeEventResponse;
import iuh.fit.chat_service.services.RealtimeEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RealtimeEventPublisherImpl implements RealtimeEventPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishUserMessageEvent(String userId, String conversationId, MessageResponse message) {
        messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/events",
                UserRealtimeEventResponse.message(conversationId, message)
        );
    }

    @Override
    public void publishUserCallSignalEvent(String userId, String conversationId, ConversationCallSignalResponse signal) {
        messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/events",
                UserRealtimeEventResponse.callSignal(conversationId, signal)
        );
    }
}
