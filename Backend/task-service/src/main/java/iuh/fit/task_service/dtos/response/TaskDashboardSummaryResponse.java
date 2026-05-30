package iuh.fit.task_service.dtos.response;

import lombok.Builder;
import lombok.Value;

import java.util.Map;

@Value
@Builder
public class TaskDashboardSummaryResponse {
    long totalTasks;
    long completedTasks;
    long incompleteTasks;
    long overdueTasks;
    Map<String, Long> tasksByAssignee;
    Map<String, Long> tasksByPriority;
    Map<String, Long> tasksByColumn;
}
