package iuh.fit.identity_service.services;

import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;

public interface KeycloakAuthService {
    RegisterResponse register(RegisterRequest request);

    void resendVerificationEmail(String phoneNumber, String email);

    void forgotPassword(String phoneNumber, String email);

    AuthTokenResponse login(String phoneNumber, String password);

    AuthTokenResponse refreshToken(String refreshToken);

    void revokeRefreshToken(String refreshToken);
}
