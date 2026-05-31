package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.dtos.request.AssistantAskRequest;
import iuh.fit.chat_service.dtos.response.AssistantAskResponse;
import iuh.fit.chat_service.dtos.response.AssistantThreadMessageResponse;
import iuh.fit.chat_service.entities.AiAssistantThread;
import iuh.fit.chat_service.enums.ChatAssistantIntent;
import iuh.fit.chat_service.enums.ChatAssistantTool;
import iuh.fit.chat_service.services.AssistantChatHistoryService;
import iuh.fit.chat_service.services.AssistantChatOrchestratorService;
import iuh.fit.chat_service.services.ChatAssistantToolService;
import iuh.fit.chat_service.services.TaskAssistantToolService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssistantChatOrchestratorServiceImpl implements AssistantChatOrchestratorService {

    private static final String CONFIG_MISSING_FALLBACK = "AI Assistant chưa sẵn sàng do thiếu cấu hình API key/model.";
    private static final int DEFAULT_LIMIT = 20;
    private static final int DEFAULT_PAGE = 1;
    private static final int MAX_TOOL_STEPS = 3;
    private static final int HISTORY_LIMIT = 20;
    private static final Pattern TASK_ID_PATTERN = Pattern.compile("\\b[a-fA-F0-9]{24}\\b|\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\\b");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{2}/\\d{2}/\\d{4}\\b");

    private final ChatAssistantToolService chatAssistantToolService;
    private final TaskAssistantToolService taskAssistantToolService;
    private final AssistantChatHistoryService assistantChatHistoryService;
    private final AiAssistantProperties aiAssistantProperties;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void logAssistantRuntimeConfig() {
        log.info(
                "AI Assistant runtime config: enabled={}, model={}, baseUrl={}, apiKeyPresent={}",
                aiAssistantProperties.isEnabled(),
                aiAssistantProperties.getTextModel(),
                aiAssistantProperties.getBaseUrl(),
                StringUtils.hasText(aiAssistantProperties.getApiKey())
        );
    }

    @Override
    public AssistantAskResponse ask(String requesterId, AssistantAskRequest request) {
        if (!StringUtils.hasText(requesterId)) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        if (request == null || !StringUtils.hasText(request.getMessage())) {
            throw new InvalidParamException("message không được để trống");
        }

        String ownerUserId = requesterId.trim();
        AiAssistantThread thread = assistantChatHistoryService.getOrCreateDefaultThread(ownerUserId);
        String question = request.getMessage().trim();

        log.info(
                "AI ask start: requesterId={}, threadId={}, questionLength={}, aiReady={}, enabled={}, model={}, apiKeyPresent={}",
                ownerUserId,
                thread.getId(),
                question.length(),
                isAiReady(),
                aiAssistantProperties.isEnabled(),
                aiAssistantProperties.getTextModel(),
                StringUtils.hasText(aiAssistantProperties.getApiKey())
        );

        if (!isAiReady()) {
            log.warn(
                    "AI ask fallback-not-ready: requesterId={}, threadId={}, enabled={}, model={}, apiKeyPresent={}",
                    ownerUserId,
                    thread.getId(),
                    aiAssistantProperties.isEnabled(),
                    aiAssistantProperties.getTextModel(),
                    StringUtils.hasText(aiAssistantProperties.getApiKey())
            );
            AssistantAskResponse response = AssistantAskResponse.builder()
                    .threadId(thread.getId())
                    .question(question)
                    .intent(ChatAssistantIntent.UNKNOWN)
                    .toolsUsed(List.of())
                    .answer(CONFIG_MISSING_FALLBACK)
                    .data(null)
                    .metadata(Map.of("usedAi", false))
                    .build();
            assistantChatHistoryService.saveUserMessage(ownerUserId, thread.getId(), question);
            assistantChatHistoryService.saveAssistantMessage(
                    ownerUserId,
                    thread.getId(),
                    response.getAnswer(),
                    response.getIntent(),
                    response.getToolsUsed(),
                    null
            );
            return response;
        }

        AgentRunResult runResult = runToolCallingAgent(ownerUserId, thread.getId(), question);
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("usedAi", true);
        metadata.put("toolCallCount", runResult.toolsUsed().size());
        metadata.put("toolLoopSteps", runResult.toolLoopSteps());

        log.info(
                "AI ask done: requesterId={}, threadId={}, intent={}, toolsUsed={}, toolLoopSteps={}, answerLength={}",
                ownerUserId,
                thread.getId(),
                runResult.intent(),
                runResult.toolsUsed(),
                runResult.toolLoopSteps(),
                runResult.answer() == null ? 0 : runResult.answer().length()
        );

        AssistantAskResponse response = AssistantAskResponse.builder()
                .threadId(thread.getId())
                .question(question)
                .intent(runResult.intent())
                .toolsUsed(runResult.toolsUsed())
                .answer(runResult.answer())
                .data(runResult.lastToolData())
                .metadata(metadata)
                .build();
        assistantChatHistoryService.saveUserMessage(ownerUserId, thread.getId(), question);
        assistantChatHistoryService.saveAssistantMessage(
                ownerUserId,
                thread.getId(),
                response.getAnswer(),
                response.getIntent(),
                response.getToolsUsed(),
                response.getData()
        );
        return response;
    }

    private AgentRunResult runToolCallingAgent(String requesterId, String threadId, String question) {
        List<Map<String, Object>> contents = new ArrayList<>();
        appendHistoryContents(contents, requesterId, threadId);
        contents.add(contentWithText("user", question));

        List<ChatAssistantTool> toolsUsed = new ArrayList<>();
        ChatAssistantIntent resolvedIntent = ChatAssistantIntent.UNKNOWN;
        Object lastToolData = null;
        String finalAnswer = null;

        for (int step = 0; step < MAX_TOOL_STEPS; step++) {
            log.debug("AI agent step={} requesterId={} questionLength={}", step + 1, requesterId, question.length());
            JsonNode selectorResponse = callGeminiGenerateContent(
                    contents,
                    agentToolSelectorSystemPrompt(),
                    buildGeminiToolSelectorDeclarations(),
                    autoFunctionCallingConfig()
            );
            if (selectorResponse == null) {
                log.warn("AI agent step={} selector got null response from Gemini", step + 1);
                break;
            }

            JsonNode selectorCandidate = firstCandidate(selectorResponse);
            if (selectorCandidate == null) {
                break;
            }

            JsonNode selectorModelContent = selectorCandidate.path("content");
            if (!selectorModelContent.isObject()) {
                break;
            }

            FunctionCallRequest selectedToolCall = extractFunctionCall(selectorModelContent);
            if (selectedToolCall == null) {
                finalAnswer = extractTextFromContent(selectorModelContent);
                log.debug(
                        "AI agent step={} selector produced final text length={}",
                        step + 1,
                        finalAnswer == null ? 0 : finalAnswer.length()
                );
                break;
            }
            ChatAssistantTool selectedTool = parseTool(selectedToolCall.name());
            if (selectedTool == null) {
                finalAnswer = "Mình chưa hỗ trợ thao tác này. Bạn thử diễn đạt lại yêu cầu cụ thể hơn.";
                log.warn("AI agent step={} selected unsupported tool name={}", step + 1, selectedToolCall.name());
                break;
            }

            JsonNode argsResponse = callGeminiGenerateContent(
                    contents,
                    agentToolArgsSystemPrompt(selectedTool),
                    buildGeminiSingleToolDeclaration(selectedTool),
                    forceSingleFunctionCallingConfig(selectedTool.getCode())
            );
            if (argsResponse == null) {
                log.warn("AI agent step={} args-builder got null response from Gemini", step + 1);
                break;
            }
            JsonNode argsCandidate = firstCandidate(argsResponse);
            if (argsCandidate == null) {
                break;
            }
            JsonNode argsModelContent = argsCandidate.path("content");
            if (!argsModelContent.isObject()) {
                break;
            }
            FunctionCallRequest functionCall = extractFunctionCall(argsModelContent);
            if (functionCall == null) {
                log.warn("AI agent step={} args-builder did not return functionCall for tool={}", step + 1, selectedTool.getCode());
                functionCall = new FunctionCallRequest(selectedTool.getCode(), Map.of());
            }
            log.info(
                    "AI agent functionCall step={}: name={}, args={}",
                    step + 1,
                    functionCall.name(),
                    functionCall.arguments()
            );

            ToolExecutionResult toolExecution = executeToolCall(requesterId, threadId, question, functionCall);
            if (toolExecution.tool() != null) {
                toolsUsed.add(toolExecution.tool());
                resolvedIntent = inferIntentByTool(toolExecution.tool());
            }
            lastToolData = toolExecution.data();
            log.info(
                    "AI agent functionResult step={}: tool={}, success={}, dataType={}",
                    step + 1,
                    toolExecution.tool(),
                    toolExecution.functionResponse().get("success"),
                    lastToolData == null ? "null" : lastToolData.getClass().getSimpleName()
            );

            contents.add(modelContentToMap(selectorModelContent));
            contents.add(modelContentToMap(argsModelContent));
            contents.add(contentWithFunctionResponse(functionCall.name(), toolExecution));
        }

        ToolExecutionResult correctiveToolExecution = tryCorrectTaskActionAfterToolRun(
                requesterId,
                threadId,
                question,
                toolsUsed
        );
        if (correctiveToolExecution != null && correctiveToolExecution.tool() != null) {
            toolsUsed.add(correctiveToolExecution.tool());
            resolvedIntent = inferIntentByTool(correctiveToolExecution.tool());
            lastToolData = correctiveToolExecution.data();
            finalAnswer = buildFallbackAnswer(question, resolvedIntent, lastToolData);
        }

        if (toolsUsed.isEmpty()) {
            ToolExecutionResult fallbackToolExecution = tryRuleBasedTaskTool(requesterId, threadId, question);
            if (fallbackToolExecution == null || fallbackToolExecution.tool() == null) {
                fallbackToolExecution = tryRuleBasedChatTool(requesterId, question);
            }
            if (fallbackToolExecution != null && fallbackToolExecution.tool() != null) {
                toolsUsed.add(fallbackToolExecution.tool());
                resolvedIntent = inferIntentByTool(fallbackToolExecution.tool());
                ChatAssistantIntent overrideIntent = readIntentFromFallbackData(fallbackToolExecution.data());
                if (overrideIntent != null) {
                    resolvedIntent = overrideIntent;
                }
                lastToolData = fallbackToolExecution.data();
                finalAnswer = buildFallbackAnswer(question, resolvedIntent, lastToolData);
            }
        }

        if (!StringUtils.hasText(finalAnswer)) {
            finalAnswer = buildFallbackAnswer(question, resolvedIntent, lastToolData);
            log.warn("AI agent fallback answer used: intent={}, questionLength={}", resolvedIntent, question.length());
        }
        if (toolsUsed.isEmpty()) {
            resolvedIntent = inferIntentWithoutTool(question, finalAnswer);
            log.debug("AI agent inferred intent without tool: {}", resolvedIntent);
        }

        return new AgentRunResult(finalAnswer, resolvedIntent, toolsUsed, lastToolData, toolsUsed.size());
    }

    private ToolExecutionResult executeToolCall(String requesterId, String threadId, String question, FunctionCallRequest functionCall) {
        ChatAssistantTool tool = parseTool(functionCall.name());
        if (tool == null) {
            log.warn("AI agent unsupported tool requested by model: {}", functionCall.name());
            return new ToolExecutionResult(null, null, Map.of("error", "Tool không được hỗ trợ: " + functionCall.name()));
        }

        Map<String, Object> args = functionCall.arguments() == null ? Map.of() : functionCall.arguments();
        TaskContext recentTaskContext = resolveRecentTaskContext(requesterId, threadId);
        String explicitTaskNameHint = firstNonBlank(
                readString(args, "taskNameHint"),
                readString(args, "taskTitleHint"),
                extractTaskNameHint(question)
        );
        String resolvedTaskNameHint = firstNonBlank(explicitTaskNameHint, recentTaskContext.taskName());
        String resolvedTaskIdHint = resolveTaskIdForAction(args, question, recentTaskContext, explicitTaskNameHint);
        try {
            Object data;
            switch (tool) {
                case CHAT_LIST_MY_CONVERSATIONS -> data = chatAssistantToolService.listMyConversations(
                        requesterId,
                        readInt(args, "limit", DEFAULT_LIMIT)
                );
                case CHAT_GET_CONVERSATION_MESSAGES -> {
                    String conversationId = resolveConversationId(requesterId, args);
                    if (!StringUtils.hasText(conversationId)) {
                        data = Map.of("hint", "Không xác định được conversation để lấy tin nhắn.");
                    } else {
                        data = chatAssistantToolService.getConversationMessages(
                                requesterId,
                                conversationId,
                                readInt(args, "page", DEFAULT_PAGE),
                                readInt(args, "limit", DEFAULT_LIMIT)
                        );
                    }
                }
                case CHAT_SEARCH_KEYWORD -> {
                    String conversationId = resolveConversationId(requesterId, args);
                    if (!StringUtils.hasText(conversationId)) {
                        data = Map.of("hint", "Không xác định được conversation để tìm keyword.");
                    } else {
                        String keyword = firstNonBlank(readString(args, "keyword"), question);
                        data = chatAssistantToolService.searchMessagesByKeyword(
                                requesterId,
                                conversationId,
                                keyword,
                                readInt(args, "page", DEFAULT_PAGE),
                                readInt(args, "limit", DEFAULT_LIMIT)
                        );
                    }
                }
                case CHAT_SEMANTIC_SEARCH_CONVERSATION -> {
                    String conversationId = resolveConversationId(requesterId, args);
                    if (!StringUtils.hasText(conversationId)) {
                        data = Map.of("hint", "Không xác định được conversation để semantic search.");
                    } else {
                        data = chatAssistantToolService.semanticSearchConversation(
                                requesterId,
                                conversationId,
                                firstNonBlank(readString(args, "query"), question),
                                readInt(args, "limit", DEFAULT_LIMIT)
                        );
                    }
                }
                case CHAT_SEMANTIC_SEARCH_MY_SPACE -> data = chatAssistantToolService.semanticSearchMyChatSpace(
                        requesterId,
                        firstNonBlank(readString(args, "query"), question),
                        readInt(args, "limit", DEFAULT_LIMIT),
                        readString(args, "participantId")
                );
                case CHAT_FIND_WHO_SAID -> data = chatAssistantToolService.findWhoSaid(
                                requesterId,
                                firstNonBlank(readString(args, "query"), question),
                                readString(args, "conversationId"),
                                readString(args, "participantId"),
                                readInt(args, "limit", DEFAULT_LIMIT)
                        )
                        .orElse(null);
                case TASK_LIST_MY_GROUPS -> data = taskAssistantToolService.listMyTaskGroups(
                        requesterId,
                        readInt(args, "limit", DEFAULT_LIMIT)
                );
                case TASK_FIND_TASKS_BY_NAME -> data = taskAssistantToolService.findTasksByName(
                        requesterId,
                        firstNonBlank(readString(args, "taskNameHint"), readString(args, "taskTitleHint")),
                        readString(args, "groupId"),
                        readString(args, "groupNameHint"),
                        readInt(args, "limit", DEFAULT_LIMIT)
                );
                case TASK_LIST_GROUP_TASKS -> data = taskAssistantToolService.listTasksInGroup(
                        requesterId,
                        readString(args, "groupId"),
                        readString(args, "groupNameHint"),
                        readString(args, "columnId")
                );
                case TASK_CREATE_TASK -> data = taskAssistantToolService.createTaskInGroup(
                        requesterId,
                        readString(args, "groupId"),
                        readString(args, "groupNameHint"),
                        readString(args, "columnId"),
                        readString(args, "columnNameHint"),
                        firstNonBlank(readString(args, "title"), question),
                        readString(args, "description"),
                        readStringList(args, "assigneeIds"),
                        readStringListWithAliases(args, "assigneeNameHints", "assigneeNames", "assignees"),
                        readString(args, "startDate"),
                        readString(args, "dueDate"),
                        readString(args, "priority")
                );
                case TASK_UPDATE_TASK -> {
                    Boolean completedFromQuestion = extractCompletedHint(question);
                    Boolean completedFromArgs = readBoolean(args, "completed");
                    Boolean completedResolved = completedFromQuestion != null ? completedFromQuestion : completedFromArgs;
                    data = taskAssistantToolService.updateTask(
                            requesterId,
                            resolvedTaskIdHint,
                            resolvedTaskNameHint,
                            readString(args, "title"),
                            firstNonBlank(readString(args, "description"), extractDescriptionHint(question)),
                            readString(args, "columnId"),
                            firstNonBlank(readString(args, "groupId"), recentTaskContext.groupId()),
                            firstNonBlank(readString(args, "groupNameHint"), extractGroupNameHint(question), recentTaskContext.groupName()),
                            firstNonBlank(readString(args, "columnNameHint"), extractColumnNameHint(question)),
                            readStringList(args, "assigneeIds"),
                            mergeDistinct(
                                    readStringListWithAliases(args, "assigneeNameHints", "assigneeNames", "assignees"),
                                    extractAssigneeNameHints(question)
                            ),
                            firstNonBlank(readString(args, "startDate"), extractStartDateHint(question)),
                            firstNonBlank(readString(args, "dueDate"), extractDueDateHint(question)),
                            firstNonBlank(readString(args, "priority"), extractPriorityHint(question)),
                            completedResolved
                    );
                }
                case TASK_DELETE_TASK -> data = handleDeleteTaskToolCall(requesterId, threadId, question, args);
                case TASK_GET_TASK_DETAIL -> data = taskAssistantToolService.getTaskDetail(
                        requesterId,
                        resolvedTaskIdHint,
                        resolvedTaskNameHint,
                        firstNonBlank(readString(args, "groupId"), recentTaskContext.groupId()),
                        firstNonBlank(readString(args, "groupNameHint"), extractGroupNameHint(question), recentTaskContext.groupName())
                );
                case TASK_ADD_TASK_COMMENT -> data = taskAssistantToolService.addTaskComment(
                        requesterId,
                        resolvedTaskIdHint,
                        resolvedTaskNameHint,
                        firstNonBlank(readString(args, "groupId"), recentTaskContext.groupId()),
                        firstNonBlank(readString(args, "groupNameHint"), extractGroupNameHint(question), recentTaskContext.groupName()),
                        firstNonBlank(readString(args, "content"), extractCommentContentHint(question))
                );
                case TASK_LIST_TASK_COMMENTS -> data = taskAssistantToolService.listTaskComments(
                        requesterId,
                        resolvedTaskIdHint,
                        resolvedTaskNameHint,
                        firstNonBlank(readString(args, "groupId"), recentTaskContext.groupId()),
                        firstNonBlank(readString(args, "groupNameHint"), extractGroupNameHint(question), recentTaskContext.groupName()),
                        readInt(args, "limit", DEFAULT_LIMIT)
                );
                case TASK_LIST_MY_TASKS -> data = taskAssistantToolService.listMyTasks(
                        requesterId,
                        readBoolean(args, "includeCompleted"),
                        readInt(args, "limit", DEFAULT_LIMIT)
                );
                case TASK_LIST_MY_OVERDUE_TASKS -> data = taskAssistantToolService.listMyOverdueTasks(
                        requesterId,
                        readBoolean(args, "includeCompleted"),
                        readInt(args, "limit", DEFAULT_LIMIT)
                );
                case TASK_LIST_MY_DUE_SOON_TASKS -> data = taskAssistantToolService.listMyDueSoonTasks(
                        requesterId,
                        readInt(args, "days", 3),
                        readBoolean(args, "includeCompleted"),
                        readInt(args, "limit", DEFAULT_LIMIT)
                );
                default -> data = Map.of("hint", "Tool chưa được triển khai.");
            }

            Map<String, Object> functionResponse = new LinkedHashMap<>();
            functionResponse.put("tool", tool.getCode());
            functionResponse.put("success", true);
            functionResponse.put("data", data);
            return new ToolExecutionResult(data, tool, functionResponse);
        } catch (Exception ex) {
            log.warn("AI agent tool execution failed: tool={}, message={}", tool, ex.getMessage(), ex);
            Map<String, Object> data = Map.of("hint", firstNonBlank(ex.getMessage(), "Tool thực thi thất bại"));
            Map<String, Object> functionResponse = new LinkedHashMap<>();
            functionResponse.put("tool", tool.getCode());
            functionResponse.put("success", false);
            functionResponse.put("error", firstNonBlank(ex.getMessage(), "Tool thực thi thất bại"));
            functionResponse.put("data", data);
            return new ToolExecutionResult(data, tool, functionResponse);
        }
    }

    private List<Map<String, Object>> buildGeminiToolDeclarations() {
        List<Map<String, Object>> functionDeclarations = new ArrayList<>();
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.CHAT_LIST_MY_CONVERSATIONS.getCode(),
                "Lấy danh sách hội thoại của người dùng hiện tại",
                Map.of("limit", intProperty("Số lượng hội thoại cần lấy"))
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.CHAT_GET_CONVERSATION_MESSAGES.getCode(),
                "Lấy danh sách tin nhắn theo hội thoại",
                Map.of(
                        "conversationId", stringProperty("ID hội thoại"),
                        "conversationNameHint", stringProperty("Tên hội thoại gợi ý nếu không có ID"),
                        "page", intProperty("Trang, bắt đầu từ 1"),
                        "limit", intProperty("Số bản ghi mỗi trang")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.CHAT_SEARCH_KEYWORD.getCode(),
                "Tìm tin nhắn theo từ khóa trong một hội thoại",
                Map.of(
                        "conversationId", stringProperty("ID hội thoại"),
                        "conversationNameHint", stringProperty("Tên hội thoại gợi ý"),
                        "keyword", stringProperty("Từ khóa tìm kiếm"),
                        "page", intProperty("Trang"),
                        "limit", intProperty("Giới hạn")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.CHAT_SEMANTIC_SEARCH_CONVERSATION.getCode(),
                "Tìm ngữ nghĩa trong một hội thoại",
                Map.of(
                        "conversationId", stringProperty("ID hội thoại"),
                        "conversationNameHint", stringProperty("Tên hội thoại gợi ý"),
                        "query", stringProperty("Nội dung truy vấn"),
                        "limit", intProperty("Giới hạn")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.CHAT_SEMANTIC_SEARCH_MY_SPACE.getCode(),
                "Tìm ngữ nghĩa trên toàn bộ hội thoại của người dùng",
                Map.of(
                        "query", stringProperty("Nội dung truy vấn"),
                        "participantId", stringProperty("Lọc theo người gửi"),
                        "limit", intProperty("Giới hạn")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.CHAT_FIND_WHO_SAID.getCode(),
                "Tìm ai là người đã nói nội dung tương ứng",
                Map.of(
                        "query", stringProperty("Nội dung cần tìm"),
                        "conversationId", stringProperty("ID hội thoại nếu biết"),
                        "participantId", stringProperty("Lọc theo người gửi"),
                        "limit", intProperty("Giới hạn")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_LIST_MY_GROUPS.getCode(),
                "Lấy danh sách nhóm task mà người dùng hiện tại tham gia",
                Map.of("limit", intProperty("Số nhóm tối đa"))
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_FIND_TASKS_BY_NAME.getCode(),
                "Tìm task theo tên (khi user không nhớ taskId)",
                Map.of(
                        "taskNameHint", stringProperty("Tên task cần tìm"),
                        "groupId", stringProperty("ID nhóm task (tuỳ chọn)"),
                        "groupNameHint", stringProperty("Tên nhóm gợi ý (tuỳ chọn)"),
                        "limit", intProperty("Số lượng tối đa")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_LIST_GROUP_TASKS.getCode(),
                "Lấy danh sách task trong một nhóm",
                Map.of(
                        "groupId", stringProperty("ID nhóm task"),
                        "groupNameHint", stringProperty("Tên nhóm gợi ý nếu không có ID"),
                        "columnId", stringProperty("Lọc theo cột (tuỳ chọn)")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_CREATE_TASK.getCode(),
                "Tạo task mới trong một nhóm task",
                Map.ofEntries(
                        Map.entry("groupId", stringProperty("ID nhóm task")),
                        Map.entry("groupNameHint", stringProperty("Tên nhóm gợi ý nếu không có ID")),
                        Map.entry("columnId", stringProperty("ID cột task")),
                        Map.entry("columnNameHint", stringProperty("Tên cột gợi ý nếu chưa có columnId")),
                        Map.entry("title", stringProperty("Tiêu đề task")),
                        Map.entry("description", stringProperty("Mô tả task")),
                        Map.entry("assigneeIds", stringArrayProperty("Danh sách userId được gán")),
                        Map.entry("assigneeNameHints", stringArrayProperty("Danh sách tên người được gán, ưu tiên dùng trường này thay vì ID")),
                        Map.entry("startDate", stringProperty("Ngày bắt đầu (ISO hoặc yyyy-MM-dd)")),
                        Map.entry("dueDate", stringProperty("Ngày hết hạn (ISO hoặc yyyy-MM-dd)")),
                        Map.entry("priority", stringProperty("Ưu tiên: LOW|MEDIUM|HIGH|URGENT"))
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_UPDATE_TASK.getCode(),
                "Cập nhật thông tin task",
                Map.ofEntries(
                        Map.entry("taskId", stringProperty("ID task cần cập nhật")),
                        Map.entry("taskNameHint", stringProperty("Tên task để resolve nếu không có taskId")),
                        Map.entry("title", stringProperty("Tiêu đề mới")),
                        Map.entry("description", stringProperty("Mô tả mới")),
                        Map.entry("columnId", stringProperty("ID cột mới")),
                        Map.entry("groupId", stringProperty("ID nhóm (dùng để resolve columnNameHint)")),
                        Map.entry("groupNameHint", stringProperty("Tên nhóm gợi ý (dùng để resolve columnNameHint)")),
                        Map.entry("columnNameHint", stringProperty("Tên cột gợi ý")),
                        Map.entry("assigneeIds", stringArrayProperty("Danh sách userId assignee")),
                        Map.entry("assigneeNameHints", stringArrayProperty("Danh sách tên assignee, ưu tiên dùng trường này")),
                        Map.entry("startDate", stringProperty("Ngày bắt đầu")),
                        Map.entry("dueDate", stringProperty("Ngày hết hạn")),
                        Map.entry("priority", stringProperty("Ưu tiên: LOW|MEDIUM|HIGH|URGENT")),
                        Map.entry("completed", booleanProperty("Đánh dấu hoàn thành/chưa hoàn thành"))
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_DELETE_TASK.getCode(),
                "Xóa task theo ID hoặc tên",
                Map.of(
                        "taskId", stringProperty("ID task cần xóa"),
                        "taskNameHint", stringProperty("Tên task để resolve nếu không có taskId"),
                        "groupId", stringProperty("ID nhóm (tuỳ chọn)"),
                        "groupNameHint", stringProperty("Tên nhóm gợi ý (tuỳ chọn)")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_GET_TASK_DETAIL.getCode(),
                "Lấy chi tiết một task theo ID hoặc tên",
                Map.of(
                        "taskId", stringProperty("ID task"),
                        "taskNameHint", stringProperty("Tên task nếu không có ID"),
                        "groupId", stringProperty("ID nhóm (tuỳ chọn)"),
                        "groupNameHint", stringProperty("Tên nhóm gợi ý (tuỳ chọn)")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_ADD_TASK_COMMENT.getCode(),
                "Thêm comment text vào task",
                Map.of(
                        "taskId", stringProperty("ID task"),
                        "taskNameHint", stringProperty("Tên task nếu không có ID"),
                        "groupId", stringProperty("ID nhóm (tuỳ chọn)"),
                        "groupNameHint", stringProperty("Tên nhóm gợi ý (tuỳ chọn)"),
                        "content", stringProperty("Nội dung comment")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_LIST_TASK_COMMENTS.getCode(),
                "Liệt kê comment của một task",
                Map.of(
                        "taskId", stringProperty("ID task"),
                        "taskNameHint", stringProperty("Tên task nếu không có ID"),
                        "groupId", stringProperty("ID nhóm (tuỳ chọn)"),
                        "groupNameHint", stringProperty("Tên nhóm gợi ý (tuỳ chọn)"),
                        "limit", intProperty("Số lượng comment tối đa")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_LIST_MY_TASKS.getCode(),
                "Lấy task của tôi",
                Map.of(
                        "includeCompleted", booleanProperty("Có lấy task đã hoàn thành không"),
                        "limit", intProperty("Số lượng tối đa")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_LIST_MY_OVERDUE_TASKS.getCode(),
                "Lấy task của tôi đang trễ hạn",
                Map.of(
                        "includeCompleted", booleanProperty("Có lấy task đã hoàn thành không"),
                        "limit", intProperty("Số lượng tối đa")
                )
        ));
        functionDeclarations.add(functionDeclaration(
                ChatAssistantTool.TASK_LIST_MY_DUE_SOON_TASKS.getCode(),
                "Lấy task của tôi sắp đến hạn",
                Map.of(
                        "days", intProperty("Số ngày tới để coi là sắp đến hạn"),
                        "includeCompleted", booleanProperty("Có lấy task đã hoàn thành không"),
                        "limit", intProperty("Số lượng tối đa")
                )
        ));

        return List.of(Map.of("functionDeclarations", functionDeclarations));
    }

    private List<Map<String, Object>> buildGeminiToolSelectorDeclarations() {
        List<Map<String, Object>> fullTools = buildGeminiToolDeclarations();
        if (fullTools.isEmpty()) {
            return List.of();
        }
        Object raw = fullTools.getFirst().get("functionDeclarations");
        if (!(raw instanceof List<?> declarations)) {
            return List.of();
        }
        List<Map<String, Object>> selectorDeclarations = new ArrayList<>();
        for (Object item : declarations) {
            if (!(item instanceof Map<?, ?> declarationRaw)) {
                continue;
            }
            Map<String, Object> declaration = castToStringObjectMap(declarationRaw);
            String name = asString(declaration.get("name"));
            String description = asString(declaration.get("description"));
            if (!StringUtils.hasText(name)) {
                continue;
            }
            selectorDeclarations.add(functionDeclaration(name, firstNonBlank(description, "Tool hỗ trợ AI Assistant"), Map.of()));
        }
        return List.of(Map.of("functionDeclarations", selectorDeclarations));
    }

    private List<Map<String, Object>> buildGeminiSingleToolDeclaration(ChatAssistantTool tool) {
        if (tool == null) {
            return List.of();
        }
        Map<String, Object> declaration = findFunctionDeclarationByCode(tool.getCode());
        if (declaration == null) {
            return List.of();
        }
        return List.of(Map.of("functionDeclarations", List.of(declaration)));
    }

    private Map<String, Object> findFunctionDeclarationByCode(String toolCode) {
        if (!StringUtils.hasText(toolCode)) {
            return null;
        }
        List<Map<String, Object>> fullTools = buildGeminiToolDeclarations();
        if (fullTools.isEmpty()) {
            return null;
        }
        Object raw = fullTools.getFirst().get("functionDeclarations");
        if (!(raw instanceof List<?> declarations)) {
            return null;
        }
        for (Object item : declarations) {
            if (!(item instanceof Map<?, ?> declarationRaw)) {
                continue;
            }
            Map<String, Object> declaration = castToStringObjectMap(declarationRaw);
            String name = asString(declaration.get("name"));
            if (StringUtils.hasText(name) && name.equalsIgnoreCase(toolCode)) {
                return declaration;
            }
        }
        return null;
    }

    private Map<String, Object> autoFunctionCallingConfig() {
        return Map.of("functionCallingConfig", Map.of("mode", "AUTO"));
    }

    private Map<String, Object> forceSingleFunctionCallingConfig(String toolName) {
        if (!StringUtils.hasText(toolName)) {
            return autoFunctionCallingConfig();
        }
        return Map.of(
                "functionCallingConfig",
                Map.of(
                        "mode", "ANY",
                        "allowedFunctionNames", List.of(toolName.trim())
                )
        );
    }

    private Map<String, Object> functionDeclaration(String name, String description, Map<String, Object> properties) {
        return Map.of(
                "name", name,
                "description", description,
                "parameters", Map.of(
                        "type", "OBJECT",
                        "properties", properties
                )
        );
    }

    private Map<String, Object> stringProperty(String description) {
        return Map.of("type", "STRING", "description", description);
    }

    private Map<String, Object> intProperty(String description) {
        return Map.of("type", "INTEGER", "description", description);
    }

    private Map<String, Object> booleanProperty(String description) {
        return Map.of("type", "BOOLEAN", "description", description);
    }

    private Map<String, Object> stringArrayProperty(String description) {
        return Map.of(
                "type", "ARRAY",
                "description", description,
                "items", Map.of("type", "STRING")
        );
    }

    private JsonNode callGeminiGenerateContent(
            List<Map<String, Object>> contents,
            String systemPrompt,
            List<Map<String, Object>> tools,
            Map<String, Object> toolConfig
    ) {
        try {
            String endpoint = aiAssistantProperties.getBaseUrl().trim()
                    + "/models/" + aiAssistantProperties.getTextModel().trim()
                    + ":generateContent?key=" + aiAssistantProperties.getApiKey().trim();

            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(Math.max(1000, aiAssistantProperties.getConnectTimeoutMs()));
            requestFactory.setReadTimeout(Math.max(1000, aiAssistantProperties.getReadTimeoutMs()));
            RestTemplate restTemplate = new RestTemplate(requestFactory);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", contents);
            if (tools != null && !tools.isEmpty()) {
                body.put("tools", tools);
            }
            if (toolConfig != null && !toolConfig.isEmpty()) {
                body.put("toolConfig", toolConfig);
            }
            if (StringUtils.hasText(systemPrompt)) {
                body.put("systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt.trim()))
                ));
            }

            try {
                String requestJson = objectMapper.writeValueAsString(body);
                log.info("Gemini request payload: {}", truncateForLog(requestJson, 12000));
            } catch (Exception ex) {
                log.warn("Gemini request payload serialize failed: {}", ex.getMessage());
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST, request, String.class);
            if (!StringUtils.hasText(response.getBody())) {
                log.warn("Gemini returned empty body");
                return null;
            }
            log.info("Gemini raw response: {}", truncateForLog(response.getBody(), 12000));
            return objectMapper.readTree(response.getBody());
        } catch (Exception ex) {
            log.warn("Gemini call failed: {}", ex.getMessage(), ex);
            return null;
        }
    }

    private String agentToolSelectorSystemPrompt() {
        return """
                Bạn là UniCall AI Assistant.
                Nhiệm vụ vòng chọn tool:
                - Đọc câu hỏi user và quyết định có cần gọi tool hay không.
                - Nếu KHÔNG cần tool (chào hỏi xã giao, hỏi khả năng AI, câu chung chung), trả lời trực tiếp bằng tiếng Việt.
                - Nếu CẦN tool, chỉ trả về 1 functionCall phù hợp nhất với mục tiêu chính của câu hỏi.
                - Không suy đoán dữ liệu không có.
                - Ưu tiên tool theo tên/task/conversation thay vì bắt user cung cấp ID.
                - Không trả lời dài dòng.
                """;
    }

    private String agentToolArgsSystemPrompt(ChatAssistantTool selectedTool) {
        String toolCode = selectedTool == null ? "" : selectedTool.getCode();
        return """
                Bạn là UniCall AI Assistant.
                Nhiệm vụ vòng sinh tham số:
                - Bạn PHẢI gọi đúng 1 function duy nhất đã được chỉ định ở lượt này.
                - Chỉ trả về functionCall, không trả lời text.
                - Trích xuất tham số từ câu hỏi hiện tại và lịch sử chat ngắn gần nhất.
                - Không bịa ID; nếu không có ID thì dùng trường hint theo tên (taskNameHint, groupNameHint, conversationNameHint, assigneeNameHints).
                - Với thao tác cập nhật/xóa/comment task: ưu tiên taskNameHint khi user cung cấp tên task.
                - Nếu thiếu dữ liệu bắt buộc thì vẫn gọi function với các trường hiện có để backend trả về thông báo thiếu gì.
                - Trả tham số đúng kiểu JSON (boolean/number/string/array).
                Tool bắt buộc: %s
                """.formatted(toolCode);
    }

    private ChatAssistantIntent inferIntentByTool(ChatAssistantTool tool) {
        if (tool == null) {
            return ChatAssistantIntent.UNKNOWN;
        }
        return switch (tool) {
            case CHAT_LIST_MY_CONVERSATIONS -> ChatAssistantIntent.LIST_CONVERSATIONS;
            case CHAT_GET_CONVERSATION_MESSAGES -> ChatAssistantIntent.LIST_MESSAGES;
            case CHAT_SEARCH_KEYWORD -> ChatAssistantIntent.SEARCH_KEYWORD;
            case CHAT_SEMANTIC_SEARCH_CONVERSATION -> ChatAssistantIntent.SEARCH_SEMANTIC;
            case CHAT_SEMANTIC_SEARCH_MY_SPACE -> ChatAssistantIntent.SEARCH_MY_CHAT_SPACE;
            case CHAT_FIND_WHO_SAID -> ChatAssistantIntent.FIND_WHO_SAID;
            case TASK_LIST_MY_GROUPS -> ChatAssistantIntent.TASK_LIST_GROUPS;
            case TASK_FIND_TASKS_BY_NAME -> ChatAssistantIntent.TASK_FIND_BY_NAME;
            case TASK_LIST_GROUP_TASKS -> ChatAssistantIntent.TASK_LIST_GROUP_ITEMS;
            case TASK_CREATE_TASK -> ChatAssistantIntent.TASK_CREATE;
            case TASK_UPDATE_TASK -> ChatAssistantIntent.TASK_UPDATE;
            case TASK_DELETE_TASK -> ChatAssistantIntent.TASK_DELETE;
            case TASK_GET_TASK_DETAIL -> ChatAssistantIntent.TASK_DETAIL;
            case TASK_ADD_TASK_COMMENT -> ChatAssistantIntent.TASK_COMMENT_CREATE;
            case TASK_LIST_TASK_COMMENTS -> ChatAssistantIntent.TASK_COMMENT_LIST;
            case TASK_LIST_MY_TASKS -> ChatAssistantIntent.TASK_LIST_MY_ITEMS;
            case TASK_LIST_MY_OVERDUE_TASKS -> ChatAssistantIntent.TASK_LIST_OVERDUE;
            case TASK_LIST_MY_DUE_SOON_TASKS -> ChatAssistantIntent.TASK_LIST_DUE_SOON;
        };
    }

    private String buildFallbackAnswer(String question, ChatAssistantIntent intent, Object data) {
        String taskHint = buildTaskFallbackAnswer(intent, data);
        if (StringUtils.hasText(taskHint)) {
            return taskHint;
        }
        String chatSummaryHint = buildChatSummaryFallbackAnswer(intent, data);
        if (StringUtils.hasText(chatSummaryHint)) {
            return chatSummaryHint;
        }
        if (data instanceof Map<?, ?> map && map.containsKey("hint")) {
            Object hint = map.get("hint");
            if (hint != null) {
                return hint.toString();
            }
        }
        if (intent == ChatAssistantIntent.UNKNOWN) {
            return "Mình chưa lấy được dữ liệu phù hợp để trả lời. Bạn thử diễn đạt rõ hơn ngữ cảnh hội thoại.";
        }
        return "Mình đã xử lý câu hỏi nhưng chưa tổng hợp được kết quả đầy đủ. Bạn thử lại sau.";
    }

    private Object handleDeleteTaskToolCall(
            String requesterId,
            String threadId,
            String question,
            Map<String, Object> args
    ) {
        TaskContext context = resolveRecentTaskContext(requesterId, threadId);
        String explicitTaskNameHint = firstNonBlank(
                readString(args, "taskNameHint"),
                readString(args, "taskTitleHint"),
                extractTaskNameHint(question)
        );
        String taskId = resolveTaskIdForAction(args, question, context, explicitTaskNameHint);
        String taskNameHint = firstNonBlank(explicitTaskNameHint, context.taskName());
        String groupId = firstNonBlank(readString(args, "groupId"), context.groupId());
        String groupNameHint = firstNonBlank(readString(args, "groupNameHint"), extractGroupNameHint(question), context.groupName());
        if (!StringUtils.hasText(taskId) && !StringUtils.hasText(taskNameHint)) {
            throw new InvalidParamException("Thiếu taskId hoặc tên task để xóa.");
        }
        return taskAssistantToolService.deleteTask(requesterId, taskId, taskNameHint, groupId, groupNameHint);
    }

    private String buildTaskFallbackAnswer(ChatAssistantIntent intent, Object data) {
        if (intent == null || data == null) {
            return null;
        }

        if (data instanceof Map<?, ?> map) {
            Object hint = map.get("hint");
            if (hint != null && StringUtils.hasText(String.valueOf(hint))) {
                return String.valueOf(hint);
            }
            Object error = map.get("error");
            if (error != null && StringUtils.hasText(String.valueOf(error))) {
                return String.valueOf(error);
            }
        }

        if (intent == ChatAssistantIntent.TASK_CREATE || intent == ChatAssistantIntent.TASK_UPDATE) {
            String title = readFieldAsString(data, "title");
            String groupName = readFieldAsString(data, "groupName");
            String columnName = readFieldAsString(data, "columnName");
            String priority = readFieldAsString(data, "priority");
            Boolean completed = readFieldAsBoolean(data, "completed");
            if (StringUtils.hasText(title)) {
                StringBuilder builder = new StringBuilder();
                builder.append("Đã ");
                builder.append(intent == ChatAssistantIntent.TASK_CREATE ? "tạo" : "cập nhật");
                builder.append(" task \"").append(title).append("\" thành công");
                if (StringUtils.hasText(groupName)) {
                    builder.append(" trong nhóm \"").append(groupName).append("\"");
                }
                if (StringUtils.hasText(columnName)) {
                    builder.append(", cột \"").append(columnName).append("\"");
                }
                if (StringUtils.hasText(priority)) {
                    builder.append(", ưu tiên ").append(priority);
                }
                if (completed != null) {
                    builder.append(", trạng thái ").append(completed ? "đã hoàn thành" : "chưa hoàn thành");
                }
                builder.append(".");
                return builder.toString();
            }
            return intent == ChatAssistantIntent.TASK_CREATE
                    ? "Đã tạo task thành công."
                    : "Đã cập nhật task thành công.";
        }

        if (intent == ChatAssistantIntent.TASK_DELETE) {
            String deletedTaskId = readFieldAsString(data, "taskId");
            if (StringUtils.hasText(deletedTaskId)) {
                return "Đã xóa task thành công (ID: " + deletedTaskId + ").";
            }
            return "Đã xóa task thành công.";
        }

        if (intent == ChatAssistantIntent.TASK_DETAIL) {
            String title = readFieldAsString(data, "title");
            String taskId = readFieldAsString(data, "taskId");
            String groupName = readFieldAsString(data, "groupName");
            String columnName = readFieldAsString(data, "columnName");
            String dueDate = readFieldAsString(data, "dueDate");
            String priority = readFieldAsString(data, "priority");
            if (StringUtils.hasText(title)) {
                return "Chi tiết task \"" + title + "\""
                        + (StringUtils.hasText(taskId) ? " (ID: " + taskId + ")" : "")
                        + (StringUtils.hasText(groupName) ? ", nhóm \"" + groupName + "\"" : "")
                        + (StringUtils.hasText(columnName) ? ", cột \"" + columnName + "\"" : "")
                        + (StringUtils.hasText(priority) ? ", ưu tiên " + priority : "")
                        + (StringUtils.hasText(dueDate) ? ", deadline " + dueDate : "")
                        + ".";
            }
            return "Đã lấy chi tiết task.";
        }

        if (intent == ChatAssistantIntent.TASK_COMMENT_CREATE) {
            String taskId = readFieldAsString(data, "taskId");
            String content = readFieldAsString(data, "content");
            if (StringUtils.hasText(taskId)) {
                return "Đã thêm comment vào task " + taskId
                        + (StringUtils.hasText(content) ? ": \"" + content + "\"." : ".");
            }
            return "Đã thêm comment vào task.";
        }

        if (!(data instanceof List<?> listData)) {
            return null;
        }

        if (intent == ChatAssistantIntent.TASK_COMMENT_LIST) {
            if (listData.isEmpty()) {
                return "Task này chưa có comment nào.";
            }
            StringBuilder builder = new StringBuilder("Đã lấy ")
                    .append(listData.size())
                    .append(" comment của task:\n\n");
            int index = 1;
            for (Object item : listData.stream().limit(20).toList()) {
                Map<String, Object> map = asMap(item);
                if (map.isEmpty()) {
                    continue;
                }
                String authorId = asString(map.get("authorId"));
                String createdAt = asString(map.get("createdAt"));
                String content = asString(map.get("content"));
                builder.append(index).append(". ");
                if (StringUtils.hasText(content)) {
                    builder.append(content);
                } else {
                    builder.append("(không có nội dung)");
                }
                if (StringUtils.hasText(authorId) || StringUtils.hasText(createdAt)) {
                    builder.append("  ");
                    if (StringUtils.hasText(authorId)) {
                        builder.append("`").append(authorId).append("`");
                    }
                    if (StringUtils.hasText(createdAt)) {
                        builder.append(" - ").append(createdAt);
                    }
                }
                builder.append("\n");
                index++;
            }
            return builder.toString().trim();
        }

        if (intent == ChatAssistantIntent.TASK_LIST_GROUPS) {
            if (listData.isEmpty()) {
                return "Bạn chưa có nhóm task nào.";
            }
            List<String> names = listData.stream()
                    .map(item -> {
                        if (item instanceof Map<?, ?> map) {
                            Object name = map.get("name");
                            return name == null ? null : String.valueOf(name);
                        }
                        return null;
                    })
                    .filter(StringUtils::hasText)
                    .limit(8)
                    .toList();
            if (names.isEmpty()) {
                return "Đã lấy danh sách nhóm task của bạn.";
            }
            return "Bạn đang có " + listData.size() + " nhóm task: " + String.join(", ", names) + ".";
        }

        if (intent == ChatAssistantIntent.TASK_FIND_BY_NAME) {
            if (listData.isEmpty()) {
                return "Không tìm thấy task theo tên bạn yêu cầu.";
            }
            return "Mình tìm thấy " + listData.size() + " task theo tên bạn yêu cầu.";
        }

        if (intent == ChatAssistantIntent.TASK_LIST_GROUP_ITEMS || intent == ChatAssistantIntent.TASK_LIST_MY_ITEMS) {
            if (listData.isEmpty()) {
                return "Không có task phù hợp.";
            }
            return "Đã lấy " + listData.size() + " task phù hợp cho bạn.";
        }

        if (intent == ChatAssistantIntent.TASK_LIST_OVERDUE) {
            if (listData.isEmpty()) {
                return "Hiện tại bạn không có task nào trễ hạn.";
            }
            return "Bạn có " + listData.size() + " task đang trễ hạn.";
        }

        if (intent == ChatAssistantIntent.TASK_LIST_DUE_SOON) {
            if (listData.isEmpty()) {
                return "Hiện tại chưa có task sắp đến hạn trong khoảng thời gian bạn hỏi.";
            }
            return "Bạn có " + listData.size() + " task sắp đến hạn.";
        }

        return null;
    }

    private String buildChatSummaryFallbackAnswer(ChatAssistantIntent intent, Object data) {
        if (intent != ChatAssistantIntent.SUMMARIZE_CONVERSATION) {
            return null;
        }
        Map<String, Object> map = asMap(data);
        if (map.isEmpty()) {
            return null;
        }
        String hint = asString(map.get("hint"));
        if (StringUtils.hasText(hint)) {
            return hint;
        }
        String conversationName = firstNonBlank(asString(map.get("conversationName")), "không tên");
        Integer days = null;
        Object daysObj = map.get("days");
        if (daysObj instanceof Number number) {
            days = number.intValue();
        } else if (daysObj != null) {
            try {
                days = Integer.parseInt(String.valueOf(daysObj));
            } catch (Exception ignored) {
                days = null;
            }
        }
        int total = 0;
        Object totalObj = map.get("totalMessagesInRange");
        if (totalObj instanceof Number number) {
            total = number.intValue();
        }
        StringBuilder builder = new StringBuilder();
        builder.append("Tóm tắt hội thoại");
        if (StringUtils.hasText(conversationName)) {
            builder.append(" \"").append(conversationName).append("\"");
        }
        if (days != null && days > 0) {
            builder.append(" trong ").append(days).append(" ngày gần đây");
        }
        builder.append(": ").append(total).append(" tin nhắn.\n\n");

        Object highlightsObj = map.get("highlights");
        if (highlightsObj instanceof List<?> highlights && !highlights.isEmpty()) {
            builder.append("Một số nội dung chính:\n");
            int index = 1;
            for (Object item : highlights.stream().limit(8).toList()) {
                Map<String, Object> entry = asMap(item);
                if (entry.isEmpty()) {
                    continue;
                }
                String senderName = firstNonBlank(asString(entry.get("senderName")), "Unknown");
                String content = firstNonBlank(asString(entry.get("content")), "(không có nội dung)");
                String time = asString(entry.get("timeSent"));
                builder.append(index).append(". ");
                builder.append(senderName).append(": ").append(content);
                if (StringUtils.hasText(time)) {
                    builder.append(" (").append(time).append(")");
                }
                builder.append("\n");
                index++;
            }
        }

        return builder.toString().trim();
    }

    private String readFieldAsString(Object data, String field) {
        if (!StringUtils.hasText(field) || data == null) {
            return null;
        }
        try {
            if (data instanceof Map<?, ?> map) {
                Object value = map.get(field);
                if (value == null) {
                    return null;
                }
                String text = String.valueOf(value).trim();
                return StringUtils.hasText(text) ? text : null;
            }
            Object value = objectMapper.convertValue(data, Map.class).get(field);
            if (value == null) {
                return null;
            }
            String text = String.valueOf(value).trim();
            return StringUtils.hasText(text) ? text : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private Boolean readFieldAsBoolean(Object data, String field) {
        if (!StringUtils.hasText(field) || data == null) {
            return null;
        }
        try {
            Object value;
            if (data instanceof Map<?, ?> map) {
                value = map.get(field);
            } else {
                value = objectMapper.convertValue(data, Map.class).get(field);
            }
            if (value == null) {
                return null;
            }
            if (value instanceof Boolean bool) {
                return bool;
            }
            String text = String.valueOf(value).trim();
            if (!StringUtils.hasText(text)) {
                return null;
            }
            if ("true".equalsIgnoreCase(text)) {
                return true;
            }
            if ("false".equalsIgnoreCase(text)) {
                return false;
            }
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private Map<String, Object> asMap(Object value) {
        if (value == null) {
            return Map.of();
        }
        if (value instanceof Map<?, ?> map) {
            return castToStringObjectMap(map);
        }
        try {
            return objectMapper.convertValue(value, Map.class);
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private ChatAssistantIntent inferIntentWithoutTool(String question, String answer) {
        String normalized = firstNonBlank(question, "").toLowerCase(Locale.ROOT);
        if (containsAny(
                normalized,
                "task",
                "cong viec",
                "công việc",
                "deadline",
                "comment",
                "nhom task",
                "nhóm task"
        )) {
            return ChatAssistantIntent.TASK_LIST_MY_ITEMS;
        }
        if (containsAny(
                normalized,
                "hello",
                "hi",
                "hey",
                "xin chao",
                "chao ban",
                "chao ai",
                "good morning",
                "good afternoon",
                "good evening"
        )) {
            return ChatAssistantIntent.SMALL_TALK;
        }
        if (containsAny(normalized, "ai assistant", "ban lam duoc gi", "co the lam gi", "tinh nang", "chuc nang")) {
            return ChatAssistantIntent.AI_CAPABILITIES;
        }
        String normalizedAnswer = firstNonBlank(answer, "").toLowerCase(Locale.ROOT);
        if (containsAny(normalizedAnswer, "co the ho tro", "tim kiem hoi thoai", "phan tich hoi thoai")) {
            return ChatAssistantIntent.AI_CAPABILITIES;
        }
        return ChatAssistantIntent.GENERAL_QA;
    }

    private ToolExecutionResult tryCorrectTaskActionAfterToolRun(
            String requesterId,
            String threadId,
            String question,
            List<ChatAssistantTool> toolsUsed
    ) {
        String normalized = firstNonBlank(question, "").toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }

        boolean wantsDelete = containsAny(normalized, "xóa task", "xoa task", "xoá task", "delete task", "remove task");
        boolean wantsUpdate = containsAny(normalized, "cập nhật", "cap nhat", "sửa", "sua", "gán", "gan", "deadline", "mô tả", "mo ta", "update task");
        boolean wantsTaskDetail = containsAny(normalized, "chi tiết task", "chi tiet task", "task detail", "mô tả task", "mo ta task");
        boolean wantsCommentAdd = containsAny(normalized, "comment vào task", "comment vao task", "thêm comment", "them comment");
        boolean wantsCommentList = containsAny(normalized, "list comment", "liệt kê comment", "liet ke comment", "comment của task", "comment cua task");
        boolean alreadyDidDelete = toolsUsed.stream().anyMatch(tool -> tool == ChatAssistantTool.TASK_DELETE_TASK);
        boolean alreadyDidUpdate = toolsUsed.stream().anyMatch(tool -> tool == ChatAssistantTool.TASK_UPDATE_TASK);
        boolean alreadyDidTaskDetail = toolsUsed.stream().anyMatch(tool -> tool == ChatAssistantTool.TASK_GET_TASK_DETAIL);
        boolean alreadyDidCommentAdd = toolsUsed.stream().anyMatch(tool -> tool == ChatAssistantTool.TASK_ADD_TASK_COMMENT);
        boolean alreadyDidCommentList = toolsUsed.stream().anyMatch(tool -> tool == ChatAssistantTool.TASK_LIST_TASK_COMMENTS);
        if ((wantsDelete && alreadyDidDelete)
                || (wantsUpdate && alreadyDidUpdate)
                || (wantsTaskDetail && alreadyDidTaskDetail)
                || (wantsCommentAdd && alreadyDidCommentAdd)
                || (wantsCommentList && alreadyDidCommentList)) {
            return null;
        }

        if (wantsDelete || wantsUpdate || wantsTaskDetail || wantsCommentAdd || wantsCommentList) {
            ToolExecutionResult fallback = tryRuleBasedTaskTool(requesterId, threadId, question);
            if (fallback == null || fallback.tool() == null) {
                return null;
            }
            if ((wantsDelete && fallback.tool() == ChatAssistantTool.TASK_DELETE_TASK)
                    || (wantsUpdate && fallback.tool() == ChatAssistantTool.TASK_UPDATE_TASK)
                    || (wantsTaskDetail && fallback.tool() == ChatAssistantTool.TASK_GET_TASK_DETAIL)
                    || (wantsCommentAdd && fallback.tool() == ChatAssistantTool.TASK_ADD_TASK_COMMENT)
                    || (wantsCommentList && fallback.tool() == ChatAssistantTool.TASK_LIST_TASK_COMMENTS)) {
                return fallback;
            }
        }
        return null;
    }

    private ChatAssistantIntent readIntentFromFallbackData(Object data) {
        if (!(data instanceof Map<?, ?> rawMap)) {
            return null;
        }
        Map<String, Object> map = castToStringObjectMap(rawMap);
        String intentRaw = asString(map.get("intent"));
        if (!StringUtils.hasText(intentRaw)) {
            return null;
        }
        try {
            return ChatAssistantIntent.valueOf(intentRaw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ignored) {
            return null;
        }
    }

    private ToolExecutionResult tryRuleBasedChatTool(String requesterId, String question) {
        String normalized = firstNonBlank(question, "").toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }

        boolean wantsSummary = containsAny(normalized, "tóm tắt", "tom tat", "tổng hợp", "tong hop");
        if (!wantsSummary) {
            return null;
        }

        String participantHint = extractParticipantNameHint(question);
        int days = extractDaysHint(question, 3);
        LocalDateTime since = LocalDateTime.now().minusDays(Math.max(1, days));

        List<ChatAssistantToolService.ConversationToolItem> conversations =
                chatAssistantToolService.listMyConversations(requesterId, 50);
        if (conversations.isEmpty()) {
            Map<String, Object> data = Map.of(
                    "intent", ChatAssistantIntent.SUMMARIZE_CONVERSATION.name(),
                    "hint", "Bạn chưa có hội thoại nào để tóm tắt."
            );
            return toolExecutionFromFallback(ChatAssistantTool.CHAT_LIST_MY_CONVERSATIONS, data);
        }

        List<ChatAssistantToolService.ConversationToolItem> matched = conversations;
        if (StringUtils.hasText(participantHint)) {
            String normalizedHint = normalize(participantHint);
            matched = conversations.stream()
                    .filter(conversation -> conversation.members() != null)
                    .filter(conversation -> conversation.members().stream()
                            .map(ChatAssistantToolService.ConversationMember::displayName)
                            .filter(StringUtils::hasText)
                            .map(this::normalize)
                            .anyMatch(name -> name.contains(normalizedHint) || normalizedHint.contains(name)))
                    .toList();
        }

        if (matched.isEmpty()) {
            String hint = StringUtils.hasText(participantHint)
                    ? "Không tìm thấy hội thoại với \"" + participantHint + "\"."
                    : "Không tìm thấy hội thoại phù hợp để tóm tắt.";
            Map<String, Object> data = Map.of(
                    "intent", ChatAssistantIntent.SUMMARIZE_CONVERSATION.name(),
                    "hint", hint
            );
            return toolExecutionFromFallback(ChatAssistantTool.CHAT_LIST_MY_CONVERSATIONS, data);
        }

        ChatAssistantToolService.ConversationToolItem picked = matched.stream()
                .sorted(Comparator.comparing(
                        ChatAssistantToolService.ConversationToolItem::lastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .findFirst()
                .orElse(matched.getFirst());

        ChatAssistantToolService.MessageToolPage page1 = chatAssistantToolService.getConversationMessages(
                requesterId,
                picked.conversationId(),
                1,
                100
        );

        List<ChatAssistantToolService.MessageToolItem> messages = new ArrayList<>();
        if (page1 != null && page1.items() != null) {
            messages.addAll(page1.items());
        }

        int totalPages = page1 == null ? 1 : Math.max(page1.totalPage(), 1);
        int maxExtraPages = Math.min(totalPages, 3);
        for (int page = 2; page <= maxExtraPages; page++) {
            ChatAssistantToolService.MessageToolPage pageData = chatAssistantToolService.getConversationMessages(
                    requesterId,
                    picked.conversationId(),
                    page,
                    100
            );
            if (pageData == null || pageData.items() == null || pageData.items().isEmpty()) {
                break;
            }
            messages.addAll(pageData.items());
        }

        List<ChatAssistantToolService.MessageToolItem> filtered = messages.stream()
                .filter(Objects::nonNull)
                .filter(message -> message.timeSent() != null)
                .filter(message -> !message.timeSent().isBefore(since))
                .toList();

        List<Map<String, Object>> highlights = filtered.stream()
                .sorted(Comparator.comparing(ChatAssistantToolService.MessageToolItem::timeSent))
                .limit(12)
                .map(message -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("senderName", firstNonBlank(message.senderName(), message.senderId(), "Unknown"));
                    item.put("content", firstNonBlank(message.content(), "(không có nội dung)"));
                    item.put("timeSent", message.timeSent().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
                    return item;
                })
                .toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("intent", ChatAssistantIntent.SUMMARIZE_CONVERSATION.name());
        data.put("conversationId", picked.conversationId());
        data.put("conversationName", picked.name());
        data.put("participantHint", participantHint);
        data.put("days", days);
        data.put("totalMessagesInRange", filtered.size());
        data.put("highlights", highlights);
        if (filtered.isEmpty()) {
            data.put("hint", "Không có tin nhắn nào trong " + days + " ngày gần đây để tóm tắt.");
        }

        return toolExecutionFromFallback(ChatAssistantTool.CHAT_GET_CONVERSATION_MESSAGES, data);
    }

    private ToolExecutionResult toolExecutionFromFallback(ChatAssistantTool tool, Object data) {
        if (tool == null) {
            return null;
        }
        Map<String, Object> functionResponse = new LinkedHashMap<>();
        functionResponse.put("tool", tool.getCode());
        functionResponse.put("success", true);
        functionResponse.put("data", data);
        return new ToolExecutionResult(data, tool, functionResponse);
    }

    private ToolExecutionResult tryRuleBasedTaskTool(String requesterId, String threadId, String question) {
        String normalized = firstNonBlank(question, "").toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }

        ChatAssistantTool pickedTool = null;
        Object data = null;
        TaskContext context = resolveRecentTaskContext(requesterId, threadId);
        String taskNameHint = extractTaskNameHint(question);
        String taskIdHint = extractTaskIdHint(question);

        try {
            if (containsAny(normalized, "comment vào task", "comment vao task", "thêm comment", "them comment")) {
                pickedTool = ChatAssistantTool.TASK_ADD_TASK_COMMENT;
                String resolvedTaskId = StringUtils.hasText(taskIdHint)
                        ? taskIdHint
                        : (StringUtils.hasText(taskNameHint) ? null : context.taskId());
                String resolvedTaskName = firstNonBlank(taskNameHint, context.taskName());
                String content = extractCommentContentHint(question);
                if (!StringUtils.hasText(resolvedTaskId) && !StringUtils.hasText(resolvedTaskName)) {
                    throw new InvalidParamException("Thiếu taskId hoặc tên task để thêm comment.");
                }
                if (!StringUtils.hasText(content)) {
                    throw new InvalidParamException("Thiếu nội dung comment.");
                }
                data = taskAssistantToolService.addTaskComment(
                        requesterId,
                        resolvedTaskId,
                        resolvedTaskName,
                        context.groupId(),
                        context.groupName(),
                        content
                );
            } else if (containsAny(normalized, "list comment", "liệt kê comment", "liet ke comment", "comment của task", "comment cua task")) {
                pickedTool = ChatAssistantTool.TASK_LIST_TASK_COMMENTS;
                String resolvedTaskId = StringUtils.hasText(taskIdHint)
                        ? taskIdHint
                        : (StringUtils.hasText(taskNameHint) ? null : context.taskId());
                String resolvedTaskName = firstNonBlank(taskNameHint, context.taskName());
                if (!StringUtils.hasText(resolvedTaskId) && !StringUtils.hasText(resolvedTaskName)) {
                    throw new InvalidParamException("Thiếu taskId hoặc tên task để lấy comment.");
                }
                data = taskAssistantToolService.listTaskComments(
                        requesterId,
                        resolvedTaskId,
                        resolvedTaskName,
                        context.groupId(),
                        context.groupName(),
                        DEFAULT_LIMIT
                );
            } else if (containsAny(normalized, "chi tiết task", "chi tiet task", "task detail", "mô tả task", "mo ta task")) {
                pickedTool = ChatAssistantTool.TASK_GET_TASK_DETAIL;
                String resolvedTaskId = StringUtils.hasText(taskIdHint)
                        ? taskIdHint
                        : (StringUtils.hasText(taskNameHint) ? null : context.taskId());
                String resolvedTaskName = firstNonBlank(taskNameHint, context.taskName());
                if (!StringUtils.hasText(resolvedTaskId) && !StringUtils.hasText(resolvedTaskName)) {
                    throw new InvalidParamException("Thiếu taskId hoặc tên task để lấy chi tiết.");
                }
                data = taskAssistantToolService.getTaskDetail(
                        requesterId,
                        resolvedTaskId,
                        resolvedTaskName,
                        context.groupId(),
                        context.groupName()
                );
            } else if (containsAny(normalized, "xóa task", "xoa task", "xoá task", "delete task", "remove task")) {
                pickedTool = ChatAssistantTool.TASK_DELETE_TASK;
                String resolvedTaskId = StringUtils.hasText(taskIdHint)
                        ? taskIdHint
                        : (StringUtils.hasText(taskNameHint) ? null : context.taskId());
                String resolvedTaskName = firstNonBlank(taskNameHint, context.taskName());
                if (!StringUtils.hasText(resolvedTaskId) && !StringUtils.hasText(resolvedTaskName)) {
                    throw new InvalidParamException("Thiếu taskId hoặc tên task để xóa.");
                }
                data = taskAssistantToolService.deleteTask(
                        requesterId,
                        resolvedTaskId,
                        resolvedTaskName,
                        context.groupId(),
                        context.groupName()
                );
            } else if (containsAny(normalized, "cập nhật", "cap nhat", "sửa", "sua", "gán", "gan", "deadline", "update task")) {
                pickedTool = ChatAssistantTool.TASK_UPDATE_TASK;
                String resolvedTaskId = StringUtils.hasText(taskIdHint)
                        ? taskIdHint
                        : (StringUtils.hasText(taskNameHint) ? null : context.taskId());
                String resolvedTaskName = firstNonBlank(taskNameHint, context.taskName());
                if (!StringUtils.hasText(resolvedTaskId) && !StringUtils.hasText(resolvedTaskName)) {
                    throw new InvalidParamException("Thiếu taskId hoặc tên task để cập nhật.");
                }
                String dueDate = extractDueDateHint(question);
                String startDate = extractStartDateHint(question);
                String description = extractDescriptionHint(question);
                String priority = extractPriorityHint(question);
                String columnNameHint = extractColumnNameHint(question);
                List<String> assigneeNameHints = extractAssigneeNameHints(question);
                Boolean completed = extractCompletedHint(question);
                boolean hasUpdateFields = StringUtils.hasText(dueDate)
                        || StringUtils.hasText(startDate)
                        || StringUtils.hasText(description)
                        || StringUtils.hasText(priority)
                        || StringUtils.hasText(columnNameHint)
                        || !assigneeNameHints.isEmpty()
                        || completed != null;
                if (!hasUpdateFields) {
                    throw new InvalidParamException("Thiếu dữ liệu cập nhật. Cần ít nhất một trường như assignee, deadline, mô tả, ưu tiên, trạng thái hoặc cột.");
                }
                data = taskAssistantToolService.updateTask(
                        requesterId,
                        resolvedTaskId,
                        resolvedTaskName,
                        null,
                        description,
                        null,
                        context.groupId(),
                        context.groupName(),
                        columnNameHint,
                        List.of(),
                        assigneeNameHints,
                        startDate,
                        dueDate,
                        priority,
                        completed
                );
            } else if (containsAny(normalized, "cập nhật", "cap nhat", "sửa", "sua", "gán", "gan", "deadline")
                    && StringUtils.hasText(taskNameHint)) {
                pickedTool = ChatAssistantTool.TASK_FIND_TASKS_BY_NAME;
                data = taskAssistantToolService.findTasksByName(requesterId, taskNameHint, null, null, DEFAULT_LIMIT);
            } else if (containsAny(normalized, "trễ hạn", "tre han", "quá hạn", "qua han", "overdue")) {
                pickedTool = ChatAssistantTool.TASK_LIST_MY_OVERDUE_TASKS;
                data = taskAssistantToolService.listMyOverdueTasks(requesterId, false, DEFAULT_LIMIT);
            } else if (containsAny(normalized, "sắp đến hạn", "sap den han", "gần deadline", "gan deadline", "due soon")) {
                pickedTool = ChatAssistantTool.TASK_LIST_MY_DUE_SOON_TASKS;
                data = taskAssistantToolService.listMyDueSoonTasks(requesterId, 3, false, DEFAULT_LIMIT);
            } else if (containsAny(normalized, "nhóm task", "nhom task", "task group", "group task")) {
                pickedTool = ChatAssistantTool.TASK_LIST_MY_GROUPS;
                data = taskAssistantToolService.listMyTaskGroups(requesterId, DEFAULT_LIMIT);
            } else if (containsAny(normalized, "task của tôi", "task cua toi", "công việc của tôi", "cong viec cua toi", "my tasks")) {
                pickedTool = ChatAssistantTool.TASK_LIST_MY_TASKS;
                data = taskAssistantToolService.listMyTasks(requesterId, false, DEFAULT_LIMIT);
            }
        } catch (Exception ex) {
            log.warn("Rule-based task fallback failed: question={}, message={}", question, ex.getMessage(), ex);
            if (pickedTool == null) {
                if (containsAny(normalized, "comment vào task", "comment vao task", "thêm comment", "them comment")) {
                    pickedTool = ChatAssistantTool.TASK_ADD_TASK_COMMENT;
                } else if (containsAny(normalized, "list comment", "liệt kê comment", "liet ke comment", "comment của task", "comment cua task")) {
                    pickedTool = ChatAssistantTool.TASK_LIST_TASK_COMMENTS;
                } else if (containsAny(normalized, "chi tiết task", "chi tiet task", "task detail", "mô tả task", "mo ta task")) {
                    pickedTool = ChatAssistantTool.TASK_GET_TASK_DETAIL;
                } else if (containsAny(normalized, "xóa task", "xoa task", "xoá task", "delete task", "remove task")) {
                    pickedTool = ChatAssistantTool.TASK_DELETE_TASK;
                } else if (containsAny(normalized, "cập nhật", "cap nhat", "sửa", "sua", "gán", "gan", "deadline", "update task")) {
                    pickedTool = ChatAssistantTool.TASK_UPDATE_TASK;
                }
            }
            data = Map.of("hint", firstNonBlank(ex.getMessage(), "Không thể truy vấn task lúc này"));
        }

        if (pickedTool == null) {
            return null;
        }

        Map<String, Object> functionResponse = new LinkedHashMap<>();
        functionResponse.put("tool", pickedTool.getCode());
        functionResponse.put("success", true);
        functionResponse.put("data", data);
        return new ToolExecutionResult(data, pickedTool, functionResponse);
    }

    private String extractTaskNameHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String trimmed = question.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);

        Matcher quotedAfterTask = Pattern.compile("(?i)\\btask\\s*[\"']([^\"']+)[\"']").matcher(trimmed);
        if (quotedAfterTask.find()) {
            String value = quotedAfterTask.group(1);
            return StringUtils.hasText(value) ? value.trim() : null;
        }

        int taskIdx = lower.indexOf("task ");
        if (taskIdx >= 0) {
            String afterTask = trimmed.substring(taskIdx + 5).trim();
            if (StringUtils.hasText(afterTask)) {
                String[] stopTokens = new String[]{
                        " hãy ", " hay ", " gán ", " gan ", " deadline ", " mô tả ", " mo ta ",
                        " trong nhóm ", " trong nhom ", " của nhóm ", " cua nhom ", " của group ", " cua group ",
                        " là ", " la ", ","
                };
                String candidate = afterTask;
                String candidateLower = candidate.toLowerCase(Locale.ROOT);
                int cutIndex = -1;
                for (String stop : stopTokens) {
                    int stopIdx = candidateLower.indexOf(stop);
                    if (stopIdx > 0 && (cutIndex < 0 || stopIdx < cutIndex)) {
                        cutIndex = stopIdx;
                    }
                }
                if (cutIndex > 0) {
                    candidate = candidate.substring(0, cutIndex).trim();
                }
                return StringUtils.hasText(candidate) ? candidate : null;
            }
        }
        return null;
    }

    private String extractTaskIdHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        Matcher matcher = TASK_ID_PATTERN.matcher(question);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }

    private String extractGroupNameHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String value = extractBetweenAfterKeyword(question, "nhóm");
        if (StringUtils.hasText(value)) {
            return value;
        }
        return extractBetweenAfterKeyword(question, "group");
    }

    private String extractColumnNameHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String value = extractBetweenAfterKeyword(question, "cột");
        if (StringUtils.hasText(value)) {
            return value;
        }
        return extractBetweenAfterKeyword(question, "column");
    }

    private String extractDescriptionHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        int idx = normalized.indexOf("mô tả là");
        if (idx < 0) {
            idx = normalized.indexOf("mo ta la");
        }
        if (idx < 0) {
            return null;
        }
        String remainder = question.substring(idx).trim();
        String quoted = extractQuotedText(remainder);
        return StringUtils.hasText(quoted) ? quoted : null;
    }

    private String extractCommentContentHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String taskNameHint = extractTaskNameHint(question);
        String taskIdHint = extractTaskIdHint(question);

        List<String> quotedValues = extractAllQuotedTexts(question);
        for (int i = quotedValues.size() - 1; i >= 0; i--) {
            String value = quotedValues.get(i);
            if (!StringUtils.hasText(value)) {
                continue;
            }
            String normalized = value.trim();
            if (StringUtils.hasText(taskNameHint) && normalized.equalsIgnoreCase(taskNameHint.trim())) {
                continue;
            }
            if (StringUtils.hasText(taskIdHint) && normalized.equalsIgnoreCase(taskIdHint.trim())) {
                continue;
            }
            return normalized;
        }

        String normalized = question.toLowerCase(Locale.ROOT);
        int idx = normalized.lastIndexOf(" là ");
        if (idx < 0) {
            idx = normalized.lastIndexOf(" la ");
        }
        if (idx > 0 && idx + 4 < question.length()) {
            String content = question.substring(idx + 4).trim();
            if (StringUtils.hasText(content)) {
                return trimWrappingQuotes(content);
            }
        }

        idx = normalized.indexOf("comment");
        if (idx < 0) {
            return null;
        }
        String remainder = question.substring(idx);
        int separators = remainder.indexOf(":");
        if (separators >= 0 && separators + 1 < remainder.length()) {
            String content = remainder.substring(separators + 1).trim();
            if (StringUtils.hasText(content)) {
                String trimmedContent = trimWrappingQuotes(content);
                if (StringUtils.hasText(trimmedContent) && !trimmedContent.toLowerCase(Locale.ROOT).startsWith("id")) {
                    return trimmedContent;
                }
            }
        }
        return null;
    }

    private String extractDueDateHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        if (!containsAny(normalized, "deadline", "đến ngày", "den ngay", "due")) {
            return null;
        }
        Matcher matcher = DATE_PATTERN.matcher(question);
        return matcher.find() ? matcher.group() : null;
    }

    private String extractStartDateHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        if (!containsAny(normalized, "bắt đầu", "bat dau", "start")) {
            return null;
        }
        Matcher matcher = DATE_PATTERN.matcher(question);
        return matcher.find() ? matcher.group() : null;
    }

    private String extractPriorityHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String normalized = question.toUpperCase(Locale.ROOT);
        if (normalized.contains("URGENT")) {
            return "URGENT";
        }
        if (normalized.contains("HIGH")) {
            return "HIGH";
        }
        if (normalized.contains("MEDIUM")) {
            return "MEDIUM";
        }
        if (normalized.contains("LOW")) {
            return "LOW";
        }
        return null;
    }

    private String extractParticipantNameHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        String[] patterns = new String[]{
                "giữa tôi và",
                "giua toi va",
                "với",
                "voi",
                "with"
        };
        int idx = -1;
        int patternLen = 0;
        for (String pattern : patterns) {
            int found = normalized.indexOf(pattern);
            if (found >= 0) {
                idx = found;
                patternLen = pattern.length();
                break;
            }
        }
        if (idx < 0) {
            return null;
        }
        String remainder = question.substring(idx + patternLen).trim();
        if (!StringUtils.hasText(remainder)) {
            return null;
        }
        String lower = remainder.toLowerCase(Locale.ROOT);
        int cut = -1;
        for (String stop : new String[]{" trong vòng", " trong vong", " trong ", " thời gian", " thoi gian", " 3 ngày", " 7 ngày", ","}) {
            int stopIdx = lower.indexOf(stop);
            if (stopIdx > 0 && (cut < 0 || stopIdx < cut)) {
                cut = stopIdx;
            }
        }
        String candidate = cut > 0 ? remainder.substring(0, cut).trim() : remainder.trim();
        String quoted = extractQuotedText(candidate);
        if (StringUtils.hasText(quoted)) {
            candidate = quoted;
        }
        return StringUtils.hasText(candidate) ? trimWrappingQuotes(candidate) : null;
    }

    private int extractDaysHint(String question, int fallback) {
        if (!StringUtils.hasText(question)) {
            return fallback;
        }
        Matcher matcher = Pattern.compile("(?i)(\\d{1,3})\\s*(ngày|ngay|day|days)").matcher(question);
        if (matcher.find()) {
            try {
                int value = Integer.parseInt(matcher.group(1));
                if (value > 0) {
                    return value;
                }
            } catch (Exception ignored) {
                return fallback;
            }
        }
        if (containsAny(question.toLowerCase(Locale.ROOT), "hôm nay", "hom nay", "today")) {
            return 1;
        }
        return fallback;
    }

    private List<String> extractAssigneeNameHints(String question) {
        if (!StringUtils.hasText(question)) {
            return List.of();
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        int idx = normalized.indexOf("gán cho user");
        if (idx < 0) {
            idx = normalized.indexOf("gan cho user");
        }
        if (idx < 0) {
            idx = normalized.indexOf("assign cho");
        }
        if (idx < 0) {
            idx = normalized.indexOf("assign to");
        }
        if (idx < 0) {
            return List.of();
        }

        String remainder = question.substring(idx).trim();
        String afterUser = remainder.replaceFirst("(?i).*?(gán cho user|gan cho user|assign cho|assign to)", "").trim();
        if (!StringUtils.hasText(afterUser)) {
            return List.of();
        }
        String lower = afterUser.toLowerCase(Locale.ROOT);
        int cut = -1;
        for (String stop : new String[]{" deadline", " đến ngày", " den ngay", " mô tả", " mo ta", " ưu tiên ", " uu tien ", " cột ", " cot ", ","}) {
            int stopIdx = lower.indexOf(stop);
            if (stopIdx > 0 && (cut < 0 || stopIdx < cut)) {
                cut = stopIdx;
            }
        }
        String name = cut > 0 ? afterUser.substring(0, cut).trim() : afterUser.trim();
        if ((name.startsWith("\"") && name.endsWith("\"")) || (name.startsWith("'") && name.endsWith("'"))) {
            name = name.substring(1, name.length() - 1).trim();
        }

        if (!StringUtils.hasText(name)) {
            return List.of();
        }
        return List.of(name);
    }

    private Boolean extractCompletedHint(String question) {
        if (!StringUtils.hasText(question)) {
            return null;
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        if (containsAny(
                normalized,
                "chưa hoàn thành",
                "chua hoan thanh",
                "bỏ hoàn thành",
                "bo hoan thanh",
                "bỏ đánh dấu hoàn thành",
                "bo danh dau hoan thanh",
                "đánh dấu chưa hoàn thành",
                "danh dau chua hoan thanh",
                "uncomplete",
                "mark incomplete",
                "not completed",
                "reopen"
        )) {
            return false;
        }
        if (containsAny(normalized, "hoàn thành", "hoan thanh", "mark complete", "đánh dấu hoàn thành", "danh dau hoan thanh")) {
            return true;
        }
        return null;
    }

    private List<String> mergeDistinct(List<String> first, List<String> second) {
        List<String> merged = new ArrayList<>();
        if (first != null) {
            merged.addAll(first);
        }
        if (second != null) {
            merged.addAll(second);
        }
        return merged.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private String extractBetweenAfterKeyword(String question, String keyword) {
        if (!StringUtils.hasText(question) || !StringUtils.hasText(keyword)) {
            return null;
        }
        String normalized = question.toLowerCase(Locale.ROOT);
        int idx = normalized.indexOf(keyword.toLowerCase(Locale.ROOT));
        if (idx < 0) {
            return null;
        }
        String remainder = question.substring(idx + keyword.length()).trim();
        String quoted = extractQuotedText(remainder);
        if (StringUtils.hasText(quoted)) {
            return quoted;
        }
        if (!StringUtils.hasText(remainder)) {
            return null;
        }
        String lower = remainder.toLowerCase(Locale.ROOT);
        int cut = -1;
        for (String stop : new String[]{" ,", ",", " hãy ", " hay ", " và ", " va ", " deadline ", " ưu tiên ", " uu tien ", " mô tả ", " mo ta ", " là ", " la "}) {
            int stopIdx = lower.indexOf(stop);
            if (stopIdx > 0 && (cut < 0 || stopIdx < cut)) {
                cut = stopIdx;
            }
        }
        String value = cut > 0 ? remainder.substring(0, cut).trim() : remainder.trim();
        return StringUtils.hasText(value) ? value : null;
    }

    private String extractQuotedText(String text) {
        if (!StringUtils.hasText(text)) {
            return null;
        }
        int doubleStart = text.indexOf('"');
        if (doubleStart >= 0) {
            int doubleEnd = text.indexOf('"', doubleStart + 1);
            if (doubleEnd > doubleStart + 1) {
                return text.substring(doubleStart + 1, doubleEnd).trim();
            }
        }
        int singleStart = text.indexOf('\'');
        if (singleStart >= 0) {
            int singleEnd = text.indexOf('\'', singleStart + 1);
            if (singleEnd > singleStart + 1) {
                return text.substring(singleStart + 1, singleEnd).trim();
            }
        }
        return null;
    }

    private List<String> extractAllQuotedTexts(String text) {
        if (!StringUtils.hasText(text)) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        Matcher matcher = Pattern.compile("[\"']([^\"']+)[\"']").matcher(text);
        while (matcher.find()) {
            String value = matcher.group(1);
            if (StringUtils.hasText(value)) {
                values.add(value.trim());
            }
        }
        return values;
    }

    private String trimWrappingQuotes(String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        String result = value.trim();
        if ((result.startsWith("\"") && result.endsWith("\"")) || (result.startsWith("'") && result.endsWith("'"))) {
            return result.substring(1, result.length() - 1).trim();
        }
        return result;
    }

    private TaskContext resolveRecentTaskContext(String requesterId, String threadId) {
        try {
            var page = assistantChatHistoryService.listMessages(requesterId, threadId, 1, 12);
            for (AssistantThreadMessageResponse message : page.getItems()) {
                if (message == null || message.getData() == null) {
                    continue;
                }
                TaskContext context = extractTaskContextFromData(message.getData());
                if (context != null && (StringUtils.hasText(context.taskId()) || StringUtils.hasText(context.taskName()))) {
                    return context;
                }
            }
        } catch (Exception ex) {
            log.debug("Resolve recent task context failed: {}", ex.getMessage());
        }
        return new TaskContext(null, null, null, null);
    }

    private TaskContext extractTaskContextFromData(Object data) {
        if (data instanceof Map<?, ?> map) {
            return toTaskContextFromMap(castToStringObjectMap(map));
        }
        if (data instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> mapItem) {
                    TaskContext context = toTaskContextFromMap(castToStringObjectMap(mapItem));
                    if (context != null && (StringUtils.hasText(context.taskId()) || StringUtils.hasText(context.taskName()))) {
                        return context;
                    }
                }
            }
            return null;
        }
        try {
            Map<String, Object> parsed = objectMapper.convertValue(data, Map.class);
            return toTaskContextFromMap(parsed);
        } catch (Exception ignored) {
            return null;
        }
    }

    private TaskContext toTaskContextFromMap(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return null;
        }
        String taskId = asString(map.get("taskId"));
        String taskName = firstNonBlank(asString(map.get("title")), asString(map.get("taskName")));
        String groupId = asString(map.get("groupId"));
        String groupName = firstNonBlank(asString(map.get("groupName")), asString(map.get("groupNameHint")));
        if (!StringUtils.hasText(taskId) && !StringUtils.hasText(taskName)) {
            return null;
        }
        return new TaskContext(taskId, taskName, groupId, groupName);
    }

    private void appendHistoryContents(List<Map<String, Object>> contents, String requesterId, String threadId) {
        var historyPage = assistantChatHistoryService.listMessages(requesterId, threadId, 1, HISTORY_LIMIT);
        List<AssistantThreadMessageResponse> history = new ArrayList<>(historyPage.getItems());
        Collections.reverse(history);
        for (AssistantThreadMessageResponse item : history) {
            if (item == null || !StringUtils.hasText(item.getContent())) {
                continue;
            }
            if (isConfigFallbackMessage(item.getContent())) {
                continue;
            }
            String role = item.getRole() == null || item.getRole().name().equals("USER") ? "user" : "model";
            contents.add(contentWithText(role, item.getContent()));
        }
    }

    private FunctionCallRequest extractFunctionCall(JsonNode modelContent) {
        JsonNode parts = modelContent.path("parts");
        if (!parts.isArray()) {
            return null;
        }
        for (JsonNode part : parts) {
            JsonNode functionCall = part.path("functionCall");
            if (!functionCall.isObject()) {
                continue;
            }
            String name = textValue(functionCall, "name");
            if (!StringUtils.hasText(name)) {
                continue;
            }
            Map<String, Object> args = new LinkedHashMap<>();
            JsonNode argsNode = functionCall.path("args");
            if (argsNode.isObject()) {
                argsNode.fields().forEachRemaining(entry -> {
                    JsonNode value = entry.getValue();
                    args.put(entry.getKey(), value == null || value.isNull() ? null : objectMapper.convertValue(value, Object.class));
                });
            }
            return new FunctionCallRequest(name, args);
        }
        return null;
    }

    private JsonNode firstCandidate(JsonNode response) {
        JsonNode candidates = response.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            return null;
        }
        return candidates.get(0);
    }

    private String extractTextFromContent(JsonNode content) {
        JsonNode parts = content.path("parts");
        if (!parts.isArray()) {
            return null;
        }
        for (JsonNode part : parts) {
            String text = textValue(part, "text");
            if (StringUtils.hasText(text)) {
                return text;
            }
        }
        return null;
    }

    private Map<String, Object> contentWithText(String role, String text) {
        return Map.of(
                "role", role,
                "parts", List.of(Map.of("text", text))
        );
    }

    private Map<String, Object> contentWithFunctionResponse(String functionName, ToolExecutionResult toolExecution) {
        return Map.of(
                "role", "user",
                "parts", List.of(Map.of(
                        "functionResponse", Map.of(
                                "name", functionName,
                                "response", toolExecution.functionResponse()
                        )
                ))
        );
    }

    private Map<String, Object> modelContentToMap(JsonNode modelContent) {
        return objectMapper.convertValue(modelContent, Map.class);
    }

    private ChatAssistantTool parseTool(String rawName) {
        if (!StringUtils.hasText(rawName)) {
            return null;
        }
        String normalized = rawName.trim();
        for (ChatAssistantTool tool : ChatAssistantTool.values()) {
            if (tool.getCode().equalsIgnoreCase(normalized)
                    || tool.name().equalsIgnoreCase(normalized)) {
                return tool;
            }
        }
        return null;
    }

    private String resolveConversationId(String requesterId, Map<String, Object> arguments) {
        String conversationId = readString(arguments, "conversationId");
        if (StringUtils.hasText(conversationId)) {
            return conversationId;
        }

        List<ChatAssistantToolService.ConversationToolItem> conversations =
                chatAssistantToolService.listMyConversations(requesterId, 20);
        if (conversations.isEmpty()) {
            return null;
        }

        String hint = readString(arguments, "conversationNameHint");
        if (!StringUtils.hasText(hint)) {
            return conversations.getFirst().conversationId();
        }
        String normalizedHint = hint.toLowerCase(Locale.ROOT);
        List<ChatAssistantToolService.ConversationToolItem> matched = conversations.stream()
                .filter(conversation -> StringUtils.hasText(conversation.name()))
                .filter(conversation -> conversation.name().toLowerCase(Locale.ROOT).contains(normalizedHint))
                .toList();
        if (matched.isEmpty()) {
            return conversations.getFirst().conversationId();
        }
        if (matched.size() > 2) {
            String options = matched.stream()
                    .map(ChatAssistantToolService.ConversationToolItem::name)
                    .filter(StringUtils::hasText)
                    .distinct()
                    .limit(8)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("nhiều hội thoại");
            throw new InvalidParamException("Có " + matched.size() + " hội thoại khớp \"" + hint + "\". Bạn xác nhận rõ tên hội thoại: " + options);
        }
        return matched.getFirst().conversationId();
    }

    private String resolveTaskIdForAction(
            Map<String, Object> args,
            String question,
            TaskContext context,
            String explicitTaskNameHint
    ) {
        String taskIdInQuestion = extractTaskIdHint(question);
        if (StringUtils.hasText(taskIdInQuestion)) {
            return taskIdInQuestion;
        }
        // If user explicitly gives task name, prefer resolving by name to avoid stale context taskId.
        if (StringUtils.hasText(explicitTaskNameHint)) {
            return null;
        }
        return firstNonBlank(readString(args, "taskId"), context == null ? null : context.taskId());
    }

    private String readString(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) {
            return null;
        }
        String value = String.valueOf(map.get(key)).trim();
        return StringUtils.hasText(value) ? value : null;
    }

    private int readInt(Map<String, Object> map, String key, int fallback) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) {
            return fallback;
        }
        Object value = map.get(key);
        if (value instanceof Number number) {
            int n = number.intValue();
            return n > 0 ? n : fallback;
        }
        try {
            int n = Integer.parseInt(String.valueOf(value).trim());
            return n > 0 ? n : fallback;
        } catch (Exception ex) {
            return fallback;
        }
    }

    private Boolean readBoolean(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) {
            return null;
        }
        Object value = map.get(key);
        if (value instanceof Boolean bool) {
            return bool;
        }
        String text = String.valueOf(value).trim();
        if (!StringUtils.hasText(text)) {
            return null;
        }
        if ("true".equalsIgnoreCase(text)) {
            return true;
        }
        if ("false".equalsIgnoreCase(text)) {
            return false;
        }
        return null;
    }

    private List<String> readStringList(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) {
            return List.of();
        }
        Object value = map.get(key);
        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .toList();
        }
        String raw = String.valueOf(value).trim();
        if (!StringUtils.hasText(raw)) {
            return List.of();
        }
        return List.of(raw.split(",")).stream()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toList();
    }

    private List<String> readStringListWithAliases(Map<String, Object> map, String... keys) {
        if (keys == null || keys.length == 0) {
            return List.of();
        }
        List<String> merged = new ArrayList<>();
        for (String key : keys) {
            merged.addAll(readStringList(map, key));
        }
        return merged.stream()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private Map<String, Object> castToStringObjectMap(Map<?, ?> source) {
        Map<String, Object> result = new LinkedHashMap<>();
        if (source == null) {
            return result;
        }
        source.forEach((key, value) -> {
            if (key != null) {
                result.put(String.valueOf(key), value);
            }
        });
        return result;
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return StringUtils.hasText(text) ? text : null;
    }

    private String firstNonBlank(String... values) {
        if (values == null || values.length == 0) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private String textValue(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return null;
        }
        String value = node.get(field).asText(null);
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String normalize(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }

    private String truncateForLog(String value, int max) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        int limit = Math.max(256, max);
        if (value.length() <= limit) {
            return value;
        }
        return value.substring(0, limit) + "...(truncated " + (value.length() - limit) + " chars)";
    }

    private boolean containsAny(String source, String... tokens) {
        if (!StringUtils.hasText(source) || tokens == null) {
            return false;
        }
        for (String token : tokens) {
            if (StringUtils.hasText(token) && source.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private boolean isConfigFallbackMessage(String text) {
        if (!StringUtils.hasText(text)) {
            return false;
        }
        return CONFIG_MISSING_FALLBACK.equalsIgnoreCase(text.trim());
    }

    private boolean isAiReady() {
        return StringUtils.hasText(aiAssistantProperties.getApiKey())
                && StringUtils.hasText(aiAssistantProperties.getTextModel());
    }

    private record ToolExecutionResult(
            Object data,
            ChatAssistantTool tool,
            Map<String, Object> functionResponse
    ) {
    }

    private record FunctionCallRequest(
            String name,
            Map<String, Object> arguments
    ) {
    }

    private record AgentRunResult(
            String answer,
            ChatAssistantIntent intent,
            List<ChatAssistantTool> toolsUsed,
            Object lastToolData,
            int toolLoopSteps
    ) {
    }

    private record TaskContext(
            String taskId,
            String taskName,
            String groupId,
            String groupName
    ) {
    }
}
