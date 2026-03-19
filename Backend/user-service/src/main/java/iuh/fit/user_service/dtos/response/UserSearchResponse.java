package iuh.fit.user_service.dtos.response;

import iuh.fit.user_service.entities.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserSearchResponse {
    private String identityUserId;
    private String phoneNumber;
    private String firstName;
    private String lastName;
    private String fullName;
    private String avatar;

    public static UserSearchResponse from(User user) {
        String firstName = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String lastName = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        return UserSearchResponse.builder()
                .identityUserId(user.getIdentityUserId())
                .phoneNumber(user.getPhoneNumber())
                .firstName(firstName)
                .lastName(lastName)
                .fullName(fullName)
                .avatar(user.getAvatar())
                .build();
    }
}
