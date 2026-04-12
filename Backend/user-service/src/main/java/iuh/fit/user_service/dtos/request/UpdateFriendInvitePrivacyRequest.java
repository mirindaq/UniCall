package iuh.fit.user_service.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateFriendInvitePrivacyRequest {
    @NotNull(message = "allowFriendInvites is required")
    private Boolean allowFriendInvites;
}
