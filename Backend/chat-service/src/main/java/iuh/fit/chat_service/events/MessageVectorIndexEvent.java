package iuh.fit.chat_service.events;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageVectorIndexEvent {
    private MessageVectorIndexAction action;
    private String conversationId;
    private String messageId;
}

