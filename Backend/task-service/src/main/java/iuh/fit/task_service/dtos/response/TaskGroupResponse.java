package iuh.fit.task_service.dtos.response;

import iuh.fit.task_service.entities.TaskGroup;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Value
@Builder
public class TaskGroupResponse {
    String id;
    String name;
    String description;
    String ownerId;
    Set<String> memberIds;
    List<TaskColumnResponse> columns;
    Instant createdAt;
    Instant updatedAt;

    public static TaskGroupResponse from(TaskGroup group) {
        return TaskGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .ownerId(group.getOwnerId())
                .memberIds(group.getMemberIds())
                .columns(group.getColumns().stream().map(TaskColumnResponse::from).toList())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }
}
