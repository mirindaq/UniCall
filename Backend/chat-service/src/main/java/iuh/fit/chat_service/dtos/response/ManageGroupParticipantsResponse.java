package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.GroupMemberJoinRequest;
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
    private GroupManagementSettingsResponse groupManagementSettings;
    private List<ParticipantItem> participantInfos;
    private List<PendingMemberRequestItem> pendingMemberRequests;
    private Integer pendingMemberRequestCount;
    private Integer addedMemberCount;
    private Integer createdMemberRequestCount;

    @Getter
    @Builder
    public static class ParticipantItem {
        private String idAccount;
        private ParicipantRole role;
        private String nickname;
        private LocalDateTime dateJoin;
    }

    @Getter
    @Builder
    public static class PendingMemberRequestItem {
        private String idRequest;
        private String requesterIdentityUserId;
        private String targetIdentityUserId;
        private LocalDateTime requestedAt;
    }

    public static ManageGroupParticipantsResponse from(Conversation conversation) {
        return from(conversation, 0, 0);
    }

    public static ManageGroupParticipantsResponse from(
            Conversation conversation,
            int addedMemberCount,
            int createdMemberRequestCount
    ) {
        List<ParticipantItem> participants = conversation.getParticipantInfos() == null
                ? List.of()
                : conversation.getParticipantInfos()
                .stream()
                .map(ManageGroupParticipantsResponse::toParticipantItem)
                .toList();
        List<PendingMemberRequestItem> pendingMemberRequests = conversation.getPendingMemberRequests() == null
                ? List.of()
                : conversation.getPendingMemberRequests().stream()
                .map(ManageGroupParticipantsResponse::toPendingMemberRequestItem)
                .toList();

        return ManageGroupParticipantsResponse.builder()
                .idConversation(conversation.getIdConversation())
                .name(conversation.getName())
                .numberMember(conversation.getNumberMember())
                .groupManagementSettings(GroupManagementSettingsResponse.from(conversation.getGroupManagementSettings()))
                .participantInfos(participants)
                .pendingMemberRequests(pendingMemberRequests)
                .pendingMemberRequestCount(pendingMemberRequests.size())
                .addedMemberCount(addedMemberCount)
                .createdMemberRequestCount(createdMemberRequestCount)
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

    private static PendingMemberRequestItem toPendingMemberRequestItem(GroupMemberJoinRequest pendingMemberRequest) {
        return PendingMemberRequestItem.builder()
                .idRequest(pendingMemberRequest.getIdRequest())
                .requesterIdentityUserId(pendingMemberRequest.getRequesterIdentityUserId())
                .targetIdentityUserId(pendingMemberRequest.getTargetIdentityUserId())
                .requestedAt(pendingMemberRequest.getRequestedAt())
                .build();
    }
}

