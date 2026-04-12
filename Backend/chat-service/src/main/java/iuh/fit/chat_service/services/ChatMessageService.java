package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.request.ChatSendStompPayload;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.response.AttachmentResponse;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.common_service.dtos.response.base.PageResponse;

import java.util.List;

public interface ChatMessageService {

    PageResponse<MessageResponse> listMessages(String identityUserId, String conversationId, int page, int limit);

    PageResponse<MessageResponse> searchMessages(String identityUserId, String conversationId, String keyword, int page, int limit);

    MessageResponse getMessageById(String identityUserId, String conversationId, String messageId);

    MessageResponse sendRest(String identityUserId, String conversationId, SendChatMessageRequest request);

    void sendFromStomp(String identityUserId, ChatSendStompPayload payload);

    MessageResponse recallMessage(String identityUserId, String conversationId, String messageId);

    void hideMessageForMe(String identityUserId, String conversationId, String messageId);

    List<AttachmentResponse> getAttachments(
            String identityUserId,
            String conversationId,
            String type,
            String senderId,
            String fromDate,
            String toDate,
            String search
    );
}
