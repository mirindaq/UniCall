package iuh.fit.user_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.user_service.dtos.request.UpdateFriendInvitePrivacyRequest;
import iuh.fit.user_service.dtos.request.UpdatePhoneSearchPrivacyRequest;
import iuh.fit.user_service.dtos.response.FriendInvitePrivacyResponse;
import iuh.fit.user_service.dtos.response.PhoneSearchPrivacyResponse;
import iuh.fit.user_service.services.UserPrivacyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix:/api/v1}/users")
@RequiredArgsConstructor
public class UserPrivacyController {
    private static final String USER_ID_HEADER = "X-User-Id";

    private final UserPrivacyService userPrivacyService;

    @GetMapping("/me/privacy/friend-invites")
    public ResponseEntity<ResponseSuccess<FriendInvitePrivacyResponse>> getMyFriendInvitePrivacy(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        FriendInvitePrivacyResponse data = userPrivacyService.getMyFriendInvitePrivacy(identityUserId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Get friend invite privacy success", data));
    }

    @PutMapping("/me/privacy/friend-invites")
    public ResponseEntity<ResponseSuccess<FriendInvitePrivacyResponse>> updateMyFriendInvitePrivacy(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @Valid @RequestBody UpdateFriendInvitePrivacyRequest request
    ) {
        FriendInvitePrivacyResponse data = userPrivacyService.updateMyFriendInvitePrivacy(
                identityUserId,
                Boolean.TRUE.equals(request.getAllowFriendInvites())
        );
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Update friend invite privacy success", data));
    }

    @GetMapping("/identity/{identityUserId}/privacy/friend-invites")
    public ResponseEntity<ResponseSuccess<FriendInvitePrivacyResponse>> getFriendInvitePrivacyByIdentityUserId(
            @PathVariable String identityUserId
    ) {
        FriendInvitePrivacyResponse data = userPrivacyService.getFriendInvitePrivacyByIdentityUserId(identityUserId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Get friend invite privacy by identity success", data));
    }

    @GetMapping("/me/privacy/phone-search")
    public ResponseEntity<ResponseSuccess<PhoneSearchPrivacyResponse>> getMyPhoneSearchPrivacy(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        PhoneSearchPrivacyResponse data = userPrivacyService.getMyPhoneSearchPrivacy(identityUserId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Get phone search privacy success", data));
    }

    @PutMapping("/me/privacy/phone-search")
    public ResponseEntity<ResponseSuccess<PhoneSearchPrivacyResponse>> updateMyPhoneSearchPrivacy(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @Valid @RequestBody UpdatePhoneSearchPrivacyRequest request
    ) {
        PhoneSearchPrivacyResponse data = userPrivacyService.updateMyPhoneSearchPrivacy(
                identityUserId,
                Boolean.TRUE.equals(request.getAllowPhoneSearch())
        );
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Update phone search privacy success", data));
    }
}
