package iuh.fit.task_service.dtos.response;

import iuh.fit.task_service.entities.TaskItem;
import iuh.fit.task_service.enums.TaskPriority;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Value
@Builder
public class TaskItemResponse {
    String id;
    String groupId;
    String columnId;
    String title;
    String description;
    Set<String> assigneeIds;
    String reporterId;
    Instant startDate;
    Instant dueDate;
    TaskPriority priority;
    boolean completed;
    Instant completedAt;
    List<TaskAttachmentResponse> attachments;
    Instant createdAt;
    Instant updatedAt;

    public static TaskItemResponse from(TaskItem item) {
        return TaskItemResponse.builder()
                .id(item.getId())
                .groupId(item.getGroupId())
                .columnId(item.getColumnId())
                .title(item.getTitle())
                .description(item.getDescription())
                .assigneeIds(item.getAssigneeIds() == null ? Set.of() : item.getAssigneeIds())
                .reporterId(item.getReporterId())
                .startDate(item.getStartDate())
                .dueDate(item.getDueDate())
                .priority(item.getPriority())
                .completed(item.isCompleted())
                .completedAt(item.getCompletedAt())
                .attachments(item.getAttachments() == null
                        ? List.of()
                        : item.getAttachments().stream().map(TaskAttachmentResponse::from).toList())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
