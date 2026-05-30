package iuh.fit.task_service.dtos.request;

import iuh.fit.task_service.enums.TaskPriority;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class UpdateTaskItemRequest {
    private String title;
    private String description;
    private String columnId;
    private List<String> assigneeIds;
    private Instant startDate;
    private Instant dueDate;
    private TaskPriority priority;
    private Boolean completed;
    private List<TaskAttachmentRequest> attachments;
}
