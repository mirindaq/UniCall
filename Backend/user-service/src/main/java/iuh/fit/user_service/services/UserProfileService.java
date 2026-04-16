package iuh.fit.user_service.services;

import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.dtos.response.AccountDeletionStatusResponse;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

public interface UserProfileService {
    Long createUserProfile(
            String identityUserId,
            String phoneNumber,
            String email,
            String firstName,
            String lastName,
            String gender,
            LocalDate dateOfBirth
    );

    boolean deleteUserProfileByIdentityUserId(String identityUserId);

    User getAuthenticatedUserProfile(String identityUserId);

    User updateAuthenticatedUserProfile(
            String identityUserId,
            String firstName,
            String lastName,
            String gender,
            LocalDate dateOfBirth
    );

    User updateAuthenticatedUserAvatar(String identityUserId, MultipartFile avatarFile);

    User getUserProfileByIdentityUserId(String identityUserId);

    AccountDeletionStatusResponse requestAccountDeletion(
            String identityUserId,
            String phoneNumber,
            String reason,
            String password
    );

    AccountDeletionStatusResponse getAccountDeletionStatus(String identityUserId);

    AccountDeletionStatusResponse cancelAccountDeletionRequest(String identityUserId);

    long purgeExpiredDeletionRequests(long graceDays);

    Page<User> searchUsers(
            int page,
            int limit,
            String sortBy,
            String search,
            String keyword
    );
}
