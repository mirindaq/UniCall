package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.dtos.response.AssistantThreadMessageResponse;
import iuh.fit.chat_service.dtos.response.AssistantThreadResponse;
import iuh.fit.chat_service.entities.AiAssistantMessage;
import iuh.fit.chat_service.entities.AiAssistantThread;
import iuh.fit.chat_service.enums.AssistantMessageRole;
import iuh.fit.chat_service.enums.ChatAssistantIntent;
import iuh.fit.chat_service.enums.ChatAssistantTool;
import iuh.fit.chat_service.repositories.AiAssistantMessageRepository;
import iuh.fit.chat_service.repositories.AiAssistantThreadRepository;
import iuh.fit.chat_service.services.AssistantChatHistoryService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssistantChatHistoryServiceImpl implements AssistantChatHistoryService {

    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 200;

    private final AiAssistantThreadRepository threadRepository;
    private final AiAssistantMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    @Override
    public AiAssistantThread getOrCreateDefaultThread(String ownerUserId) {
        String normalizedUserId = requireUser(ownerUserId);
        return threadRepository.findFirstByOwnerUserIdOrderByUpdatedAtDesc(normalizedUserId)
                .orElseGet(() -> createDefaultThread(normalizedUserId));
    }

    @Override
    public AssistantThreadResponse getDefaultThreadInfo(String ownerUserId) {
        return toThreadResponse(getOrCreateDefaultThread(ownerUserId));
    }

    @Override
    public void saveUserMessage(String ownerUserId, String threadId, String content) {
        if (!StringUtils.hasText(content)) {
            return;
        }
        saveMessage(ownerUserId, threadId, AssistantMessageRole.USER, content.trim(), null, List.of(), null);
    }

    @Override
    public void saveAssistantMessage(
            String ownerUserId,
            String threadId,
            String content,
            ChatAssistantIntent intent,
            List<ChatAssistantTool> toolsUsed,
            Object data
    ) {
        saveMessage(
                ownerUserId,
                threadId,
                AssistantMessageRole.ASSISTANT,
                StringUtils.hasText(content) ? content.trim() : "",
                intent,
                toolsUsed == null ? List.of() : toolsUsed,
                safeToJson(data)
        );
    }

    @Override
    public PageResponse<AssistantThreadMessageResponse> listMessages(
            String ownerUserId,
            String threadId,
            Integer page,
            Integer limit
    ) {
        String normalizedUserId = requireUser(ownerUserId);
        AiAssistantThread thread = StringUtils.hasText(threadId)
                ? requireOwnedThread(normalizedUserId, threadId.trim())
                : getOrCreateDefaultThread(normalizedUserId);

        int resolvedPage = resolvePage(page);
        int resolvedLimit = resolveLimit(limit);
        Page<AiAssistantMessage> result = messageRepository.findByOwnerUserIdAndThreadIdOrderByCreatedAtDesc(
                normalizedUserId,
                thread.getId(),
                PageRequest.of(resolvedPage - 1, resolvedLimit)
        );

        List<AssistantThreadMessageResponse> items = result.getContent().stream()
                .map(this::toMessageResponse)
                .toList();
        return PageResponse.<AssistantThreadMessageResponse>builder()
                .items(items)
                .page(resolvedPage)
                .totalPage(result.getTotalPages())
                .limit(resolvedLimit)
                .totalItem(result.getTotalElements())
                .build();
    }

    @Override
    public PendingAction getPendingAction(String ownerUserId, String threadId) {
        String normalizedUserId = requireUser(ownerUserId);
        AiAssistantThread thread = StringUtils.hasText(threadId)
                ? requireOwnedThread(normalizedUserId, threadId.trim())
                : getOrCreateDefaultThread(normalizedUserId);
        if (!StringUtils.hasText(thread.getPendingActionType())) {
            return null;
        }
        return new PendingAction(
                thread.getPendingActionType(),
                parseJson(thread.getPendingActionPayloadJson())
        );
    }

    @Override
    public void setPendingAction(String ownerUserId, String threadId, String actionType, Object payload) {
        String normalizedUserId = requireUser(ownerUserId);
        AiAssistantThread thread = StringUtils.hasText(threadId)
                ? requireOwnedThread(normalizedUserId, threadId.trim())
                : getOrCreateDefaultThread(normalizedUserId);
        thread.setPendingActionType(StringUtils.hasText(actionType) ? actionType.trim() : null);
        thread.setPendingActionPayloadJson(safeToJson(payload));
        thread.setPendingActionCreatedAt(LocalDateTime.now());
        thread.setUpdatedAt(LocalDateTime.now());
        threadRepository.save(thread);
    }

    @Override
    public void clearPendingAction(String ownerUserId, String threadId) {
        String normalizedUserId = requireUser(ownerUserId);
        AiAssistantThread thread = StringUtils.hasText(threadId)
                ? requireOwnedThread(normalizedUserId, threadId.trim())
                : getOrCreateDefaultThread(normalizedUserId);
        thread.setPendingActionType(null);
        thread.setPendingActionPayloadJson(null);
        thread.setPendingActionCreatedAt(null);
        thread.setUpdatedAt(LocalDateTime.now());
        threadRepository.save(thread);
    }

    private void saveMessage(
            String ownerUserId,
            String threadId,
            AssistantMessageRole role,
            String content,
            ChatAssistantIntent intent,
            List<ChatAssistantTool> toolsUsed,
            String toolDataJson
    ) {
        String normalizedUserId = requireUser(ownerUserId);
        AiAssistantThread thread = resolveThreadForWrite(normalizedUserId, threadId);
        LocalDateTime now = LocalDateTime.now();

        AiAssistantMessage message = new AiAssistantMessage();
        message.setId(UUID.randomUUID().toString());
        message.setThreadId(thread.getId());
        message.setOwnerUserId(normalizedUserId);
        message.setRole(role);
        message.setContent(content);
        message.setIntent(intent);
        message.setToolsUsed(toolsUsed == null ? List.of() : toolsUsed);
        message.setToolDataJson(toolDataJson);
        message.setCreatedAt(now);
        messageRepository.save(message);

        thread.setUpdatedAt(now);
        threadRepository.save(thread);
    }

    private AiAssistantThread resolveThreadForWrite(String ownerUserId, String threadId) {
        if (!StringUtils.hasText(threadId)) {
            return getOrCreateDefaultThread(ownerUserId);
        }
        return requireOwnedThread(ownerUserId, threadId.trim());
    }

    private AiAssistantThread requireOwnedThread(String ownerUserId, String threadId) {
        return threadRepository.findById(threadId)
                .filter(thread -> ownerUserId.equals(thread.getOwnerUserId()))
                .orElseThrow(() -> new InvalidParamException("Thread AI không hợp lệ"));
    }

    private AiAssistantThread createDefaultThread(String ownerUserId) {
        LocalDateTime now = LocalDateTime.now();
        AiAssistantThread thread = new AiAssistantThread();
        thread.setId(UUID.randomUUID().toString());
        thread.setOwnerUserId(ownerUserId);
        thread.setTitle("AI Assistant");
        thread.setCreatedAt(now);
        thread.setUpdatedAt(now);
        return threadRepository.save(thread);
    }

    private AssistantThreadResponse toThreadResponse(AiAssistantThread thread) {
        return AssistantThreadResponse.builder()
                .threadId(thread.getId())
                .title(thread.getTitle())
                .createdAt(thread.getCreatedAt())
                .updatedAt(thread.getUpdatedAt())
                .build();
    }

    private AssistantThreadMessageResponse toMessageResponse(AiAssistantMessage message) {
        return AssistantThreadMessageResponse.builder()
                .id(message.getId())
                .role(message.getRole())
                .content(message.getContent())
                .intent(message.getIntent())
                .toolsUsed(message.getToolsUsed() == null ? List.of() : message.getToolsUsed())
                .data(parseJson(message.getToolDataJson()))
                .createdAt(message.getCreatedAt())
                .build();
    }

    private Object parseJson(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return objectMapper.readValue(raw, Object.class);
        } catch (Exception ignored) {
            return raw;
        }
    }

    private String safeToJson(Object data) {
        if (data == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception ignored) {
            return String.valueOf(data);
        }
    }

    private String requireUser(String ownerUserId) {
        if (!StringUtils.hasText(ownerUserId)) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        return ownerUserId.trim();
    }

    private int resolvePage(Integer page) {
        if (page == null || page <= 0) {
            return DEFAULT_PAGE;
        }
        return page;
    }

    private int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(MAX_LIMIT, limit);
    }
}
