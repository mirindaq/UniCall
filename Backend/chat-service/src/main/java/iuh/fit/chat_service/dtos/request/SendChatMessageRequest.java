package iuh.fit.chat_service.dtos.request;

import iuh.fit.chat_service.enums.MessageType;
import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class SendChatMessageRequest {
    private String content;
    private MessageType type = MessageType.TEXT;
    @Valid
    private List<MessageAttachmentRequest> attachments;
}
