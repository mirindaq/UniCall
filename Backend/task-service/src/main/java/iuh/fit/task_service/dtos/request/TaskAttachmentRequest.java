package iuh.fit.task_service.dtos.request;

import lombok.Data;

import java.time.Instant;

@Data
public class TaskAttachmentRequest {
    private String id;
    private String name;
    private String url;
    private String type;
    private Long size;
    private Instant uploadedAt;
    private String uploadedBy;
}
