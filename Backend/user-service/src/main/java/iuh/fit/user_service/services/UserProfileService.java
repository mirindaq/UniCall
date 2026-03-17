package iuh.fit.user_service.services;

import java.time.LocalDate;

public interface UserProfileService {
    Long createUserProfile(
            String identityUserId,
            String phoneNumber,
            String firstName,
            String lastName,
            String gender,
            LocalDate dateOfBirth
    );

    boolean deleteUserProfileByIdentityUserId(String identityUserId);
}
