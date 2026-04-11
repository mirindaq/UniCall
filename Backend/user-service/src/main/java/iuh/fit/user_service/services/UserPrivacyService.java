package iuh.fit.user_service.services;

import iuh.fit.user_service.dtos.response.FriendInvitePrivacyResponse;

public interface UserPrivacyService {
    FriendInvitePrivacyResponse getMyFriendInvitePrivacy(String identityUserId);

    FriendInvitePrivacyResponse updateMyFriendInvitePrivacy(String identityUserId, boolean allowFriendInvites);

    FriendInvitePrivacyResponse getFriendInvitePrivacyByIdentityUserId(String identityUserId);
}
