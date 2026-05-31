package iuh.fit.chat_service.services;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public interface TaskAssistantToolService {

    List<TaskGroupToolItem> listMyTaskGroups(String requesterId, Integer limit);

    List<TaskItemToolItem> listTasksInGroup(String requesterId, String groupId, String groupNameHint, String columnId);

    TaskItemToolItem createTaskInGroup(
            String requesterId,
            String groupId,
            String groupNameHint,
            String columnId,
            String columnNameHint,
            String title,
            String description,
            List<String> assigneeIds,
            List<String> assigneeNameHints,
            String startDate,
            String dueDate,
            String priority
    );

    TaskItemToolItem updateTask(
            String requesterId,
            String taskId,
            String taskNameHint,
            String title,
            String description,
            String columnId,
            String groupId,
            String groupNameHint,
            String columnNameHint,
            List<String> assigneeIds,
            List<String> assigneeNameHints,
            String startDate,
            String dueDate,
            String priority,
            Boolean completed
    );

    List<TaskItemToolItem> findTasksByName(
            String requesterId,
            String taskNameHint,
            String groupId,
            String groupNameHint,
            Integer limit
    );

    Map<String, Object> deleteTask(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint
    );

    TaskItemToolItem getTaskDetail(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint
    );

    TaskCommentToolItem addTaskComment(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint,
            String content
    );

    List<TaskCommentToolItem> listTaskComments(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint,
            Integer limit
    );

    List<TaskItemToolItem> listMyTasks(String requesterId, Boolean includeCompleted, Integer limit);

    List<TaskItemToolItem> listMyOverdueTasks(String requesterId, Boolean includeCompleted, Integer limit);

    List<TaskItemToolItem> listMyDueSoonTasks(String requesterId, Integer days, Boolean includeCompleted, Integer limit);

    record TaskGroupToolItem(
            String groupId,
            String name,
            String description,
            String ownerId,
            int memberCount,
            List<String> memberIds,
            List<TaskColumnToolItem> columns
    ) {
    }

    record TaskColumnToolItem(
            String columnId,
            String name,
            int orderIndex
    ) {
    }

    record TaskItemToolItem(
            String taskId,
            String groupId,
            String groupName,
            String columnId,
            String columnName,
            String title,
            String description,
            List<String> assigneeIds,
            String reporterId,
            Instant startDate,
            Instant dueDate,
            String priority,
            boolean completed,
            Instant completedAt,
            Instant createdAt,
            Instant updatedAt,
            boolean overdue,
            Long dueInDays
    ) {
    }

    record TaskCommentToolItem(
            String commentId,
            String groupId,
            String taskId,
            String authorId,
            String content,
            List<Map<String, Object>> attachments,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}
