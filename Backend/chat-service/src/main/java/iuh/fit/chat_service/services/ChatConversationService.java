package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.CreateDirectConversationRequest;
import iuh.fit.chat_service.dtos.response.ConversationResponse;

import java.util.List;

public interface ChatConversationService {

    List<ConversationResponse> listMyConversations(String identityUserId);

    ConversationResponse getOrCreateDirect(String identityUserId, CreateDirectConversationRequest request);

    void requireParticipant(String conversationId, String identityUserId);
}
