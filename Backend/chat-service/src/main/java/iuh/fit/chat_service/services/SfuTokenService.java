package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.response.SfuAccessTokenResponse;

public interface SfuTokenService {
    SfuAccessTokenResponse createConversationCallToken(String identityUserId, String conversationId, String callId);
}

