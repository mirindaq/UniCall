package iuh.fit.identity_service.services;

import iuh.fit.identity_service.dtos.request.auth.LoginRequest;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AccessTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;

import java.util.List;

public interface AuthService {
    RegisterResponse register(RegisterRequest request);

    LoginResult login(LoginRequest request);

    RefreshResult refresh(String refreshToken);

    LogoutResult logout(String refreshToken, HttpServletRequest request);

    record LoginResult(AccessTokenResponse accessTokenResponse, ResponseCookie refreshCookie) {
    }

    record RefreshResult(AccessTokenResponse accessTokenResponse, ResponseCookie refreshCookie) {
    }

    record LogoutResult(List<ResponseCookie> clearCookies) {
    }
}
