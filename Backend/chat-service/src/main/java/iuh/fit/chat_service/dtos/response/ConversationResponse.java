package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ConversationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ConversationResponse {
    private String idConversation;
    private ConversationType type;
    private String name;
    private String avatar;
    private LocalDateTime dateCreate;
    private LocalDateTime dateUpdateMessage;
    private String lastMessageContent;
    private int numberMember;
    private List<ParticipantInfo> participantInfos;

    public static ConversationResponse from(Conversation entity) {
        if (entity == null) {
            return null;
        }
        return ConversationResponse.builder()
                .idConversation(entity.getIdConversation())
                .type(entity.getType())
                .name(entity.getName())
                .avatar(entity.getAvatar())
                .dateCreate(entity.getDateCreate())
                .dateUpdateMessage(entity.getDateUpdateMessage())
                .lastMessageContent(entity.getLastMessageContent())
                .numberMember(entity.getNumberMember())
                .participantInfos(entity.getParticipantInfos())
                .build();
    }
}
