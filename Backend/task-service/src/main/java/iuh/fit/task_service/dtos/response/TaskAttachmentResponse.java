package iuh.fit.task_service.dtos.response;

import iuh.fit.task_service.entities.TaskAttachment;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class TaskAttachmentResponse {
    String id;
    String name;
    String url;
    String type;
    Long size;
    Instant uploadedAt;
    String uploadedBy;

    public static TaskAttachmentResponse from(TaskAttachment attachment) {
        return TaskAttachmentResponse.builder()
                .id(attachment.getId())
                .name(attachment.getName())
                .url(attachment.getUrl())
                .type(attachment.getType())
                .size(attachment.getSize())
                .uploadedAt(attachment.getUploadedAt())
                .uploadedBy(attachment.getUploadedBy())
                .build();
    }
}
