package iuh.fit.identity_service.services;

import iuh.fit.identity_service.dtos.request.auth.ChangePasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.ForgotPasswordRequest;
import iuh.fit.identity_service.dtos.request.auth.LoginRequest;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.request.auth.ResendVerificationEmailRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;

import java.util.List;

public interface AuthService {
    RegisterResponse register(RegisterRequest request);

    void resendVerificationEmail(ResendVerificationEmailRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    void changePassword(ChangePasswordRequest request);

    void verifyPassword(String identityUserId, String phoneNumber, String password);

    LoginResult login(LoginRequest request);

    RefreshResult refresh(String refreshToken);

    LogoutResult logout(String refreshToken, HttpServletRequest request);

    record LoginResult(List<ResponseCookie> cookies, AuthTokenResponse tokens) {
    }

    record RefreshResult(List<ResponseCookie> cookies, AuthTokenResponse tokens) {
    }

    record LogoutResult(List<ResponseCookie> clearCookies) {
    }
}
