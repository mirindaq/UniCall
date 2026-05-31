package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.response.AssistantThreadMessageResponse;
import iuh.fit.chat_service.dtos.response.AssistantThreadResponse;
import iuh.fit.chat_service.entities.AiAssistantThread;
import iuh.fit.chat_service.enums.ChatAssistantIntent;
import iuh.fit.chat_service.enums.ChatAssistantTool;
import iuh.fit.common_service.dtos.response.base.PageResponse;

import java.util.List;

public interface AssistantChatHistoryService {
    AiAssistantThread getOrCreateDefaultThread(String ownerUserId);

    AssistantThreadResponse getDefaultThreadInfo(String ownerUserId);

    void saveUserMessage(String ownerUserId, String threadId, String content);

    void saveAssistantMessage(
            String ownerUserId,
            String threadId,
            String content,
            ChatAssistantIntent intent,
            List<ChatAssistantTool> toolsUsed,
            Object data
    );

    PageResponse<AssistantThreadMessageResponse> listMessages(
            String ownerUserId,
            String threadId,
            Integer page,
            Integer limit
    );

    PendingAction getPendingAction(String ownerUserId, String threadId);

    void setPendingAction(String ownerUserId, String threadId, String actionType, Object payload);

    void clearPendingAction(String ownerUserId, String threadId);

    record PendingAction(String actionType, Object payload) {
    }
}
