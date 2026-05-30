package iuh.fit.task_service.dtos.response;

import iuh.fit.task_service.entities.TaskColumn;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TaskColumnResponse {
    String id;
    String name;
    int orderIndex;

    public static TaskColumnResponse from(TaskColumn column) {
        return TaskColumnResponse.builder()
                .id(column.getId())
                .name(column.getName())
                .orderIndex(column.getOrderIndex())
                .build();
    }
}
