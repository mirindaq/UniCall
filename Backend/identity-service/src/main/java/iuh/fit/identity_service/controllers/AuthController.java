package iuh.fit.identity_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.identity_service.dtos.request.auth.ChangePasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.ForgotPasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.LoginRequest;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.request.auth.ResendVerificationEmailRequest;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix:/api/v1}/auth")
@RequiredArgsConstructor
public class AuthController {
    private static final String REFRESH_COOKIE_NAME = "unicall_rt";

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

    @PostMapping("/login")
    public ResponseEntity<ResponseSuccess<Void>> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request);
        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok();
        result.cookies().forEach(cookie -> responseBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString()));
        return responseBuilder.body(new ResponseSuccess<>(HttpStatus.OK, "Login success"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ResponseSuccess<Void>> refresh(
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshToken
    ) {
        AuthService.RefreshResult result = authService.refresh(refreshToken);
        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok();
        result.cookies().forEach(cookie -> responseBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString()));
        return responseBuilder.body(new ResponseSuccess<>(HttpStatus.OK, "Refresh token success"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ResponseSuccess<Void>> logout(
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletRequest request
    ) {
        AuthService.LogoutResult result = authService.logout(refreshToken, request);
        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok();
        result.clearCookies().forEach(cookie -> responseBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString()));
        return responseBuilder.body(new ResponseSuccess<>(HttpStatus.OK, "Logout success"));
    }
}
