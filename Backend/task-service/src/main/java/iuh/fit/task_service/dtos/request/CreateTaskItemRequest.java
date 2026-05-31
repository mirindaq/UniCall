package iuh.fit.task_service.dtos.request;

import iuh.fit.task_service.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class CreateTaskItemRequest {
    @NotBlank(message = "Task title is required")
    private String title;

    private String description;

    @NotBlank(message = "Column ID is required")
    private String columnId;

    private List<String> assigneeIds;
    private Instant startDate;
    private Instant dueDate;
    private TaskPriority priority;
}
