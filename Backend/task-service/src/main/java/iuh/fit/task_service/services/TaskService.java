package iuh.fit.task_service.services;

import iuh.fit.task_service.dtos.request.AddTaskGroupMembersRequest;
import iuh.fit.task_service.dtos.request.CreateTaskColumnRequest;
import iuh.fit.task_service.dtos.request.CreateTaskCommentRequest;
import iuh.fit.task_service.dtos.request.CreateTaskGroupRequest;
import iuh.fit.task_service.dtos.request.CreateTaskItemRequest;
import iuh.fit.task_service.dtos.request.ReorderTaskColumnsRequest;
import iuh.fit.task_service.dtos.request.UpdateTaskItemRequest;
import iuh.fit.task_service.dtos.response.TaskCommentResponse;
import iuh.fit.task_service.dtos.response.TaskDashboardSummaryResponse;
import iuh.fit.task_service.dtos.response.TaskGroupResponse;
import iuh.fit.task_service.dtos.response.TaskItemResponse;

import java.util.List;

public interface TaskService {
    TaskGroupResponse createGroup(String currentUserId, CreateTaskGroupRequest request);

    List<TaskGroupResponse> listGroups(String currentUserId);

    TaskGroupResponse getGroup(String currentUserId, String groupId);

    TaskGroupResponse addMembers(String currentUserId, String groupId, AddTaskGroupMembersRequest request);

    TaskGroupResponse removeMember(String currentUserId, String groupId, String memberId);

    TaskGroupResponse addColumn(String currentUserId, String groupId, CreateTaskColumnRequest request);

    TaskGroupResponse reorderColumns(String currentUserId, String groupId, ReorderTaskColumnsRequest request);

    TaskItemResponse createTask(String currentUserId, String groupId, CreateTaskItemRequest request);

    List<TaskItemResponse> listTasks(String currentUserId, String groupId, String columnId);

    List<TaskItemResponse> listMyTasks(String currentUserId);

    TaskItemResponse updateTask(String currentUserId, String taskId, UpdateTaskItemRequest request);

    void deleteTask(String currentUserId, String taskId);

    void deleteGroup(String currentUserId, String groupId);

    TaskCommentResponse createComment(String currentUserId, String taskId, CreateTaskCommentRequest request);

    List<TaskCommentResponse> listComments(String currentUserId, String taskId);

    void deleteComment(String currentUserId, String taskId, String commentId);

    TaskDashboardSummaryResponse getDashboardSummary(String currentUserId, String groupId);
}
