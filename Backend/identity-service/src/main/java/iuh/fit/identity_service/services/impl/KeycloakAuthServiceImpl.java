package iuh.fit.identity_service.services.impl;

import iuh.fit.identity_service.clients.KeycloakIdentityClient;
import iuh.fit.identity_service.clients.GrpcUserServiceClient;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.identity_service.services.EmailService;
import iuh.fit.identity_service.services.KeycloakAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class KeycloakAuthServiceImpl implements KeycloakAuthService {
    private final KeycloakIdentityClient keycloakIdentityClient;
    private final GrpcUserServiceClient grpcUserServiceClient;
    private final EmailService emailService;

    @Override
    public RegisterResponse register(RegisterRequest request) {
        String identityUserId = keycloakIdentityClient.createUser(request);
        try {
            RegisterResponse response = grpcUserServiceClient.register(request, identityUserId);
            emailService.sendActivationEmailAsync(identityUserId);
            response.setMessage("Registration successful. Please verify your email to activate account.");
            return response;
        } catch (RuntimeException ex) {
            keycloakIdentityClient.deleteUser(identityUserId);
            throw ex;
        }
    }

    @Override
    public void resendVerificationEmail(String phoneNumber, String email) {
        keycloakIdentityClient.resendVerificationEmail(phoneNumber, email);
    }

    @Override
    public void forgotPassword(String phoneNumber, String email) {
        String identityUserId = keycloakIdentityClient.findUserIdByPhoneAndEmail(phoneNumber, email);
        emailService.sendPasswordResetEmailAsync(identityUserId);
    }

    @Override
    public AuthTokenResponse login(String phoneNumber, String password) {
        return keycloakIdentityClient.login(phoneNumber, password);
    }

    @Override
    public AuthTokenResponse refreshToken(String refreshToken) {
        return keycloakIdentityClient.refreshToken(refreshToken);
    }

    @Override
    public void revokeRefreshToken(String refreshToken) {
        keycloakIdentityClient.revokeRefreshToken(refreshToken);
    }
}
