package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.enums.AttachmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentResponse {
    private String idAttachment;
    private AttachmentType type;
    private String url;
    private String fileName;
    private String size;
    private LocalDateTime timeUpload;
    private LocalDateTime timeSent;
    private String messageId; // ID of the message containing this attachment
    private String senderId;
    private String senderName; // Name of sender
}
