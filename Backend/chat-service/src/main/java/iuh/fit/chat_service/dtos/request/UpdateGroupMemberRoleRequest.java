package iuh.fit.chat_service.dtos.request;

import iuh.fit.chat_service.enums.ParicipantRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateGroupMemberRoleRequest {
    @NotNull(message = "Role is required")
    private ParicipantRole role;
}

