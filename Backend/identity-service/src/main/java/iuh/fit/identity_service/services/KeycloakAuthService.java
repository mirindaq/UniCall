package iuh.fit.identity_service.services;

import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;

public interface KeycloakAuthService {
    RegisterResponse register(RegisterRequest request);

    AuthTokenResponse login(String phoneNumber, String password);

    AuthTokenResponse refreshToken(String refreshToken);

    void revokeRefreshToken(String refreshToken);
}
