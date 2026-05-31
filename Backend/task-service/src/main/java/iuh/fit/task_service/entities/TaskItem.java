package iuh.fit.task_service.entities;

import iuh.fit.task_service.enums.TaskPriority;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "task_items")
public class TaskItem {
    @Id
    private String id;

    @Indexed
    private String groupId;

    @Indexed
    private String columnId;

    private String title;
    private String description;
    @Builder.Default
    private Set<String> assigneeIds = new LinkedHashSet<>();
    private String reporterId;
    private Instant startDate;
    private Instant dueDate;
    private TaskPriority priority;
    @Builder.Default
    private boolean completed = false;
    private Instant completedAt;
    @Builder.Default
    private List<TaskAttachment> attachments = new ArrayList<>();
    private Instant createdAt;
    private Instant updatedAt;
}
