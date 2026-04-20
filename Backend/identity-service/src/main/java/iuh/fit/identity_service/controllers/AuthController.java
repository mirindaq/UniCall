package iuh.fit.identity_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.identity_service.dtos.request.auth.ChangePasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.ForgotPasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.LoginRequest;
import iuh.fit.identity_service.dtos.request.auth.RefreshTokenRequest;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.request.auth.ResetPasswordWithOtpRequest;
import iuh.fit.identity_service.dtos.request.auth.ResendVerificationEmailRequest;
import iuh.fit.identity_service.dtos.request.auth.VerifyPasswordRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.identity_service.services.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix:/api/v1}/auth")
@RequiredArgsConstructor
public class AuthController {
    private static final String REFRESH_COOKIE_NAME = "unicall_rt";
    private static final String CLIENT_TYPE_HEADER = "X-Client-Type";
    private static final String MOBILE_CLIENT = "mobile";

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ResponseSuccess<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse data = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                new ResponseSuccess<>(HttpStatus.CREATED, "Register success", data)
        );
    }

    @PostMapping("/resend-verification-email")
    public ResponseEntity<ResponseSuccess<Void>> resendVerificationEmail(
            @Valid @RequestBody ResendVerificationEmailRequest request
    ) {
        authService.resendVerificationEmail(request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Verification email sent"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ResponseSuccess<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Password reset email sent"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ResponseSuccess<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Password changed successfully"));
    }

    @PostMapping("/verify-password")
    public ResponseEntity<ResponseSuccess<Void>> verifyPassword(
            @Valid @RequestBody VerifyPasswordRequest request
    ) {
        authService.verifyPassword(request.getIdentityUserId(), request.getPhoneNumber(), request.getPassword());
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Password verified"));
    }

    @PostMapping("/reset-password-with-otp")
    public ResponseEntity<ResponseSuccess<Void>> resetPasswordWithOtp(
            @Valid @RequestBody ResetPasswordWithOtpRequest request
    ) {
        authService.resetPasswordWithOtp(request);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Password reset successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<ResponseSuccess<?>> login(
            @RequestHeader(value = CLIENT_TYPE_HEADER, required = false) String clientType,
            @Valid @RequestBody LoginRequest request
    ) {
        AuthService.LoginResult result = authService.login(request);
        if (isMobileClient(clientType)) {
            return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Login success", result.tokens()));
        }

        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok();
        result.cookies().forEach(cookie -> responseBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString()));
        return responseBuilder.body(new ResponseSuccess<>(HttpStatus.OK, "Login success"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ResponseSuccess<?>> refresh(
            @RequestHeader(value = CLIENT_TYPE_HEADER, required = false) String clientType,
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshTokenFromCookie,
            @RequestBody(required = false) RefreshTokenRequest request
    ) {
        String refreshToken = isMobileClient(clientType)
                ? (request == null ? null : request.getRefreshToken())
                : refreshTokenFromCookie;
        AuthService.RefreshResult result = authService.refresh(refreshToken);
        if (isMobileClient(clientType)) {
            return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Refresh token success", result.tokens()));
        }

        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok();
        result.cookies().forEach(cookie -> responseBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString()));
        return responseBuilder.body(new ResponseSuccess<>(HttpStatus.OK, "Refresh token success"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ResponseSuccess<?>> logout(
            @RequestHeader(value = CLIENT_TYPE_HEADER, required = false) String clientType,
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshTokenFromCookie,
            @RequestBody(required = false) RefreshTokenRequest refreshRequest,
            HttpServletRequest httpServletRequest
    ) {
        String refreshToken = isMobileClient(clientType)
                ? (refreshRequest == null ? null : refreshRequest.getRefreshToken())
                : refreshTokenFromCookie;
        AuthService.LogoutResult result = authService.logout(refreshToken, httpServletRequest);
        if (isMobileClient(clientType)) {
            return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Logout success"));
        }

        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok();
        result.clearCookies().forEach(cookie -> responseBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString()));
        return responseBuilder.body(new ResponseSuccess<>(HttpStatus.OK, "Logout success"));
    }

    private boolean isMobileClient(String clientType) {
        return clientType != null && MOBILE_CLIENT.equalsIgnoreCase(clientType.trim());
    }
}
