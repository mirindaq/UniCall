package iuh.fit.user_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.user_service.dtos.request.RequestAccountDeletionRequest;
import iuh.fit.user_service.dtos.response.AccountDeletionStatusResponse;
import iuh.fit.user_service.dtos.request.UpdateMyProfileRequest;
import iuh.fit.user_service.dtos.response.UserProfileResponse;
import iuh.fit.user_service.dtos.response.UserSearchResponse;
import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.services.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("${api.prefix:/api/v1}/users")
@RequiredArgsConstructor
public class UserController {
    private static final String USER_ID_HEADER = "X-User-Id";

    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public ResponseEntity<ResponseSuccess<UserProfileResponse>> myProfile(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        User user = userProfileService.getAuthenticatedUserProfile(identityUserId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get my profile success", UserProfileResponse.from(user))
        );
    }

    @PostMapping("/me/deletion-request")
    public ResponseEntity<ResponseSuccess<AccountDeletionStatusResponse>> requestMyAccountDeletion(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @Valid @RequestBody RequestAccountDeletionRequest request
    ) {
        AccountDeletionStatusResponse data = userProfileService.requestAccountDeletion(
                identityUserId,
                request.getPhoneNumber(),
                request.getReason(),
                request.getPassword()
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Request account deletion success", data)
        );
    }

    @GetMapping("/me/deletion-request/status")
    public ResponseEntity<ResponseSuccess<AccountDeletionStatusResponse>> myAccountDeletionStatus(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        AccountDeletionStatusResponse data = userProfileService.getAccountDeletionStatus(identityUserId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get account deletion status success", data)
        );
    }

    @PostMapping("/me/deletion-request/cancel")
    public ResponseEntity<ResponseSuccess<AccountDeletionStatusResponse>> cancelMyAccountDeletionRequest(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId
    ) {
        AccountDeletionStatusResponse data = userProfileService.cancelAccountDeletionRequest(identityUserId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Cancel account deletion request success", data)
        );
    }

    @PutMapping("/me")
    public ResponseEntity<ResponseSuccess<UserProfileResponse>> updateMyProfile(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @Valid @RequestBody UpdateMyProfileRequest request
    ) {
        User user = userProfileService.updateAuthenticatedUserProfile(
                identityUserId,
                request.getFirstName(),
                request.getLastName(),
                request.getGender(),
                request.getDateOfBirth()
        );
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Update my profile success", UserProfileResponse.from(user))
        );
    }

    @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseSuccess<UserProfileResponse>> updateMyAvatar(
            @RequestHeader(value = USER_ID_HEADER, required = false) String identityUserId,
            @RequestPart("file") MultipartFile file
    ) {
        User user = userProfileService.updateAuthenticatedUserAvatar(identityUserId, file);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Update my avatar success", UserProfileResponse.from(user))
        );
    }

    @GetMapping("/identity/{identityUserId}")
    public ResponseEntity<ResponseSuccess<UserProfileResponse>> getProfileByIdentityUserId(
            @PathVariable String identityUserId
    ) {
        User user = userProfileService.getUserProfileByIdentityUserId(identityUserId);
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get profile by identityUserId success", UserProfileResponse.from(user))
        );
    }

    @GetMapping("/search")
    public ResponseEntity<ResponseSuccess<PageResponse<UserSearchResponse>>> searchUsers(
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "sortBy", required = false) String sortBy,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "keyword", required = false) String keyword
    ) {
        Page<User> userPage = userProfileService.searchUsers(page, limit, sortBy, search, keyword);
        PageResponse<UserSearchResponse> data = PageResponse.fromPage(userPage, UserSearchResponse::from);

        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Search users success", data)
        );
    }
}
