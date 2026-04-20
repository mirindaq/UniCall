package iuh.fit.identity_service.services.impl;

import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.identity_service.clients.GrpcUserServiceClient;
import iuh.fit.identity_service.dtos.request.auth.ChangePasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.ForgotPasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.LoginRequest;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.request.auth.ResetPasswordWithOtpRequest;
import iuh.fit.identity_service.dtos.request.auth.ResendVerificationEmailRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.identity_service.services.AuthService;
import iuh.fit.identity_service.services.FirebasePhoneVerificationService;
import iuh.fit.identity_service.services.KeycloakAuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final String ACCESS_COOKIE_NAME = "unicall_at";
    private static final String REFRESH_COOKIE_NAME = "unicall_rt";

    private final KeycloakAuthService keycloakAuthService;
    private final FirebasePhoneVerificationService firebasePhoneVerificationService;
    private final GrpcUserServiceClient grpcUserServiceClient;

    @Value("${app.security.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${app.security.cookie.same-site:Strict}")
    private String cookieSameSite;

    @Override
    public RegisterResponse register(RegisterRequest request) {
        firebasePhoneVerificationService.verifyPhoneIdToken(request.getFirebaseIdToken(), request.getPhoneNumber());
        return keycloakAuthService.register(request);
    }

    @Override
    public void resendVerificationEmail(ResendVerificationEmailRequest request) {
        keycloakAuthService.resendVerificationEmail(request.getPhoneNumber(), request.getEmail());
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        keycloakAuthService.forgotPassword(request.getPhoneNumber(), request.getEmail());
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        keycloakAuthService.changePassword(
                request.getPhoneNumber(),
                request.getCurrentPassword(),
                request.getNewPassword()
        );
    }

    @Override
    public void verifyPassword(String identityUserId, String phoneNumber, String password) {
        String normalizedIdentityUserId = identityUserId == null ? "" : identityUserId.trim();
        String normalizedPhoneNumber = phoneNumber == null ? "" : phoneNumber.trim();
        if (normalizedIdentityUserId.isBlank() || normalizedPhoneNumber.isBlank() || password == null || password.isBlank()) {
            throw new UnauthenticatedException("Invalid verification request");
        }

        String resolvedIdentityUserId = keycloakAuthService.findIdentityUserIdByPhoneNumber(normalizedPhoneNumber);
        if (!normalizedIdentityUserId.equals(resolvedIdentityUserId)) {
            throw new UnauthenticatedException("Password verification failed");
        }
        keycloakAuthService.verifyPassword(normalizedPhoneNumber, password.trim());
    }

    @Override
    public void resetPasswordWithOtp(ResetPasswordWithOtpRequest request) {
        firebasePhoneVerificationService.verifyPhoneIdToken(request.getFirebaseIdToken(), request.getPhoneNumber());
        keycloakAuthService.resetPasswordWithOtp(request.getPhoneNumber(), request.getNewPassword());
    }

    @Override
    public LoginResult login(LoginRequest request) {
        AuthTokenResponse tokens = keycloakAuthService.login(request.getPhoneNumber(), request.getPassword());
        if (tokens.getAccessToken() == null || tokens.getAccessToken().isBlank()) {
            throw new UnauthenticatedException("Missing access token from identity provider");
        }
        if (tokens.getRefreshToken() == null || tokens.getRefreshToken().isBlank()) {
            throw new UnauthenticatedException("Missing refresh token from identity provider");
        }
        String identityUserId = keycloakAuthService.findIdentityUserIdByPhoneNumber(request.getPhoneNumber());
        grpcUserServiceClient.cancelDeletionRequest(identityUserId);

        return new LoginResult(
                List.of(
                        createAccessCookie(tokens.getAccessToken(), tokens.getExpiresIn()),
                        createRefreshCookie(tokens.getRefreshToken(), tokens.getRefreshExpiresIn())
                ),
                tokens
        );
    }

    @Override
    public RefreshResult refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthenticatedException("Missing refresh token");
        }

        AuthTokenResponse tokenResponse = keycloakAuthService.refreshToken(refreshToken);
        String rotatedRefreshToken = tokenResponse.getRefreshToken() == null || tokenResponse.getRefreshToken().isBlank()
                ? refreshToken
                : tokenResponse.getRefreshToken();
        if (tokenResponse.getAccessToken() == null || tokenResponse.getAccessToken().isBlank()) {
            throw new UnauthenticatedException("Missing access token from identity provider");
        }

        return new RefreshResult(
                List.of(
                        createAccessCookie(tokenResponse.getAccessToken(), tokenResponse.getExpiresIn()),
                        createRefreshCookie(rotatedRefreshToken, tokenResponse.getRefreshExpiresIn())
                ),
                AuthTokenResponse.builder()
                        .accessToken(tokenResponse.getAccessToken())
                        .refreshToken(rotatedRefreshToken)
                        .tokenType(tokenResponse.getTokenType())
                        .expiresIn(tokenResponse.getExpiresIn())
                        .refreshExpiresIn(tokenResponse.getRefreshExpiresIn())
                        .scope(tokenResponse.getScope())
                        .build()
        );
    }

    @Override
    public LogoutResult logout(String refreshToken, HttpServletRequest request) {
        keycloakAuthService.revokeRefreshToken(refreshToken);
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }

        return new LogoutResult(List.of(
                clearCookie(ACCESS_COOKIE_NAME),
                clearCookie(REFRESH_COOKIE_NAME)
        ));
    }

    private ResponseCookie createAccessCookie(String accessToken, Integer accessExpiresInSeconds) {
        long maxAge = accessExpiresInSeconds == null ? 10 * 60L : accessExpiresInSeconds.longValue();
        return ResponseCookie.from(ACCESS_COOKIE_NAME, accessToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private ResponseCookie createRefreshCookie(String refreshToken, Integer refreshExpiresInSeconds) {
        long maxAge = refreshExpiresInSeconds == null ? 7 * 24 * 60 * 60L : refreshExpiresInSeconds.longValue();
        return ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private ResponseCookie clearCookie(String name) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0)
                .build();
    }
}
