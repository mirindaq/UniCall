package iuh.fit.task_service.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "task_comments")
public class TaskComment {
    @Id
    private String id;

    @Indexed
    private String groupId;

    @Indexed
    private String taskId;

    private String authorId;
    private String content;
    @Builder.Default
    private List<TaskAttachment> attachments = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;
}
