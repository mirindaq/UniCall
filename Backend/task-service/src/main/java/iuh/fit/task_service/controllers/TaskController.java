package iuh.fit.task_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
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
import iuh.fit.task_service.services.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("${api.prefix:/api/v1}/tasks")
@RequiredArgsConstructor
public class TaskController {
    private static final String USER_ID_HEADER = "X-User-Id";

    private final TaskService taskService;

    @PostMapping("/groups")
    public ResponseEntity<ResponseSuccess<TaskGroupResponse>> createGroup(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @Valid @RequestBody CreateTaskGroupRequest request
    ) {
        TaskGroupResponse response = taskService.createGroup(currentUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ResponseSuccess<>(HttpStatus.CREATED, "Tạo nhóm công việc thành công", response));
    }

    @GetMapping("/groups")
    public ResponseEntity<ResponseSuccess<List<TaskGroupResponse>>> listGroups(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId
    ) {
        List<TaskGroupResponse> response = taskService.listGroups(currentUserId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lấy danh sách nhóm công việc thành công", response));
    }

    @GetMapping("/groups/{groupId}")
    public ResponseEntity<ResponseSuccess<TaskGroupResponse>> getGroup(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId
    ) {
        TaskGroupResponse response = taskService.getGroup(currentUserId, groupId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lấy chi tiết nhóm công việc thành công", response));
    }

    @PostMapping("/groups/{groupId}/members")
    public ResponseEntity<ResponseSuccess<TaskGroupResponse>> addMembers(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId,
            @Valid @RequestBody AddTaskGroupMembersRequest request
    ) {
        TaskGroupResponse response = taskService.addMembers(currentUserId, groupId, request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Thêm thành viên vào nhóm công việc thành công", response));
    }

    @DeleteMapping("/groups/{groupId}/members/{memberId}")
    public ResponseEntity<ResponseSuccess<TaskGroupResponse>> removeMember(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId,
            @PathVariable String memberId
    ) {
        TaskGroupResponse response = taskService.removeMember(currentUserId, groupId, memberId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Xóa thành viên khỏi nhóm công việc thành công", response));
    }

    @DeleteMapping("/groups/{groupId}/members/{memberId}/kick")
    public ResponseEntity<ResponseSuccess<TaskGroupResponse>> kickMember(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId,
            @PathVariable String memberId
    ) {
        TaskGroupResponse response = taskService.removeMember(currentUserId, groupId, memberId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Kích thành viên khỏi nhóm công việc thành công", response));
    }

    @PostMapping("/groups/{groupId}/columns")
    public ResponseEntity<ResponseSuccess<TaskGroupResponse>> addColumn(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId,
            @Valid @RequestBody CreateTaskColumnRequest request
    ) {
        TaskGroupResponse response = taskService.addColumn(currentUserId, groupId, request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Thêm cột công việc thành công", response));
    }

    @PatchMapping("/groups/{groupId}/columns/order")
    public ResponseEntity<ResponseSuccess<TaskGroupResponse>> reorderColumns(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId,
            @Valid @RequestBody ReorderTaskColumnsRequest request
    ) {
        TaskGroupResponse response = taskService.reorderColumns(currentUserId, groupId, request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Sắp xếp lại cột công việc thành công", response));
    }

    @PostMapping("/groups/{groupId}/items")
    public ResponseEntity<ResponseSuccess<TaskItemResponse>> createTask(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId,
            @Valid @RequestBody CreateTaskItemRequest request
    ) {
        TaskItemResponse response = taskService.createTask(currentUserId, groupId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ResponseSuccess<>(HttpStatus.CREATED, "Tạo công việc thành công", response));
    }

    @GetMapping("/groups/{groupId}/items")
    public ResponseEntity<ResponseSuccess<List<TaskItemResponse>>> listTasks(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId,
            @RequestParam(required = false) String columnId
    ) {
        List<TaskItemResponse> response = taskService.listTasks(currentUserId, groupId, columnId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lấy danh sách công việc thành công", response));
    }

    @GetMapping("/my-items")
    public ResponseEntity<ResponseSuccess<List<TaskItemResponse>>> listMyTasks(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId
    ) {
        List<TaskItemResponse> response = taskService.listMyTasks(currentUserId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lấy danh sách công việc của tôi thành công", response));
    }

    @PatchMapping("/items/{taskId}")
    public ResponseEntity<ResponseSuccess<TaskItemResponse>> updateTask(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String taskId,
            @RequestBody UpdateTaskItemRequest request
    ) {
        TaskItemResponse response = taskService.updateTask(currentUserId, taskId, request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Cập nhật công việc thành công", response));
    }

    @DeleteMapping("/items/{taskId}")
    public ResponseEntity<ResponseSuccess<Void>> deleteTask(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String taskId
    ) {
        taskService.deleteTask(currentUserId, taskId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Xóa công việc thành công"));
    }

    @DeleteMapping("/groups/{groupId}")
    public ResponseEntity<ResponseSuccess<Void>> deleteGroup(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId
    ) {
        taskService.deleteGroup(currentUserId, groupId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Xóa nhóm công việc thành công"));
    }

    @PostMapping("/items/{taskId}/comments")
    public ResponseEntity<ResponseSuccess<TaskCommentResponse>> createComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String taskId,
            @Valid @RequestBody CreateTaskCommentRequest request
    ) {
        TaskCommentResponse response = taskService.createComment(currentUserId, taskId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ResponseSuccess<>(HttpStatus.CREATED, "Tạo bình luận công việc thành công", response));
    }

    @GetMapping("/items/{taskId}/comments")
    public ResponseEntity<ResponseSuccess<List<TaskCommentResponse>>> listComments(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String taskId
    ) {
        List<TaskCommentResponse> response = taskService.listComments(currentUserId, taskId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lấy bình luận công việc thành công", response));
    }

    @DeleteMapping("/items/{taskId}/comments/{commentId}")
    public ResponseEntity<ResponseSuccess<Void>> deleteComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String taskId,
            @PathVariable String commentId
    ) {
        taskService.deleteComment(currentUserId, taskId, commentId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Xóa bình luận công việc thành công"));
    }

    @GetMapping("/groups/{groupId}/dashboard")
    public ResponseEntity<ResponseSuccess<TaskDashboardSummaryResponse>> getDashboard(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentUserId,
            @PathVariable String groupId
    ) {
        TaskDashboardSummaryResponse response = taskService.getDashboardSummary(currentUserId, groupId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lấy thống kê nhóm công việc thành công", response));
    }
}
