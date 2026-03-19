package iuh.fit.user_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.user_service.dtos.response.UserProfileResponse;
import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.services.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
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
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }

        User user = userProfileService.getUserProfileByIdentityUserId(identityUserId);
        return new ResponseEntity<>(
                new ResponseSuccess<>(HttpStatus.OK, "Get my profile success", UserProfileResponse.from(user)),
                HttpStatus.OK
        );
    }

    @GetMapping("/identity/{identityUserId}")
    public ResponseEntity<ResponseSuccess<UserProfileResponse>> getProfileByIdentityUserId(
            @PathVariable String identityUserId
    ) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("identityUserId is required");
        }

        User user = userProfileService.getUserProfileByIdentityUserId(identityUserId);
        return new ResponseEntity<>(
                new ResponseSuccess<>(HttpStatus.OK, "Get profile by identityUserId success", UserProfileResponse.from(user)),
                HttpStatus.OK
        );
    }
}
