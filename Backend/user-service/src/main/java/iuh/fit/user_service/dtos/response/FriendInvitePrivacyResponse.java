package iuh.fit.user_service.dtos.response;

import iuh.fit.user_service.entities.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FriendInvitePrivacyResponse {
    private String identityUserId;
    private Boolean allowFriendInvites;

    public static FriendInvitePrivacyResponse from(User user) {
        return FriendInvitePrivacyResponse.builder()
                .identityUserId(user.getIdentityUserId())
                .allowFriendInvites(Boolean.TRUE.equals(user.getAllowFriendInvites()))
                .build();
    }
}
