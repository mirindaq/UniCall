package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.response.ConversationBlockStatusResponse;

public interface ConversationBlockService {
    ConversationBlockStatusResponse getBlockStatus(String identityUserId, String conversationId);

    ConversationBlockStatusResponse blockConversation(String identityUserId, String conversationId);

    ConversationBlockStatusResponse unblockConversation(String identityUserId, String conversationId);

    void assertCanSendMessage(String identityUserId, String conversationId);
}

