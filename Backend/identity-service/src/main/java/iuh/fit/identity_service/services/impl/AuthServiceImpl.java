package iuh.fit.identity_service.services.impl;

import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AccessTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.identity_service.services.AuthService;
import iuh.fit.identity_service.services.KeycloakAuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final String STATE_COOKIE_NAME = "unicall_oauth_state";
    private static final String VERIFIER_COOKIE_NAME = "unicall_oauth_verifier";
    private static final String REFRESH_COOKIE_NAME = "unicall_rt";

    private final KeycloakAuthService keycloakAuthService;

    @Value("${app.security.frontend-callback-url}")
    private String frontendCallbackUrl;

    @Value("${app.security.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${app.security.cookie.same-site:Strict}")
    private String cookieSameSite;

    @Override
    public RegisterResponse register(RegisterRequest request) {
        return keycloakAuthService.register(request);
    }

    @Override
    public LoginResult login() {
        String state = randomUrlSafe(32);
        String codeVerifier = randomUrlSafe(64);
        String codeChallenge = generateCodeChallenge(codeVerifier);
        String authorizationUrl = keycloakAuthService.buildAuthorizationUrl(state, codeChallenge);

        return new LoginResult(
                authorizationUrl,
                createTemporaryCookie(STATE_COOKIE_NAME, state),
                createTemporaryCookie(VERIFIER_COOKIE_NAME, codeVerifier)
        );
    }

    @Override
    public CallbackResult callback(String code, String state, String stateInCookie, String verifierInCookie) {
        if (stateInCookie == null || verifierInCookie == null || !state.equals(stateInCookie)) {
            throw new UnauthenticatedException("OAuth state is invalid");
        }

        AuthTokenResponse tokens = keycloakAuthService.exchangeAuthorizationCode(code, verifierInCookie);
        if (tokens.getRefreshToken() == null || tokens.getRefreshToken().isBlank()) {
            throw new UnauthenticatedException("Missing refresh token from identity provider");
        }

        return new CallbackResult(
                frontendCallbackUrl,
                createRefreshCookie(tokens.getRefreshToken(), tokens.getRefreshExpiresIn()),
                clearCookie(STATE_COOKIE_NAME),
                clearCookie(VERIFIER_COOKIE_NAME)
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

        AccessTokenResponse response = AccessTokenResponse.builder()
                .accessToken(tokenResponse.getAccessToken())
                .tokenType(tokenResponse.getTokenType())
                .expiresIn(tokenResponse.getExpiresIn())
                .scope(tokenResponse.getScope())
                .build();

        return new RefreshResult(
                response,
                createRefreshCookie(rotatedRefreshToken, tokenResponse.getRefreshExpiresIn())
        );
    }

    @Override
    public LogoutResult logout(String refreshToken, HttpServletRequest request) {
        keycloakAuthService.revokeRefreshToken(refreshToken);
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }

        return new LogoutResult(List.of(
                clearCookie(REFRESH_COOKIE_NAME),
                clearCookie(STATE_COOKIE_NAME),
                clearCookie(VERIFIER_COOKIE_NAME)
        ));
    }

    private ResponseCookie createTemporaryCookie(String name, String value) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(300)
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

    private String randomUrlSafe(int bytes) {
        byte[] random = new byte[bytes];
        new SecureRandom().nextBytes(random);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    }

    private String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to generate PKCE code challenge", ex);
        }
    }
}
