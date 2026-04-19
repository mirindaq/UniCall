package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.Conversation;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class CreateGroupConversationResponse {
    private String idConversation;
    private String name;
    private Integer numberMember;
    private LocalDateTime dateCreate;
    private List<String> participantIdentityUserIds;

    public static CreateGroupConversationResponse from(Conversation conversation) {
        List<String> participantIdentityUserIds = conversation.getParticipantInfos() == null
                ? List.of()
                : conversation.getParticipantInfos().stream().map(participant -> participant.getIdAccount()).toList();

        return CreateGroupConversationResponse.builder()
                .idConversation(conversation.getIdConversation())
                .name(conversation.getName())
                .numberMember(conversation.getNumberMember())
                .dateCreate(conversation.getDateCreate())
                .participantIdentityUserIds(participantIdentityUserIds)
                .build();
    }
}
