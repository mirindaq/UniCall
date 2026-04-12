package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.Attachment;
import iuh.fit.chat_service.entities.CallMessageInfo;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.enums.MessageEnum;
import iuh.fit.chat_service.enums.MessageType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class MessageResponse {
    private String idMessage;
    private String idConversation;
    private String idAccountSent;
    private MessageEnum status;
    private String content;
    private MessageType type;
    private LocalDateTime timeSent;
    private LocalDateTime timeUpdate;
    private List<Attachment> attachments;
    private Map<String, String> reactions;
    private String replyToMessageId;
    private boolean edited;
    private boolean recalled;
    private CallMessageInfo callInfo;

    public static MessageResponse from(Message entity) {
        if (entity == null) {
            return null;
        }
        return MessageResponse.builder()
                .idMessage(entity.getIdMessage())
                .idConversation(entity.getIdConversation())
                .idAccountSent(entity.getIdAccountSent())
                .status(entity.getStatus())
                .content(entity.getContent())
                .type(entity.getType())
                .timeSent(entity.getTimeSent())
                .timeUpdate(entity.getTimeUpdate())
                .attachments(entity.getAttachments())
                .reactions(entity.getReactions())
                .replyToMessageId(entity.getReplyToMessageId())
                .edited(entity.isEdited())
                .recalled(entity.isRecalled())
                .callInfo(entity.getCallInfo())
                .build();
    }
}
