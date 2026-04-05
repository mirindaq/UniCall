package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.ChatSendStompPayload;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.common_service.dtos.response.base.PageResponse;

public interface ChatMessageService {

    PageResponse<MessageResponse> listMessages(String identityUserId, String conversationId, int page, int limit);

    MessageResponse sendRest(String identityUserId, String conversationId, SendChatMessageRequest request);

    void sendFromStomp(String identityUserId, ChatSendStompPayload payload);

    MessageResponse recallMessage(String identityUserId, String conversationId, String messageId);

    void hideMessageForMe(String identityUserId, String conversationId, String messageId);
}
