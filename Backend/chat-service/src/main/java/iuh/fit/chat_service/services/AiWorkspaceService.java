package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.AskAiAssistantThreadRequest;
import iuh.fit.chat_service.dtos.request.CreateAiAssistantThreadRequest;
import iuh.fit.chat_service.dtos.response.AiAssistantThreadDetailResponse;
import iuh.fit.chat_service.dtos.response.AiAssistantThreadSummaryResponse;
import iuh.fit.chat_service.dtos.response.AiAssistantTurnResponse;

import java.util.List;

public interface AiWorkspaceService {
    AiAssistantThreadSummaryResponse createThread(String identityUserId, CreateAiAssistantThreadRequest request);

    List<AiAssistantThreadSummaryResponse> listThreads(String identityUserId);

    AiAssistantThreadDetailResponse getThreadDetail(String identityUserId, String threadId);

    AiAssistantTurnResponse askThread(
            String identityUserId,
            String threadId,
            AskAiAssistantThreadRequest request
    );
}
