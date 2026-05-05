package iuh.fit.chat_service.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupManagementSettings {
    private Boolean allowMemberSendMessage;
    private Boolean allowMemberPinMessage;
    private Boolean allowMemberChangeAvatar;
    private Boolean memberApprovalEnabled;

    public static GroupManagementSettings defaults() {
        return new GroupManagementSettings(true, true, true, false);
    }
}
