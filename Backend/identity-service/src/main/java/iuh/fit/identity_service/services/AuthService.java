package iuh.fit.identity_service.services;

import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AccessTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;

import java.util.List;

public interface AuthService {
    RegisterResponse register(RegisterRequest request);

    LoginResult login();

    CallbackResult callback(String code, String state, String stateInCookie, String verifierInCookie);

    RefreshResult refresh(String refreshToken);

    LogoutResult logout(String refreshToken, HttpServletRequest request);

    record LoginResult(String authorizationUrl, ResponseCookie stateCookie, ResponseCookie verifierCookie) {
    }

    record CallbackResult(
            String redirectUrl,
            ResponseCookie refreshCookie,
            ResponseCookie clearStateCookie,
            ResponseCookie clearVerifierCookie
    ) {
    }

    record RefreshResult(AccessTokenResponse accessTokenResponse, ResponseCookie refreshCookie) {
    }

    record LogoutResult(List<ResponseCookie> clearCookies) {
    }
}
