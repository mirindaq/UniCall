package iuh.fit.user_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.user_service.dtos.response.UserProfileResponse;
import iuh.fit.user_service.dtos.response.UserSearchResponse;
import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.services.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
