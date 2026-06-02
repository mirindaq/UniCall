package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.clients.GrpcUserServiceClient;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.services.TaskAssistantToolService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.observability.TraceRestTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.util.UriComponentsBuilder;

import java.text.Normalizer;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Instant;
import java.time.Duration;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskAssistantToolServiceImpl implements TaskAssistantToolService {

    private static final String USER_ID_HEADER = "X-User-Id";

    private final AiAssistantProperties aiAssistantProperties;
    private final ObjectMapper objectMapper;
    private final GrpcUserServiceClient grpcUserServiceClient;

    @Override
    public List<TaskGroupToolItem> listMyTaskGroups(String requesterId, Integer limit) {
        String userId = requireRequester(requesterId);
        JsonNode data = callTaskService(userId, HttpMethod.GET, "/groups", null, null);
        if (data == null || !data.isArray()) {
            return List.of();
        }
        int resolvedLimit = resolveLimit(limit);
        List<TaskGroupToolItem> groups = new ArrayList<>();
        for (JsonNode node : data) {
            TaskGroupToolItem item = toGroupItem(node);
            if (item != null) {
                groups.add(item);
            }
        }
        return groups.stream().limit(resolvedLimit).toList();
    }

    @Override
    public List<TaskItemToolItem> listTasksInGroup(String requesterId, String groupId, String groupNameHint, String columnId) {
        String userId = requireRequester(requesterId);
        TaskGroupToolItem group = resolveGroup(userId, groupId, groupNameHint);
        if (group == null || !StringUtils.hasText(group.groupId())) {
            throw new InvalidParamException("Không xác định được nhóm công việc");
        }
        return listTasksInGroupInternal(userId, group, columnId);
    }

    @Override
    public TaskItemToolItem createTaskInGroup(
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
    ) {
        String userId = requireRequester(requesterId);
        if (!StringUtils.hasText(title)) {
            throw new InvalidParamException("Thiếu tiêu đề task");
        }

        TaskGroupToolItem group = resolveGroup(userId, groupId, groupNameHint);
        if (group == null || !StringUtils.hasText(group.groupId())) {
            throw new InvalidParamException("Không xác định được nhóm công việc để tạo task");
        }

        String resolvedColumnId = resolveColumnId(group.columns(), columnId, columnNameHint);
        if (!StringUtils.hasText(resolvedColumnId)) {
            throw new InvalidParamException("Không xác định được cột task để tạo");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", title.trim());
        body.put("columnId", resolvedColumnId);
        putIfPresent(body, "description", description);
        putIfPresent(body, "assigneeIds", resolveAssigneeIdsForGroup(userId, group, assigneeIds, assigneeNameHints));
        putIfPresent(body, "startDate", parseInstantInput(startDate));
        putIfPresent(body, "dueDate", parseInstantInput(dueDate));
        putIfPresent(body, "priority", normalizePriority(priority));

        JsonNode data = callTaskService(userId, HttpMethod.POST, "/groups/" + group.groupId() + "/items", body, null);
        return toTaskItem(data, group.groupId(), group.name(), toColumnNameMap(group.columns()));
    }

    @Override
    public TaskItemToolItem updateTask(
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
    ) {
        String userId = requireRequester(requesterId);
        String resolvedTaskId = StringUtils.hasText(taskId) ? taskId.trim() : null;
        if (!StringUtils.hasText(resolvedTaskId)) {
            resolvedTaskId = resolveTaskIdByName(userId, taskNameHint, groupId, groupNameHint);
        }
        if (!StringUtils.hasText(resolvedTaskId)) {
            throw new InvalidParamException("Không xác định được task để cập nhật. Hãy cung cấp tên task rõ hơn.");
        }

        TaskGroupToolItem group = resolveGroup(userId, groupId, groupNameHint);
        String resolvedColumnId = columnId;
        if (!StringUtils.hasText(resolvedColumnId) && StringUtils.hasText(columnNameHint)) {
            if (group == null) {
                group = resolveGroupFromTask(userId, resolvedTaskId);
            }
            resolvedColumnId = resolveColumnId(group == null ? List.of() : group.columns(), null, columnNameHint);
        }
        if (group == null && hasAnyAssigneeName(assigneeIds, assigneeNameHints)) {
            group = resolveGroupFromTask(userId, resolvedTaskId);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        putIfPresent(body, "title", title);
        putIfPresent(body, "description", description);
        putIfPresent(body, "columnId", resolvedColumnId);
        putIfPresent(body, "assigneeIds", resolveAssigneeIdsForGroup(userId, group, assigneeIds, assigneeNameHints));
        putIfPresent(body, "startDate", parseInstantInput(startDate));
        putIfPresent(body, "dueDate", parseInstantInput(dueDate));
        putIfPresent(body, "priority", normalizePriority(priority));
        if (completed != null) {
            body.put("completed", completed);
        }
        if (body.isEmpty()) {
            throw new InvalidParamException("Không có dữ liệu cập nhật");
        }

        JsonNode data = callTaskService(userId, HttpMethod.PATCH, "/items/" + resolvedTaskId, body, null);
        String mappedGroupId = textValue(data, "groupId");
        TaskGroupToolItem mappedGroup = group;
        if (mappedGroup == null && StringUtils.hasText(mappedGroupId)) {
            mappedGroup = resolveGroup(userId, mappedGroupId, null);
        }
        return toTaskItem(
                data,
                mappedGroupId,
                mappedGroup == null ? null : mappedGroup.name(),
                toColumnNameMap(mappedGroup == null ? List.of() : mappedGroup.columns())
        );
    }

    @Override
    public List<TaskItemToolItem> findTasksByName(
            String requesterId,
            String taskNameHint,
            String groupId,
            String groupNameHint,
            Integer limit
    ) {
        String userId = requireRequester(requesterId);
        if (!StringUtils.hasText(taskNameHint)) {
            throw new InvalidParamException("Thiếu tên task để tìm");
        }
        String normalized = taskNameHint.trim().toLowerCase(Locale.ROOT);
        int resolvedLimit = resolveLimit(limit);

        List<TaskItemToolItem> source;
        if (StringUtils.hasText(groupId) || StringUtils.hasText(groupNameHint)) {
            source = listTasksInGroup(userId, groupId, groupNameHint, null);
        } else {
            source = listAllGroupTasksRaw(userId);
        }

        List<TaskItemToolItem> exact = source.stream()
                .filter(item -> StringUtils.hasText(item.title()))
                .filter(item -> item.title().trim().equalsIgnoreCase(taskNameHint.trim()))
                .limit(resolvedLimit)
                .toList();
        if (!exact.isEmpty()) {
            return exact;
        }

        return source.stream()
                .filter(item -> StringUtils.hasText(item.title()))
                .filter(item -> item.title().toLowerCase(Locale.ROOT).contains(normalized))
                .limit(resolvedLimit)
                .toList();
    }

    @Override
    public Map<String, Object> deleteTask(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint
    ) {
        String userId = requireRequester(requesterId);
        String resolvedTaskId = StringUtils.hasText(taskId) ? taskId.trim() : null;
        if (!StringUtils.hasText(resolvedTaskId)) {
            resolvedTaskId = resolveTaskIdByName(userId, taskNameHint, groupId, groupNameHint);
        }
        if (!StringUtils.hasText(resolvedTaskId)) {
            throw new InvalidParamException("Không xác định được task để xóa. Hãy cung cấp tên task rõ hơn.");
        }
        callTaskService(userId, HttpMethod.DELETE, "/items/" + resolvedTaskId, null, null);
        return Map.of("deleted", true, "taskId", resolvedTaskId);
    }

    @Override
    public TaskItemToolItem getTaskDetail(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint
    ) {
        String userId = requireRequester(requesterId);
        TaskItemToolItem task = resolveTaskForRead(userId, taskId, taskNameHint, groupId, groupNameHint);
        if (task == null) {
            throw new InvalidParamException("Không tìm thấy task theo thông tin bạn cung cấp.");
        }
        return task;
    }

    @Override
    public TaskCommentToolItem addTaskComment(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint,
            String content
    ) {
        String userId = requireRequester(requesterId);
        if (!StringUtils.hasText(content)) {
            throw new InvalidParamException("Thiếu nội dung comment để thêm vào task.");
        }

        TaskItemToolItem task = resolveTaskForRead(userId, taskId, taskNameHint, groupId, groupNameHint);
        if (task == null || !StringUtils.hasText(task.taskId())) {
            throw new InvalidParamException("Không tìm thấy task để thêm comment.");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("content", content.trim());
        JsonNode data = callTaskService(userId, HttpMethod.POST, "/items/" + task.taskId() + "/comments", body, null);
        TaskCommentToolItem item = toTaskCommentItem(data);
        if (item == null) {
            throw new InvalidParamException("Không nhận được dữ liệu comment từ task-service.");
        }
        return item;
    }

    @Override
    public List<TaskCommentToolItem> listTaskComments(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint,
            Integer limit
    ) {
        String userId = requireRequester(requesterId);
        TaskItemToolItem task = resolveTaskForRead(userId, taskId, taskNameHint, groupId, groupNameHint);
        if (task == null || !StringUtils.hasText(task.taskId())) {
            throw new InvalidParamException("Không tìm thấy task để lấy comment.");
        }

        JsonNode data = callTaskService(userId, HttpMethod.GET, "/items/" + task.taskId() + "/comments", null, null);
        if (data == null || !data.isArray()) {
            return List.of();
        }

        int resolvedLimit = resolveLimit(limit);
        List<TaskCommentToolItem> items = new ArrayList<>();
        for (JsonNode node : data) {
            TaskCommentToolItem item = toTaskCommentItem(node);
            if (item != null) {
                items.add(item);
            }
        }
        return items.stream().limit(resolvedLimit).toList();
    }

    @Override
    public List<TaskItemToolItem> listMyTasks(String requesterId, Boolean includeCompleted, Integer limit) {
        String userId = requireRequester(requesterId);
        List<TaskItemToolItem> items = listMyTasksRaw(userId);
        boolean includeDone = includeCompleted != null && includeCompleted;
        List<TaskItemToolItem> filtered = includeDone
                ? items
                : items.stream().filter(item -> !item.completed()).toList();
        return filtered.stream().limit(resolveLimit(limit)).toList();
    }

    @Override
    public List<TaskItemToolItem> listMyOverdueTasks(String requesterId, Boolean includeCompleted, Integer limit) {
        String userId = requireRequester(requesterId);
        boolean includeDone = includeCompleted != null && includeCompleted;
        return listMyTasksRaw(userId).stream()
                .filter(item -> item.dueDate() != null)
                .filter(item -> includeDone || !item.completed())
                .filter(TaskItemToolItem::overdue)
                .sorted(Comparator.comparing(TaskItemToolItem::dueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(resolveLimit(limit))
                .toList();
    }

    @Override
    public List<TaskItemToolItem> listMyDueSoonTasks(String requesterId, Integer days, Boolean includeCompleted, Integer limit) {
        String userId = requireRequester(requesterId);
        long thresholdDays = days == null || days <= 0
                ? aiAssistantProperties.getTaskTools().getDefaultDueSoonDays()
                : days;
        Instant now = Instant.now();
        Instant threshold = now.plus(thresholdDays, ChronoUnit.DAYS);
        boolean includeDone = includeCompleted != null && includeCompleted;

        return listMyTasksRaw(userId).stream()
                .filter(item -> item.dueDate() != null)
                .filter(item -> includeDone || !item.completed())
                .filter(item -> !item.dueDate().isBefore(now))
                .filter(item -> !item.dueDate().isAfter(threshold))
                .sorted(Comparator.comparing(TaskItemToolItem::dueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(resolveLimit(limit))
                .toList();
    }

    private List<TaskItemToolItem> listMyTasksRaw(String requesterId) {
        JsonNode data = callTaskService(requesterId, HttpMethod.GET, "/my-items", null, null);
        if (data == null || !data.isArray()) {
            return List.of();
        }
        Map<String, TaskGroupToolItem> groupsById = listMyTaskGroups(requesterId, resolveMaxLimit()).stream()
                .collect(LinkedHashMap::new, (map, group) -> map.put(group.groupId(), group), LinkedHashMap::putAll);

        List<TaskItemToolItem> items = new ArrayList<>();
        for (JsonNode node : data) {
            String groupId = textValue(node, "groupId");
            TaskGroupToolItem group = StringUtils.hasText(groupId) ? groupsById.get(groupId) : null;
            TaskItemToolItem item = toTaskItem(
                    node,
                    groupId,
                    group == null ? null : group.name(),
                    toColumnNameMap(group == null ? List.of() : group.columns())
            );
            if (item != null) {
                items.add(item);
            }
        }
        return items;
    }

    private TaskGroupToolItem resolveGroup(String requesterId, String groupId, String groupNameHint) {
        List<TaskGroupToolItem> groups = listMyTaskGroups(requesterId, resolveMaxLimit());
        if (groups.isEmpty()) {
            return null;
        }
        if (StringUtils.hasText(groupId)) {
            String normalized = groupId.trim();
            return groups.stream()
                    .filter(group -> normalized.equals(group.groupId()))
                    .findFirst()
                    .orElse(null);
        }
        if (StringUtils.hasText(groupNameHint)) {
            String normalized = groupNameHint.trim().toLowerCase(Locale.ROOT);
            TaskGroupToolItem exact = groups.stream()
                    .filter(group -> StringUtils.hasText(group.name()))
                    .filter(group -> group.name().trim().equalsIgnoreCase(groupNameHint.trim()))
                    .findFirst()
                    .orElse(null);
            if (exact != null) {
                return exact;
            }
            TaskGroupToolItem contains = groups.stream()
                    .filter(group -> StringUtils.hasText(group.name()))
                    .filter(group -> group.name().toLowerCase(Locale.ROOT).contains(normalized))
                    .findFirst()
                    .orElse(null);
            if (contains != null) {
                return contains;
            }
        }
        return null;
    }

    private TaskGroupToolItem resolveGroupFromTask(String requesterId, String taskId) {
        if (!StringUtils.hasText(taskId)) {
            return null;
        }
        String normalizedTaskId = taskId.trim();
        List<TaskItemToolItem> allItems = listAllGroupTasksRaw(requesterId);
        for (TaskItemToolItem item : allItems) {
            if (item == null || !StringUtils.hasText(item.taskId())) {
                continue;
            }
            if (normalizedTaskId.equals(item.taskId()) && StringUtils.hasText(item.groupId())) {
                TaskGroupToolItem resolved = resolveGroup(requesterId, item.groupId(), item.groupName());
                if (resolved != null) {
                    return resolved;
                }
            }
        }

        List<TaskGroupToolItem> groups = listMyTaskGroups(requesterId, resolveMaxLimit());
        for (TaskGroupToolItem group : groups) {
            if (group == null || !StringUtils.hasText(group.groupId())) {
                continue;
            }
            List<TaskItemToolItem> items = listTasksInGroupInternal(requesterId, group, null);
            boolean found = items.stream()
                    .anyMatch(item -> normalizedTaskId.equals(item.taskId()));
            if (found) {
                return group;
            }
        }
        return null;
    }

    private String resolveTaskIdByName(String requesterId, String taskNameHint, String groupId, String groupNameHint) {
        if (!StringUtils.hasText(taskNameHint)) {
            return null;
        }
        List<TaskItemToolItem> candidates = findTasksByName(requesterId, taskNameHint, groupId, groupNameHint, 20);
        if (candidates.isEmpty()) {
            return null;
        }

        if (candidates.size() == 1) {
            return candidates.getFirst().taskId();
        }

        List<TaskItemToolItem> exact = candidates.stream()
                .filter(item -> StringUtils.hasText(item.title()))
                .filter(item -> item.title().trim().equalsIgnoreCase(taskNameHint.trim()))
                .toList();
        if (exact.size() == 1) {
            return exact.getFirst().taskId();
        }

        if (candidates.size() <= 2) {
            return candidates.getFirst().taskId();
        }

        String sample = candidates.stream()
                .limit(5)
                .map(item -> "\"" + item.title() + "\"")
                .filter(StringUtils::hasText)
                .reduce((a, b) -> a + ", " + b)
                .orElse("nhiều task trùng tên");
        throw new InvalidParamException("Tìm thấy " + candidates.size() + " task khớp tên. Bạn xác nhận rõ hơn một task trong các lựa chọn: " + sample);
    }

    private TaskItemToolItem resolveTaskForRead(
            String requesterId,
            String taskId,
            String taskNameHint,
            String groupId,
            String groupNameHint
    ) {
        if (StringUtils.hasText(taskId)) {
            String normalizedTaskId = taskId.trim();
            if (StringUtils.hasText(groupId) || StringUtils.hasText(groupNameHint)) {
                List<TaskItemToolItem> scoped = listTasksInGroup(requesterId, groupId, groupNameHint, null);
                TaskItemToolItem inScope = scoped.stream()
                        .filter(item -> normalizedTaskId.equals(item.taskId()))
                        .findFirst()
                        .orElse(null);
                if (inScope != null) {
                    return inScope;
                }
            }
            return listAllGroupTasksRaw(requesterId).stream()
                    .filter(item -> normalizedTaskId.equals(item.taskId()))
                    .findFirst()
                    .orElse(null);
        }

        if (!StringUtils.hasText(taskNameHint)) {
            return null;
        }

        List<TaskItemToolItem> found = findTasksByName(requesterId, taskNameHint, groupId, groupNameHint, 20);
        if (found.isEmpty()) {
            return null;
        }
        if (found.size() == 1) {
            return found.getFirst();
        }

        List<TaskItemToolItem> exact = found.stream()
                .filter(item -> StringUtils.hasText(item.title()))
                .filter(item -> item.title().trim().equalsIgnoreCase(taskNameHint.trim()))
                .toList();
        if (exact.size() == 1) {
            return exact.getFirst();
        }

        if (found.size() <= 2) {
            return found.getFirst();
        }

        String sample = found.stream()
                .limit(5)
                .map(item -> "\"" + item.title() + "\"")
                .filter(StringUtils::hasText)
                .reduce((a, b) -> a + ", " + b)
                .orElse("nhiều task trùng tên");
        throw new InvalidParamException("Có nhiều task trùng tên, hãy nói rõ hơn một task trong: " + sample);
    }

    private List<TaskItemToolItem> listAllGroupTasksRaw(String requesterId) {
        List<TaskGroupToolItem> groups = listMyTaskGroups(requesterId, resolveMaxLimit());
        if (groups.isEmpty()) {
            return List.of();
        }
        List<TaskItemToolItem> merged = new LinkedList<>();
        for (TaskGroupToolItem group : groups) {
            if (group == null || !StringUtils.hasText(group.groupId())) {
                continue;
            }
            merged.addAll(listTasksInGroupInternal(requesterId, group, null));
        }
        return merged;
    }

    private List<TaskItemToolItem> listTasksInGroupInternal(String requesterId, TaskGroupToolItem group, String columnId) {
        if (group == null || !StringUtils.hasText(group.groupId())) {
            return List.of();
        }
        Map<String, String> query = new HashMap<>();
        if (StringUtils.hasText(columnId)) {
            query.put("columnId", columnId.trim());
        }

        JsonNode data = callTaskService(requesterId, HttpMethod.GET, "/groups/" + group.groupId() + "/items", null, query);
        if (data == null || !data.isArray()) {
            return List.of();
        }

        Map<String, String> columnNameById = toColumnNameMap(group.columns());
        List<TaskItemToolItem> items = new ArrayList<>();
        for (JsonNode node : data) {
            TaskItemToolItem item = toTaskItem(node, group.groupId(), group.name(), columnNameById);
            if (item != null) {
                items.add(item);
            }
        }
        return items;
    }

    private String resolveColumnId(List<TaskColumnToolItem> columns, String columnId, String columnNameHint) {
        if (StringUtils.hasText(columnId)) {
            return columnId.trim();
        }
        if (columns == null || columns.isEmpty()) {
            return null;
        }
        if (StringUtils.hasText(columnNameHint)) {
            String normalized = columnNameHint.trim().toLowerCase(Locale.ROOT);
            TaskColumnToolItem exact = columns.stream()
                    .filter(column -> StringUtils.hasText(column.name()))
                    .filter(column -> column.name().trim().equalsIgnoreCase(columnNameHint.trim()))
                    .findFirst()
                    .orElse(null);
            if (exact != null) {
                return exact.columnId();
            }
            TaskColumnToolItem contains = columns.stream()
                    .filter(column -> StringUtils.hasText(column.name()))
                    .filter(column -> column.name().toLowerCase(Locale.ROOT).contains(normalized))
                    .findFirst()
                    .orElse(null);
            if (contains != null) {
                return contains.columnId();
            }
        }
        return columns.stream()
                .sorted(Comparator.comparingInt(TaskColumnToolItem::orderIndex))
                .map(TaskColumnToolItem::columnId)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
    }

    private TaskGroupToolItem toGroupItem(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String groupId = textValue(node, "id");
        List<TaskColumnToolItem> columns = new ArrayList<>();
        JsonNode columnsNode = node.get("columns");
        if (columnsNode != null && columnsNode.isArray()) {
            for (JsonNode col : columnsNode) {
                if (col == null || col.isNull()) {
                    continue;
                }
                columns.add(new TaskColumnToolItem(
                        textValue(col, "id"),
                        textValue(col, "name"),
                        intValue(col, "orderIndex", 0)
                ));
            }
        }
        int memberCount = 0;
        List<String> memberIdList = new ArrayList<>();
        JsonNode memberIds = node.get("memberIds");
        if (memberIds != null && memberIds.isArray()) {
            memberCount = memberIds.size();
            for (JsonNode memberIdNode : memberIds) {
                if (memberIdNode == null || memberIdNode.isNull()) {
                    continue;
                }
                String value = memberIdNode.asText();
                if (StringUtils.hasText(value)) {
                    memberIdList.add(value.trim());
                }
            }
        }
        return new TaskGroupToolItem(
                groupId,
                textValue(node, "name"),
                textValue(node, "description"),
                textValue(node, "ownerId"),
                memberCount,
                memberIdList,
                columns
        );
    }

    private List<String> resolveAssigneeIdsForGroup(
            String requesterId,
            TaskGroupToolItem group,
            List<String> assigneeIdsOrHints,
            List<String> assigneeNameHints
    ) {
        List<String> idOrHints = normalizeList(assigneeIdsOrHints);
        List<String> nameHints = normalizeList(assigneeNameHints);
        if (idOrHints.isEmpty() && nameHints.isEmpty()) {
            return List.of();
        }
        if (group == null || group.memberIds() == null || group.memberIds().isEmpty()) {
            if (nameHints.isEmpty()) {
                return idOrHints;
            }
            throw new InvalidParamException("Không xác định được nhóm để map assignee theo tên.");
        }

        Set<String> memberIds = new LinkedHashSet<>(group.memberIds());
        List<String> resolvedIds = new ArrayList<>();

        for (String raw : idOrHints) {
            if (memberIds.contains(raw)) {
                resolvedIds.add(raw);
            } else {
                nameHints.add(raw);
            }
        }

        if (nameHints.isEmpty()) {
            return resolvedIds.stream().distinct().toList();
        }

        Map<String, String> displayNameByMemberId = new LinkedHashMap<>();
        for (String memberId : memberIds) {
            String displayName = grpcUserServiceClient.getUserDisplayInfo(memberId)
                    .map(GrpcUserServiceClient.UserDisplayInfo::displayName)
                    .orElse(memberId);
            displayNameByMemberId.put(memberId, displayName);
        }

        List<String> unresolved = new ArrayList<>();
        for (String hint : nameHints) {
            String normalizedHint = normalizeText(hint);
            if (!StringUtils.hasText(normalizedHint)) {
                continue;
            }
            List<String> exactMatches = displayNameByMemberId.entrySet().stream()
                    .filter(entry -> normalizeText(entry.getValue()).equals(normalizedHint))
                    .map(Map.Entry::getKey)
                    .toList();

            if (exactMatches.size() == 1) {
                resolvedIds.add(exactMatches.getFirst());
                continue;
            }
            if (exactMatches.size() > 1) {
                throw buildAmbiguousAssigneeException(hint, exactMatches, displayNameByMemberId);
            }

            List<String> partialMatches = displayNameByMemberId.entrySet().stream()
                    .filter(entry -> containsNormalized(entry.getValue(), hint) || containsNormalized(hint, entry.getValue()))
                    .map(Map.Entry::getKey)
                    .toList();

            if (partialMatches.size() == 1) {
                resolvedIds.add(partialMatches.getFirst());
                continue;
            }
            if (partialMatches.size() > 1) {
                throw buildAmbiguousAssigneeException(hint, partialMatches, displayNameByMemberId);
            }

            List<String> fuzzyMatches = displayNameByMemberId.entrySet().stream()
                    .filter(entry -> fuzzyNameMatch(entry.getValue(), hint))
                    .map(Map.Entry::getKey)
                    .toList();
            if (fuzzyMatches.size() == 1) {
                resolvedIds.add(fuzzyMatches.getFirst());
                continue;
            }
            if (fuzzyMatches.size() > 1) {
                throw buildAmbiguousAssigneeException(hint, fuzzyMatches, displayNameByMemberId);
            }

            unresolved.add(hint);
        }

        if (!unresolved.isEmpty()) {
            throw new InvalidParamException("Không tìm thấy thành viên theo tên: " + String.join(", ", unresolved));
        }
        return resolvedIds.stream().distinct().toList();
    }

    private InvalidParamException buildAmbiguousAssigneeException(
            String hint,
            List<String> matchedMemberIds,
            Map<String, String> displayNameByMemberId
    ) {
        String options = matchedMemberIds.stream()
                .map(memberId -> "\"" + firstNonBlank(displayNameByMemberId.get(memberId), memberId) + "\"")
                .distinct()
                .limit(8)
                .reduce((a, b) -> a + ", " + b)
                .orElse("nhiều thành viên");
        return new InvalidParamException("Tên thành viên \"" + hint + "\" bị trùng. Bạn nói rõ hơn: " + options);
    }

    private boolean containsNormalized(String source, String token) {
        String a = normalizeText(source);
        String b = normalizeText(token);
        return StringUtils.hasText(a) && StringUtils.hasText(b) && a.contains(b);
    }

    private boolean fuzzyNameMatch(String source, String hint) {
        String normalizedSource = normalizeText(source);
        String normalizedHint = normalizeText(hint);
        if (!StringUtils.hasText(normalizedSource) || !StringUtils.hasText(normalizedHint)) {
            return false;
        }
        if (normalizedSource.equals(normalizedHint)) {
            return true;
        }

        List<String> sourceTokens = tokenize(normalizedSource);
        List<String> hintTokens = tokenize(normalizedHint);
        if (hintTokens.isEmpty() || sourceTokens.isEmpty()) {
            return false;
        }

        int matched = 0;
        for (String hintToken : hintTokens) {
            boolean tokenMatched = sourceTokens.stream().anyMatch(sourceToken -> tokenSimilar(sourceToken, hintToken));
            if (tokenMatched) {
                matched++;
            }
        }
        return matched >= Math.max(1, hintTokens.size() - 1);
    }

    private List<String> tokenize(String text) {
        if (!StringUtils.hasText(text)) {
            return List.of();
        }
        return List.of(text.split("\\s+")).stream()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toList();
    }

    private boolean tokenSimilar(String a, String b) {
        if (!StringUtils.hasText(a) || !StringUtils.hasText(b)) {
            return false;
        }
        if (a.equals(b) || a.startsWith(b) || b.startsWith(a)) {
            return true;
        }
        return levenshteinDistance(a, b) <= 1;
    }

    private int levenshteinDistance(String a, String b) {
        int n = a.length();
        int m = b.length();
        int[][] dp = new int[n + 1][m + 1];
        for (int i = 0; i <= n; i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= m; j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= m; j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[n][m];
    }

    private boolean hasAnyAssigneeName(List<String> assigneeIds, List<String> assigneeNameHints) {
        return (assigneeIds != null && !assigneeIds.isEmpty()) || (assigneeNameHints != null && !assigneeNameHints.isEmpty());
    }

    private String normalizeText(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toLowerCase(Locale.ROOT).trim();
    }

    private TaskItemToolItem toTaskItem(JsonNode node, String defaultGroupId, String defaultGroupName, Map<String, String> columnNameById) {
        if (node == null || node.isNull()) {
            return null;
        }
        String groupId = firstNonBlank(textValue(node, "groupId"), defaultGroupId);
        String columnId = textValue(node, "columnId");
        Instant dueDate = instantValue(node, "dueDate");
        Instant now = Instant.now();
        boolean overdue = dueDate != null && dueDate.isBefore(now) && !booleanValue(node, "completed", false);
        Long dueInDays = dueDate == null
                ? null
                : ChronoUnit.DAYS.between(
                        Instant.now().atZone(ZoneId.systemDefault()).toLocalDate(),
                        dueDate.atZone(ZoneId.systemDefault()).toLocalDate()
                );

        List<String> assigneeIds = new ArrayList<>();
        JsonNode assigneesNode = node.get("assigneeIds");
        if (assigneesNode != null && assigneesNode.isArray()) {
            for (JsonNode assignee : assigneesNode) {
                if (assignee != null && !assignee.isNull()) {
                    String value = assignee.asText();
                    if (StringUtils.hasText(value)) {
                        assigneeIds.add(value.trim());
                    }
                }
            }
        }

        return new TaskItemToolItem(
                textValue(node, "id"),
                groupId,
                defaultGroupName,
                columnId,
                columnNameById == null ? null : columnNameById.get(columnId),
                textValue(node, "title"),
                textValue(node, "description"),
                assigneeIds,
                textValue(node, "reporterId"),
                instantValue(node, "startDate"),
                dueDate,
                textValue(node, "priority"),
                booleanValue(node, "completed", false),
                instantValue(node, "completedAt"),
                instantValue(node, "createdAt"),
                instantValue(node, "updatedAt"),
                overdue,
                dueInDays
        );
    }

    private TaskCommentToolItem toTaskCommentItem(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        List<Map<String, Object>> attachments = new ArrayList<>();
        JsonNode attachmentsNode = node.get("attachments");
        if (attachmentsNode != null && attachmentsNode.isArray()) {
            for (JsonNode attachmentNode : attachmentsNode) {
                if (attachmentNode == null || attachmentNode.isNull()) {
                    continue;
                }
                attachments.add(objectMapper.convertValue(attachmentNode, Map.class));
            }
        }
        return new TaskCommentToolItem(
                textValue(node, "id"),
                textValue(node, "groupId"),
                textValue(node, "taskId"),
                textValue(node, "authorId"),
                textValue(node, "content"),
                attachments,
                instantValue(node, "createdAt"),
                instantValue(node, "updatedAt")
        );
    }

    private Map<String, String> toColumnNameMap(List<TaskColumnToolItem> columns) {
        if (columns == null || columns.isEmpty()) {
            return Map.of();
        }
        Map<String, String> map = new HashMap<>();
        for (TaskColumnToolItem column : columns) {
            if (column != null && StringUtils.hasText(column.columnId())) {
                map.put(column.columnId(), column.name());
            }
        }
        return map;
    }

    private JsonNode callTaskService(
            String requesterId,
            HttpMethod method,
            String path,
            Map<String, Object> body,
            Map<String, String> query
    ) {
        String configuredBaseUrl = aiAssistantProperties.getTaskTools().getBaseUrl();
        if (!StringUtils.hasText(configuredBaseUrl)) {
            throw new InvalidParamException("Thiếu cấu hình app.ai-assistant.task-tools.base-url");
        }

        List<String> candidateBaseUrls = buildCandidateBaseUrls(configuredBaseUrl.trim());
        RestTemplate restTemplate = createRestTemplate();
        List<String> connectionErrors = new ArrayList<>();

        for (String baseUrl : candidateBaseUrls) {
            String url = buildUrl(baseUrl, path, query);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.set(USER_ID_HEADER, requesterId);

            HttpEntity<?> requestEntity = body == null
                    ? new HttpEntity<>(headers)
                    : new HttpEntity<>(body, headers);
            try {
                ResponseEntity<String> response = restTemplate.exchange(url, method, requestEntity, String.class);
                String rawBody = response.getBody();
                if (!StringUtils.hasText(rawBody)) {
                    return null;
                }
                JsonNode root = objectMapper.readTree(rawBody);
                if (root != null && root.has("data")) {
                    return root.get("data");
                }
                return root;
            } catch (HttpStatusCodeException ex) {
                String responseBody = ex.getResponseBodyAsString();
                String message = extractErrorMessage(responseBody);
                log.warn("Task tool http error method={} url={} status={} body={}", method, url, ex.getStatusCode(), responseBody);
                throw new InvalidParamException(firstNonBlank(message, "Gọi task-service thất bại"));
            } catch (ResourceAccessException ex) {
                String detail = "url=" + url + " err=" + firstNonBlank(ex.getMessage(), ex.getClass().getSimpleName());
                connectionErrors.add(detail);
                log.warn("Task tool connection fail method={} {}", method, detail);
            } catch (Exception ex) {
                String detail = "url=" + url + " err=" + firstNonBlank(ex.getMessage(), ex.getClass().getSimpleName());
                connectionErrors.add(detail);
                log.warn("Task tool unexpected error method={} {}", method, detail, ex);
            }
        }

        String mergedErrors = connectionErrors.isEmpty()
                ? "không rõ nguyên nhân"
                : connectionErrors.stream().limit(3).reduce((a, b) -> a + " | " + b).orElse("không rõ nguyên nhân");
        throw new InvalidParamException("Không thể kết nối task-service. Chi tiết: " + mergedErrors);
    }

    private RestTemplate createRestTemplate() {
        int connectTimeoutMs = Math.max(1000, aiAssistantProperties.getTaskTools().getConnectTimeoutMs());
        int readTimeoutMs = Math.max(1000, aiAssistantProperties.getTaskTools().getReadTimeoutMs());
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return TraceRestTemplate.instrument(new RestTemplate(requestFactory));
    }

    private String buildUrl(String baseUrl, String path, Map<String, String> query) {
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = StringUtils.hasText(path)
                ? (path.startsWith("/") ? path : "/" + path)
                : "";
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(normalizedBase + normalizedPath);
        if (query != null) {
            query.forEach((k, v) -> {
                if (StringUtils.hasText(v)) {
                    builder.queryParam(k, v.trim());
                }
            });
        }
        return builder.build(true).toUriString();
    }

    private List<String> buildCandidateBaseUrls(String configuredBaseUrl) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        candidates.add(configuredBaseUrl);

        try {
            URI uri = URI.create(configuredBaseUrl);
            String host = uri.getHost();
            int port = uri.getPort();
            String scheme = StringUtils.hasText(uri.getScheme()) ? uri.getScheme() : "http";
            String path = uri.getPath();
            if (!StringUtils.hasText(path)) {
                path = "/api/v1/tasks";
            }

            if (StringUtils.hasText(host) && ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host))) {
                if (port == 8090) {
                    candidates.add(scheme + "://localhost:8089" + path);
                    candidates.add(scheme + "://127.0.0.1:8090" + path);
                    candidates.add(scheme + "://127.0.0.1:8089" + path);
                } else if (port == 8089) {
                    candidates.add(scheme + "://localhost:8090" + path);
                    candidates.add(scheme + "://127.0.0.1:8089" + path);
                    candidates.add(scheme + "://127.0.0.1:8090" + path);
                }
                candidates.add(scheme + "://host.docker.internal:" + (port > 0 ? port : 8090) + path);
            }
        } catch (Exception ignored) {
        }

        return new ArrayList<>(candidates);
    }

    private String extractErrorMessage(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String message = textValue(root, "message");
            if (StringUtils.hasText(message)) {
                return message;
            }
            String error = textValue(root, "error");
            if (StringUtils.hasText(error)) {
                return error;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private Object normalizePriority(String priority) {
        if (!StringUtils.hasText(priority)) {
            return null;
        }
        String normalized = priority.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "LOW", "MEDIUM", "HIGH", "URGENT" -> normalized;
            default -> null;
        };
    }

    private Instant parseInstantInput(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String value = raw.trim();
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ignored) {
        }
        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("MM/dd/yyyy")
        );
        for (DateTimeFormatter formatter : formatters) {
            try {
                return formatter.parse(value, java.time.LocalDate::from)
                        .atStartOfDay(ZoneId.systemDefault())
                        .toInstant();
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private List<String> normalizeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private void putIfPresent(Map<String, Object> body, String key, Object value) {
        if (value == null) {
            return;
        }
        if (value instanceof String stringValue) {
            if (StringUtils.hasText(stringValue)) {
                body.put(key, stringValue.trim());
            }
            return;
        }
        if (value instanceof List<?> listValue) {
            if (!listValue.isEmpty()) {
                body.put(key, listValue);
            }
            return;
        }
        body.put(key, value);
    }

    private String textValue(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return null;
        }
        String value = node.get(field).asText(null);
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private int intValue(JsonNode node, String field, int fallback) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return fallback;
        }
        JsonNode value = node.get(field);
        if (value.isNumber()) {
            return value.asInt(fallback);
        }
        try {
            return Integer.parseInt(value.asText().trim());
        } catch (Exception ex) {
            return fallback;
        }
    }

    private boolean booleanValue(JsonNode node, String field, boolean fallback) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return fallback;
        }
        JsonNode value = node.get(field);
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        String text = value.asText();
        if (!StringUtils.hasText(text)) {
            return fallback;
        }
        return Boolean.parseBoolean(text.trim());
    }

    private Instant instantValue(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return null;
        }
        JsonNode value = node.get(field);
        if (value.isNumber()) {
            return Instant.ofEpochMilli(value.asLong());
        }
        String text = value.asText();
        if (!StringUtils.hasText(text)) {
            return null;
        }
        try {
            return Instant.parse(text.trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return aiAssistantProperties.getTaskTools().getDefaultLimit();
        }
        return Math.min(resolveMaxLimit(), limit);
    }

    private int resolveMaxLimit() {
        return Math.max(1, aiAssistantProperties.getTaskTools().getMaxLimit());
    }

    private String firstNonBlank(String first, String second) {
        if (StringUtils.hasText(first)) {
            return first.trim();
        }
        if (StringUtils.hasText(second)) {
            return second.trim();
        }
        return null;
    }

    private String requireRequester(String requesterId) {
        if (!StringUtils.hasText(requesterId)) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        return requesterId.trim();
    }
}
