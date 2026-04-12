package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.enums.AttachmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    private String url;
    private Long fileSize;
    private AttachmentType type; // IMAGE, VIDEO, AUDIO, FILE, etc.
    private String contentType;
}
