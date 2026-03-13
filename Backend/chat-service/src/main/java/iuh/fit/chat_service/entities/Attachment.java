package iuh.fit.chat_service.entities;

import iuh.fit.chat_service.enums.AttachmentType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Attachment {
    @Id
    private String idAttachment;
    private AttachmentType type;
    private String url;
    private String size;
    private LocalDateTime timeUpload;
    private MetaData metaData;
    private int order; // thu tu khi gui tin nhan
}
