package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ParicipantRole;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ManageGroupParticipantsResponse {
    private String idConversation;
    private String name;
    private Integer numberMember;
    private List<ParticipantItem> participantInfos;

    @Getter
    @Builder
    public static class ParticipantItem {
        private String idAccount;
        private ParicipantRole role;
        private String nickname;
        private LocalDateTime dateJoin;
    }

    public static ManageGroupParticipantsResponse from(Conversation conversation) {
        List<ParticipantItem> participants = conversation.getParticipantInfos() == null
                ? List.of()
                : conversation.getParticipantInfos()
                .stream()
                .map(ManageGroupParticipantsResponse::toParticipantItem)
                .toList();

        return ManageGroupParticipantsResponse.builder()
                .idConversation(conversation.getIdConversation())
                .name(conversation.getName())
                .numberMember(conversation.getNumberMember())
                .participantInfos(participants)
                .build();
    }

    private static ParticipantItem toParticipantItem(ParticipantInfo participantInfo) {
        return ParticipantItem.builder()
                .idAccount(participantInfo.getIdAccount())
                .role(participantInfo.getRole())
                .nickname(participantInfo.getNickname())
                .dateJoin(participantInfo.getDateJoin())
                .build();
    }
}

