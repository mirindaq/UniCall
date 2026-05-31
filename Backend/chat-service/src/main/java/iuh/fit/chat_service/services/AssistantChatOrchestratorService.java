package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.AssistantAskRequest;
import iuh.fit.chat_service.dtos.response.AssistantAskResponse;

public interface AssistantChatOrchestratorService {
    AssistantAskResponse ask(String requesterId, AssistantAskRequest request);
}
