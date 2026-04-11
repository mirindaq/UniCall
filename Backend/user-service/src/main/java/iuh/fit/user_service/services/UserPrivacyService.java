package iuh.fit.user_service.services;

import iuh.fit.user_service.dtos.response.FriendInvitePrivacyResponse;
import iuh.fit.user_service.dtos.response.PhoneSearchPrivacyResponse;

public interface UserPrivacyService {
    FriendInvitePrivacyResponse getMyFriendInvitePrivacy(String identityUserId);

    FriendInvitePrivacyResponse updateMyFriendInvitePrivacy(String identityUserId, boolean allowFriendInvites);

    FriendInvitePrivacyResponse getFriendInvitePrivacyByIdentityUserId(String identityUserId);

    PhoneSearchPrivacyResponse getMyPhoneSearchPrivacy(String identityUserId);

    PhoneSearchPrivacyResponse updateMyPhoneSearchPrivacy(String identityUserId, boolean allowPhoneSearch);
}
