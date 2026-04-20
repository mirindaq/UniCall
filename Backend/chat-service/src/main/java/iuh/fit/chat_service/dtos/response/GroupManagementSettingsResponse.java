package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.GroupManagementSettings;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GroupManagementSettingsResponse {
    private boolean allowMemberSendMessage;
    private boolean allowMemberPinMessage;
    private boolean allowMemberChangeAvatar;
    private boolean memberApprovalEnabled;

    public static GroupManagementSettingsResponse from(GroupManagementSettings settings) {
        GroupManagementSettings source = settings == null ? GroupManagementSettings.defaults() : settings;
        return GroupManagementSettingsResponse.builder()
                .allowMemberSendMessage(source.getAllowMemberSendMessage() == null || source.getAllowMemberSendMessage())
                .allowMemberPinMessage(source.getAllowMemberPinMessage() == null || source.getAllowMemberPinMessage())
                .allowMemberChangeAvatar(source.getAllowMemberChangeAvatar() == null || source.getAllowMemberChangeAvatar())
                .memberApprovalEnabled(source.getMemberApprovalEnabled() != null && source.getMemberApprovalEnabled())
                .build();
    }
}
