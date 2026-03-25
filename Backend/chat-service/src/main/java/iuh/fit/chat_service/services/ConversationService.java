package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.CreateGroupConversationRequest;
import iuh.fit.chat_service.entities.Conversation;

public interface ConversationService {
    Conversation createGroupConversation(String currentIdentityUserId, CreateGroupConversationRequest request);
}
