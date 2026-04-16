package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.ConversationCallSignalRequest;

public interface ConversationCallService {
    void sendSignal(String identityUserId, ConversationCallSignalRequest request);
}
