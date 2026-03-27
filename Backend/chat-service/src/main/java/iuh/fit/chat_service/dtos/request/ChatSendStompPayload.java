package iuh.fit.chat_service.dtos.request;

import iuh.fit.chat_service.enums.MessageType;
import lombok.Data;

@Data
public class ChatSendStompPayload {
    private String conversationId;
    private String content;
    private MessageType type = MessageType.TEXT;
}
