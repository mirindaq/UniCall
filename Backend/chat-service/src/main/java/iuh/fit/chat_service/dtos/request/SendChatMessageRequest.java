package iuh.fit.chat_service.dtos.request;

import iuh.fit.chat_service.enums.MessageType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendChatMessageRequest {
    @NotBlank(message = "content không được để trống")
    private String content;
    private MessageType type = MessageType.TEXT;
}
