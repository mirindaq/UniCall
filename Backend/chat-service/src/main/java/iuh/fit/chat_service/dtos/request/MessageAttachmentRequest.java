package iuh.fit.chat_service.dtos.request;

import iuh.fit.chat_service.entities.MetaData;
import iuh.fit.chat_service.enums.AttachmentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MessageAttachmentRequest {
    @NotNull(message = "attachment type không được để trống")
    private AttachmentType type;
    @NotBlank(message = "attachment url không được để trống")
    private String url;
    private String size;
    private Integer order = 0;
    private MetaData metaData;
}
