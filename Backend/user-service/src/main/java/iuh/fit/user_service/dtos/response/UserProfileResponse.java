package iuh.fit.user_service.dtos.response;

import iuh.fit.user_service.entities.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class UserProfileResponse {
    private Long id;
    private String identityUserId;
    private String phoneNumber;
    private String email;
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private String avatar;
    private Boolean isActive;
    private Boolean deletionPending;
    private LocalDateTime deletionRequestedAt;
    private Boolean allowFriendInvites;
    private Boolean allowPhoneSearch;

    public static UserProfileResponse from(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .identityUserId(user.getIdentityUserId())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .gender(user.getGender())
                .dateOfBirth(user.getDateOfBirth())
                .avatar(user.getAvatar())
                .isActive(user.getIsActive())
                .deletionPending(user.getDeletionPending())
                .deletionRequestedAt(user.getDeletionRequestedAt())
                .allowFriendInvites(user.getAllowFriendInvites())
                .allowPhoneSearch(user.getAllowPhoneSearch())
                .build();
    }
}
