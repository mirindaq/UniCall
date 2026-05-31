package iuh.fit.task_service.services.impl;

import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.common_service.exceptions.UnauthorizedException;
import iuh.fit.task_service.dtos.request.AddTaskGroupMembersRequest;
import iuh.fit.task_service.dtos.request.CreateTaskColumnRequest;
import iuh.fit.task_service.dtos.request.CreateTaskCommentRequest;
import iuh.fit.task_service.dtos.request.CreateTaskGroupRequest;
import iuh.fit.task_service.dtos.request.CreateTaskItemRequest;
import iuh.fit.task_service.dtos.request.ReorderTaskColumnsRequest;
import iuh.fit.task_service.dtos.request.TaskAttachmentRequest;
import iuh.fit.task_service.dtos.request.UpdateTaskItemRequest;
import iuh.fit.task_service.dtos.response.TaskCommentResponse;
import iuh.fit.task_service.dtos.response.TaskDashboardSummaryResponse;
import iuh.fit.task_service.dtos.response.TaskGroupResponse;
import iuh.fit.task_service.dtos.response.TaskItemResponse;
import iuh.fit.task_service.entities.TaskColumn;
import iuh.fit.task_service.entities.TaskAttachment;
import iuh.fit.task_service.entities.TaskComment;
import iuh.fit.task_service.entities.TaskGroup;
import iuh.fit.task_service.entities.TaskItem;
import iuh.fit.task_service.enums.TaskPriority;
import iuh.fit.task_service.events.GroupNotificationEvent;
import iuh.fit.task_service.events.GroupNotificationEventType;
import iuh.fit.task_service.repositories.TaskCommentRepository;
import iuh.fit.task_service.repositories.TaskGroupRepository;
import iuh.fit.task_service.repositories.TaskItemRepository;
import iuh.fit.task_service.services.GroupNotificationEventPublisher;
import iuh.fit.task_service.services.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {
    private final TaskGroupRepository taskGroupRepository;
    private final TaskItemRepository taskItemRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final GroupNotificationEventPublisher groupNotificationEventPublisher;

    @Override
    public TaskGroupResponse createGroup(String currentUserId, CreateTaskGroupRequest request) {
        String actorId = requireUserId(currentUserId);
        Instant now = Instant.now();

        TaskGroup group = TaskGroup.builder()
                .name(request.getName().trim())
                .description(normalizeText(request.getDescription()))
                .ownerId(actorId)
                .memberIds(new LinkedHashSet<>(Set.of(actorId)))
                .columns(defaultColumns())
                .createdAt(now)
                .updatedAt(now)
                .build();

        return TaskGroupResponse.from(taskGroupRepository.save(group));
    }

    @Override
    public List<TaskGroupResponse> listGroups(String currentUserId) {
        String actorId = requireUserId(currentUserId);
        return taskGroupRepository.findByMemberIdsContainingOrderByUpdatedAtDesc(actorId)
                .stream()
                .map(TaskGroupResponse::from)
                .toList();
    }

    @Override
    public TaskGroupResponse getGroup(String currentUserId, String groupId) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertMember(group, actorId);
        return TaskGroupResponse.from(group);
    }

    @Override
    public TaskGroupResponse addMembers(String currentUserId, String groupId, AddTaskGroupMembersRequest request) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertOwner(group, actorId);

        Set<String> addedMemberIds = new LinkedHashSet<>();
        request.getMemberIds().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .filter(id -> !group.getMemberIds().contains(id))
                .forEach(id -> {
                    group.getMemberIds().add(id);
                    addedMemberIds.add(id);
                });

        group.setUpdatedAt(Instant.now());
        TaskGroup saved = taskGroupRepository.save(group);

        if (!addedMemberIds.isEmpty()) {
            publishNotification(
                    GroupNotificationEventType.TASK_GROUP_MEMBER_ADDED,
                    actorId,
                    new ArrayList<>(addedMemberIds),
                    new ArrayList<>(addedMemberIds),
                    saved,
                    "Bạn được thêm vào nhóm công việc " + safeGroupName(saved) + "."
            );
        }

        return TaskGroupResponse.from(saved);
    }

    @Override
    public TaskGroupResponse removeMember(String currentUserId, String groupId, String memberId) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertOwner(group, actorId);

        String normalizedMemberId = normalizeRequired(memberId, "Thiếu mã thành viên");
        if (normalizedMemberId.equals(group.getOwnerId())) {
            throw new InvalidParamException("Không thể xóa chủ nhóm");
        }
        if (!group.getMemberIds().contains(normalizedMemberId)) {
            throw new ResourceNotFoundException("Không tìm thấy thành viên trong nhóm công việc");
        }

        group.getMemberIds().remove(normalizedMemberId);
        List<TaskItem> allItems = taskItemRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
        boolean hasTaskChanged = false;
        for (TaskItem item : allItems) {
            Set<String> assigneeIds = new LinkedHashSet<>(item.getAssigneeIds() == null ? Set.of() : item.getAssigneeIds());
            if (assigneeIds.remove(normalizedMemberId)) {
                item.setAssigneeIds(assigneeIds);
                item.setUpdatedAt(Instant.now());
                hasTaskChanged = true;
            }
        }
        if (hasTaskChanged) {
            taskItemRepository.saveAll(allItems);
        }

        group.setUpdatedAt(Instant.now());
        TaskGroup saved = taskGroupRepository.save(group);

        publishNotification(
                GroupNotificationEventType.TASK_GROUP_MEMBER_KICKED,
                actorId,
                List.of(normalizedMemberId),
                List.of(normalizedMemberId),
                saved,
                "Bạn đã bị kích khỏi nhóm công việc " + safeGroupName(saved) + "."
        );

        return TaskGroupResponse.from(saved);
    }

    @Override
    public TaskGroupResponse addColumn(String currentUserId, String groupId, CreateTaskColumnRequest request) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertMember(group, actorId);

        int nextIndex = group.getColumns().stream()
                .mapToInt(TaskColumn::getOrderIndex)
                .max()
                .orElse(-1) + 1;

        group.getColumns().add(TaskColumn.builder()
                .id(UUID.randomUUID().toString())
                .name(request.getName().trim())
                .orderIndex(nextIndex)
                .build());
        group.setUpdatedAt(Instant.now());

        return TaskGroupResponse.from(taskGroupRepository.save(group));
    }

    @Override
    public TaskGroupResponse reorderColumns(String currentUserId, String groupId, ReorderTaskColumnsRequest request) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertMember(group, actorId);

        List<String> order = request.getColumnIds().stream()
                .map(id -> normalizeRequired(id, "Thiếu mã cột"))
                .toList();

        if (order.size() != group.getColumns().size()) {
            throw new InvalidParamException("Số lượng cột sắp xếp không khớp với cột hiện có");
        }
        if (new HashSet<>(order).size() != order.size()) {
            throw new InvalidParamException("Danh sách cột sắp xếp bị trùng");
        }

        Map<String, TaskColumn> existingColumns = group.getColumns().stream()
                .collect(Collectors.toMap(TaskColumn::getId, Function.identity()));

        for (String columnId : order) {
            if (!existingColumns.containsKey(columnId)) {
                throw new InvalidParamException("Không tìm thấy cột trong nhóm: " + columnId);
            }
        }

        List<TaskColumn> reordered = order.stream()
                .map(existingColumns::get)
                .toList();

        for (int i = 0; i < reordered.size(); i++) {
            reordered.get(i).setOrderIndex(i);
        }

        group.setColumns(new ArrayList<>(reordered));
        group.setUpdatedAt(Instant.now());

        return TaskGroupResponse.from(taskGroupRepository.save(group));
    }

    @Override
    public TaskItemResponse createTask(String currentUserId, String groupId, CreateTaskItemRequest request) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertMember(group, actorId);
        assertColumnExists(group, request.getColumnId());
        Set<String> assigneeIds = normalizeAssigneeIds(request.getAssigneeIds());
        assertAssigneesAreMembers(group, assigneeIds);

        Instant now = Instant.now();
        TaskItem task = TaskItem.builder()
                .groupId(group.getId())
                .columnId(request.getColumnId().trim())
                .title(request.getTitle().trim())
                .description(normalizeText(request.getDescription()))
                .assigneeIds(assigneeIds)
                .reporterId(actorId)
                .startDate(request.getStartDate() == null ? now : request.getStartDate())
                .dueDate(request.getDueDate())
                .priority(request.getPriority() == null ? TaskPriority.MEDIUM : request.getPriority())
                .completed(false)
                .completedAt(null)
                .attachments(new ArrayList<>())
                .createdAt(now)
                .updatedAt(now)
                .build();

        TaskItem saved = taskItemRepository.save(task);
        touchGroup(group);

        List<String> assignedRecipients = (saved.getAssigneeIds() == null ? Set.<String>of() : saved.getAssigneeIds()).stream()
                .filter(assigneeId -> !assigneeId.equals(actorId))
                .toList();
        if (!assignedRecipients.isEmpty()) {
            publishNotification(
                    GroupNotificationEventType.TASK_ITEM_ASSIGNED,
                    actorId,
                    List.of(saved.getId()),
                    assignedRecipients,
                    group,
                    "Bạn được giao công việc: " + saved.getTitle()
            );
        }

        return TaskItemResponse.from(saved);
    }

    @Override
    public List<TaskItemResponse> listTasks(String currentUserId, String groupId, String columnId) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertMember(group, actorId);

        List<TaskItem> items;
        if (columnId == null || columnId.isBlank()) {
            items = taskItemRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
        } else {
            String column = columnId.trim();
            assertColumnExists(group, column);
            items = taskItemRepository.findByGroupIdAndColumnIdOrderByCreatedAtDesc(groupId, column);
        }

        return items.stream().map(TaskItemResponse::from).toList();
    }

    @Override
    public List<TaskItemResponse> listMyTasks(String currentUserId) {
        String actorId = requireUserId(currentUserId);
        List<TaskItem> items = taskItemRepository.findByAssigneeIdsContainingOrderByUpdatedAtDesc(actorId);

        Set<String> memberGroupIds = taskGroupRepository.findByMemberIdsContainingOrderByUpdatedAtDesc(actorId)
                .stream()
                .map(TaskGroup::getId)
                .collect(Collectors.toSet());

        return items.stream()
                .filter(item -> memberGroupIds.contains(item.getGroupId()))
                .map(TaskItemResponse::from)
                .toList();
    }

    @Override
    public TaskItemResponse updateTask(String currentUserId, String taskId, UpdateTaskItemRequest request) {
        String actorId = requireUserId(currentUserId);
        TaskItem task = taskItemRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc"));
        TaskGroup group = findGroup(task.getGroupId());
        assertMember(group, actorId);

        Set<String> oldAssigneeIds = new LinkedHashSet<>(task.getAssigneeIds() == null ? Set.of() : task.getAssigneeIds());

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            task.setDescription(normalizeText(request.getDescription()));
        }
        if (request.getColumnId() != null) {
            String newColumnId = normalizeRequired(request.getColumnId(), "Thiếu mã cột");
            assertColumnExists(group, newColumnId);
            task.setColumnId(newColumnId);
        }
        if (request.getAssigneeIds() != null) {
            Set<String> assigneeIds = normalizeAssigneeIds(request.getAssigneeIds());
            assertAssigneesAreMembers(group, assigneeIds);
            task.setAssigneeIds(assigneeIds);
        }
        if (request.getStartDate() != null) {
            task.setStartDate(request.getStartDate());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getCompleted() != null) {
            task.setCompleted(request.getCompleted());
            task.setCompletedAt(Boolean.TRUE.equals(request.getCompleted()) ? Instant.now() : null);
        }
        if (request.getAttachments() != null) {
            task.setAttachments(normalizeAttachments(request.getAttachments(), actorId));
        }

        task.setUpdatedAt(Instant.now());
        TaskItem saved = taskItemRepository.save(task);
        touchGroup(group);

        Set<String> recipients = new LinkedHashSet<>();
        recipients.addAll(saved.getAssigneeIds() == null ? Set.of() : saved.getAssigneeIds());
        if (saved.getReporterId() != null) {
            recipients.add(saved.getReporterId());
        }
        recipients.remove(actorId);
        if (!recipients.isEmpty()) {
            publishNotification(
                    GroupNotificationEventType.TASK_ITEM_UPDATED,
                    actorId,
                    List.of(saved.getId()),
                    new ArrayList<>(recipients),
                    group,
                    "Công việc được cập nhật: " + saved.getTitle()
            );
        }

        Set<String> newAssigneeIds = new LinkedHashSet<>(saved.getAssigneeIds() == null ? Set.of() : saved.getAssigneeIds());
        Set<String> newlyAssignedIds = new LinkedHashSet<>(newAssigneeIds);
        newlyAssignedIds.removeAll(oldAssigneeIds);
        newlyAssignedIds.remove(actorId);
        if (!newlyAssignedIds.isEmpty()) {
            publishNotification(
                    GroupNotificationEventType.TASK_ITEM_ASSIGNED,
                    actorId,
                    List.of(saved.getId()),
                    new ArrayList<>(newlyAssignedIds),
                    group,
                    "Bạn được giao công việc: " + saved.getTitle()
            );
        }

        return TaskItemResponse.from(saved);
    }

    @Override
    public void deleteTask(String currentUserId, String taskId) {
        String actorId = requireUserId(currentUserId);
        TaskItem task = taskItemRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc"));
        TaskGroup group = findGroup(task.getGroupId());
        assertMember(group, actorId);

        taskCommentRepository.deleteByTaskId(taskId);
        taskItemRepository.deleteById(taskId);
        touchGroup(group);
    }

    @Override
    public void deleteGroup(String currentUserId, String groupId) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertOwner(group, actorId);

        taskCommentRepository.deleteByGroupId(groupId);
        taskItemRepository.deleteByGroupId(groupId);
        taskGroupRepository.deleteById(groupId);
    }

    @Override
    public TaskCommentResponse createComment(String currentUserId, String taskId, CreateTaskCommentRequest request) {
        String actorId = requireUserId(currentUserId);
        TaskItem task = taskItemRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc"));
        TaskGroup group = findGroup(task.getGroupId());
        assertMember(group, actorId);

        String content = normalizeText(request.getContent());
        List<TaskAttachment> attachments = normalizeAttachments(request.getAttachments(), actorId);
        if (content == null && attachments.isEmpty()) {
            throw new InvalidParamException("Bình luận phải có nội dung hoặc tệp đính kèm");
        }

        Instant now = Instant.now();
        TaskComment comment = TaskComment.builder()
                .groupId(group.getId())
                .taskId(taskId)
                .authorId(actorId)
                .content(content)
                .attachments(attachments)
                .createdAt(now)
                .updatedAt(now)
                .build();

        TaskComment saved = taskCommentRepository.save(comment);
        touchGroup(group);

        Set<String> recipients = new LinkedHashSet<>();
        recipients.addAll(task.getAssigneeIds() == null ? Set.of() : task.getAssigneeIds());
        if (task.getReporterId() != null) {
            recipients.add(task.getReporterId());
        }
        recipients.remove(actorId);

        if (!recipients.isEmpty()) {
            publishNotification(
                    GroupNotificationEventType.TASK_ITEM_COMMENTED,
                    actorId,
                    List.of(task.getId()),
                    new ArrayList<>(recipients),
                    group,
                    "Có bình luận mới trong công việc: " + task.getTitle()
            );
        }

        return TaskCommentResponse.from(saved);
    }

    @Override
    public List<TaskCommentResponse> listComments(String currentUserId, String taskId) {
        String actorId = requireUserId(currentUserId);
        TaskItem task = taskItemRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc"));
        TaskGroup group = findGroup(task.getGroupId());
        assertMember(group, actorId);

        return taskCommentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(TaskCommentResponse::from)
                .toList();
    }

    @Override
    public void deleteComment(String currentUserId, String taskId, String commentId) {
        String actorId = requireUserId(currentUserId);
        TaskItem task = taskItemRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc"));
        TaskGroup group = findGroup(task.getGroupId());
        assertMember(group, actorId);

        TaskComment comment = taskCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bình luận"));
        if (!Objects.equals(comment.getTaskId(), taskId)) {
            throw new ResourceNotFoundException("Không tìm thấy bình luận trong công việc");
        }
        if (!Objects.equals(comment.getAuthorId(), actorId)) {
            throw new UnauthorizedException("Chỉ tác giả bình luận mới được xóa");
        }

        taskCommentRepository.deleteById(commentId);
        touchGroup(group);
    }

    @Override
    public TaskDashboardSummaryResponse getDashboardSummary(String currentUserId, String groupId) {
        String actorId = requireUserId(currentUserId);
        TaskGroup group = findGroup(groupId);
        assertMember(group, actorId);

        List<TaskItem> tasks = taskItemRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
        Map<String, String> columnNameById = group.getColumns().stream()
                .collect(Collectors.toMap(TaskColumn::getId, TaskColumn::getName));

        long totalTasks = tasks.size();
        long completedTasks = tasks.stream().filter(this::isCompleted).count();
        long incompleteTasks = totalTasks - completedTasks;
        Instant now = Instant.now();
        long overdueTasks = tasks.stream()
                .filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(now))
                .filter(task -> !isCompleted(task))
                .count();

        Map<String, Long> tasksByAssignee = new LinkedHashMap<>();
        for (TaskItem task : tasks) {
            Set<String> assignees = task.getAssigneeIds() == null ? Set.of() : task.getAssigneeIds();
            if (assignees.isEmpty()) {
                tasksByAssignee.merge("Chưa giao", 1L, Long::sum);
                continue;
            }
            for (String assigneeId : assignees) {
                tasksByAssignee.merge(assigneeId, 1L, Long::sum);
            }
        }

        Map<String, Long> tasksByPriority = tasks.stream()
                .collect(Collectors.groupingBy(
                        task -> task.getPriority() == null ? TaskPriority.MEDIUM.name() : task.getPriority().name(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        Map<String, Long> tasksByColumn = tasks.stream()
                .collect(Collectors.groupingBy(
                        task -> columnNameById.getOrDefault(task.getColumnId(), task.getColumnId()),
                        LinkedHashMap::new,
                        Collectors.counting()));

        return TaskDashboardSummaryResponse.builder()
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .incompleteTasks(incompleteTasks)
                .overdueTasks(overdueTasks)
                .tasksByAssignee(tasksByAssignee)
                .tasksByPriority(tasksByPriority)
                .tasksByColumn(tasksByColumn)
                .build();
    }

    private TaskGroup findGroup(String groupId) {
        return taskGroupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm công việc"));
    }

    private void assertMember(TaskGroup group, String actorId) {
        if (!group.getMemberIds().contains(actorId)) {
            throw new UnauthorizedException("Bạn không phải thành viên của nhóm công việc này");
        }
    }

    private void assertOwner(TaskGroup group, String actorId) {
        if (!Objects.equals(group.getOwnerId(), actorId)) {
            throw new UnauthorizedException("Chỉ chủ nhóm mới được thực hiện thao tác này");
        }
    }

    private void assertColumnExists(TaskGroup group, String columnId) {
        boolean exists = group.getColumns().stream().anyMatch(column -> column.getId().equals(columnId));
        if (!exists) {
            throw new InvalidParamException("Không tìm thấy cột trong nhóm công việc");
        }
    }

    private void assertAssigneesAreMembers(TaskGroup group, Set<String> assigneeIds) {
        if (assigneeIds == null || assigneeIds.isEmpty()) {
            return;
        }
        for (String assigneeId : assigneeIds) {
            if (!group.getMemberIds().contains(assigneeId)) {
                throw new InvalidParamException("Người được giao phải là thành viên của nhóm công việc");
            }
        }
    }

    private Set<String> normalizeAssigneeIds(List<String> assigneeIds) {
        if (assigneeIds == null || assigneeIds.isEmpty()) {
            return new LinkedHashSet<>();
        }
        return assigneeIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<TaskAttachment> normalizeAttachments(List<TaskAttachmentRequest> attachments, String actorId) {
        if (attachments == null || attachments.isEmpty()) {
            return new ArrayList<>();
        }
        List<TaskAttachment> normalized = new ArrayList<>();
        for (TaskAttachmentRequest attachment : attachments) {
            if (attachment == null) {
                continue;
            }
            String url = normalizeText(attachment.getUrl());
            if (url == null) {
                continue;
            }
            String uploadedBy = normalizeText(attachment.getUploadedBy());
            TaskAttachment item = TaskAttachment.builder()
                    .id(normalizeText(attachment.getId()) == null ? UUID.randomUUID().toString() : attachment.getId().trim())
                    .name(normalizeText(attachment.getName()) == null ? "Attachment" : attachment.getName().trim())
                    .url(url)
                    .type(normalizeText(attachment.getType()) == null ? "FILE" : attachment.getType().trim())
                    .size(attachment.getSize())
                    .uploadedAt(attachment.getUploadedAt() == null ? Instant.now() : attachment.getUploadedAt())
                    .uploadedBy(uploadedBy == null ? actorId : uploadedBy)
                    .build();
            normalized.add(item);
        }
        return normalized;
    }

    private String requireUserId(String currentUserId) {
        return normalizeRequired(currentUserId, "Thiếu header X-User-Id");
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new InvalidParamException(message);
        }
        return value.trim();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<TaskColumn> defaultColumns() {
        List<TaskColumn> columns = List.of(
                TaskColumn.builder().id(UUID.randomUUID().toString()).name("To Do").orderIndex(0).build(),
                TaskColumn.builder().id(UUID.randomUUID().toString()).name("Doing").orderIndex(1).build(),
                TaskColumn.builder().id(UUID.randomUUID().toString()).name("Done").orderIndex(2).build()
        );
        return columns.stream()
                .sorted(Comparator.comparingInt(TaskColumn::getOrderIndex))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private void touchGroup(TaskGroup group) {
        group.setUpdatedAt(Instant.now());
        taskGroupRepository.save(group);
    }

    private boolean isCompleted(TaskItem task) {
        return task != null && task.isCompleted();
    }

    private String safeGroupName(TaskGroup group) {
        if (group.getName() == null || group.getName().isBlank()) {
            return "Nhóm công việc";
        }
        return group.getName().trim();
    }

    private void publishNotification(
            GroupNotificationEventType type,
            String actorId,
            List<String> targetUserIds,
            List<String> recipientUserIds,
            TaskGroup group,
            String content
    ) {
        List<String> recipients = recipientUserIds == null ? List.of() : recipientUserIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();
        if (recipients.isEmpty()) {
            return;
        }

        GroupNotificationEvent event = GroupNotificationEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .type(type)
                .occurredAt(LocalDateTime.ofInstant(Instant.now(), ZoneId.systemDefault()))
                .actorId(actorId)
                .targetUserIds(targetUserIds == null ? List.of() : targetUserIds)
                .recipientUserIds(recipients)
                .conversationId(group.getId())
                .conversationName(safeGroupName(group))
                .content(content)
                .build();
        groupNotificationEventPublisher.publish(event);
    }
}
