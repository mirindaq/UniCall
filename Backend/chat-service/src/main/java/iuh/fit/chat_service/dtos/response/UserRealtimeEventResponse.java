package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.enums.UserRealtimeEventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRealtimeEventResponse {
    private UserRealtimeEventType eventType;
    private String conversationId;
    private LocalDateTime sentAt;
    private MessageResponse message;
    private ConversationCallSignalResponse callSignal;
    private ConversationResponse conversation;

    public static UserRealtimeEventResponse message(String conversationId, MessageResponse message) {
        return UserRealtimeEventResponse.builder()
                .eventType(UserRealtimeEventType.MESSAGE_UPSERT)
                .conversationId(conversationId)
                .sentAt(LocalDateTime.now())
                .message(message)
                .build();
    }

    public static UserRealtimeEventResponse callSignal(String conversationId, ConversationCallSignalResponse signal) {
        return UserRealtimeEventResponse.builder()
                .eventType(UserRealtimeEventType.CALL_SIGNAL)
                .conversationId(conversationId)
                .sentAt(LocalDateTime.now())
                .callSignal(signal)
                .build();
    }

    public static UserRealtimeEventResponse conversation(String conversationId, ConversationResponse conversation) {
        return UserRealtimeEventResponse.builder()
                .eventType(UserRealtimeEventType.CONVERSATION_UPSERT)
                .conversationId(conversationId)
                .sentAt(LocalDateTime.now())
                .conversation(conversation)
                .build();
    }
}
