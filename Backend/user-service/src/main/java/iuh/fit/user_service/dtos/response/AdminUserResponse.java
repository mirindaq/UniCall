package iuh.fit.user_service.dtos.response;

import iuh.fit.user_service.entities.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminUserResponse {
    private String identityUserId;
    private String phoneNumber;
    private String email;
    private String fullName;
    private Boolean isActive;
    private Boolean deletionPending;

    public static AdminUserResponse from(User user) {
        return AdminUserResponse.builder()
                .identityUserId(user.getIdentityUserId())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .fullName((user.getLastName() + " " + user.getFirstName()).trim())
                .isActive(user.getIsActive())
                .deletionPending(user.getDeletionPending())
                .build();
    }
}
