package iuh.fit.user_service.services.impl;

import iuh.fit.user_service.dtos.response.FriendInvitePrivacyResponse;
import iuh.fit.user_service.dtos.response.PhoneSearchPrivacyResponse;
import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.repositories.UserRepository;
import iuh.fit.user_service.services.UserPrivacyService;
import iuh.fit.user_service.services.UserProfileService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserPrivacyServiceImpl implements UserPrivacyService {
    private final UserProfileService userProfileService;
    private final UserRepository userRepository;

    @Override
    public FriendInvitePrivacyResponse getMyFriendInvitePrivacy(String identityUserId) {
        User user = userProfileService.getAuthenticatedUserProfile(identityUserId);
        return FriendInvitePrivacyResponse.from(user);
    }

    @Override
    @Transactional
    public FriendInvitePrivacyResponse updateMyFriendInvitePrivacy(String identityUserId, boolean allowFriendInvites) {
        User user = userProfileService.getAuthenticatedUserProfile(identityUserId);
        user.setAllowFriendInvites(allowFriendInvites);
        User updated = userRepository.save(user);
        return FriendInvitePrivacyResponse.from(updated);
    }

    @Override
    public FriendInvitePrivacyResponse getFriendInvitePrivacyByIdentityUserId(String identityUserId) {
        User user = userProfileService.getUserProfileByIdentityUserId(identityUserId);
        return FriendInvitePrivacyResponse.from(user);
    }

    @Override
    public PhoneSearchPrivacyResponse getMyPhoneSearchPrivacy(String identityUserId) {
        User user = userProfileService.getAuthenticatedUserProfile(identityUserId);
        return PhoneSearchPrivacyResponse.from(user);
    }

    @Override
    @Transactional
    public PhoneSearchPrivacyResponse updateMyPhoneSearchPrivacy(String identityUserId, boolean allowPhoneSearch) {
        User user = userProfileService.getAuthenticatedUserProfile(identityUserId);
        user.setAllowPhoneSearch(allowPhoneSearch);
        User updated = userRepository.save(user);
        return PhoneSearchPrivacyResponse.from(updated);
    }
}
