package iuh.fit.task_service.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskAttachment {
    private String id;
    private String name;
    private String url;
    private String type;
    private Long size;
    private Instant uploadedAt;
    private String uploadedBy;
}
