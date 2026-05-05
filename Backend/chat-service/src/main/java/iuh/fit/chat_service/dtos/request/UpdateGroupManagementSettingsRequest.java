package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateGroupManagementSettingsRequest {
    @NotNull(message = "allowMemberSendMessage is required")
    private Boolean allowMemberSendMessage;

    @NotNull(message = "allowMemberPinMessage is required")
    private Boolean allowMemberPinMessage;

    @NotNull(message = "allowMemberChangeAvatar is required")
    private Boolean allowMemberChangeAvatar;

    @NotNull(message = "memberApprovalEnabled is required")
    private Boolean memberApprovalEnabled;
}
