package iuh.fit.user_service.services;

import iuh.fit.user_service.entities.User;

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

    User getUserProfileByIdentityUserId(String identityUserId);
}
