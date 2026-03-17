package iuh.fit.saga_orchestrator_service.services.impl;

import iuh.fit.saga_orchestrator_service.clients.KeycloakAdminClient;
import iuh.fit.saga_orchestrator_service.clients.UserRegistrationGrpcClient;
import iuh.fit.saga_orchestrator_service.services.SignupSagaOrchestrationService;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaRequest;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SignupSagaOrchestrationServiceImpl implements SignupSagaOrchestrationService {
    private final KeycloakAdminClient keycloakAdminClient;
    private final UserRegistrationGrpcClient userRegistrationGrpcClient;

    @Override
    public SignupSagaResponse register(SignupSagaRequest request) {
        String keycloakUserId = null;
        boolean userProfileCreated = false;
        log.info("Start signup saga for phoneNumber={}", request.getPhoneNumber());

        try {
            keycloakUserId = keycloakAdminClient.createUser(request);
            userRegistrationGrpcClient.createUserProfile(
                    keycloakUserId,
                    request.getPhoneNumber(),
                    request.getFirstName(),
                    request.getLastName(),
                    request.getGender(),
                    request.getDateOfBirth()
            );
            userProfileCreated = true;
            log.info("Signup saga completed for keycloakUserId={}", keycloakUserId);

            return SignupSagaResponse.newBuilder()
                    .setUserId(keycloakUserId)
                    .setPhoneNumber(request.getPhoneNumber())
                    .setFirstName(request.getFirstName())
                    .setLastName(request.getLastName())
                    .setGender(request.getGender())
                    .setDateOfBirth(request.getDateOfBirth())
                    .setMessage("Registration successful")
                    .build();
        } catch (RuntimeException ex) {
            compensate(keycloakUserId, userProfileCreated);
            throw ex;
        }
    }

    private void compensate(String keycloakUserId, boolean userProfileCreated) {
        if (userProfileCreated && keycloakUserId != null && !keycloakUserId.isBlank()) {
            try {
                userRegistrationGrpcClient.deleteUserProfile(keycloakUserId);
                log.warn("Compensated user profile for keycloakUserId={}", keycloakUserId);
            } catch (Exception compensationEx) {
                log.error("Failed compensating user profile for keycloakUserId={}", keycloakUserId, compensationEx);
            }
        }

        if (keycloakUserId != null && !keycloakUserId.isBlank()) {
            try {
                keycloakAdminClient.deleteUser(keycloakUserId);
                log.warn("Compensated keycloak user for keycloakUserId={}", keycloakUserId);
            } catch (Exception compensationEx) {
                log.error("Failed compensating keycloak user for keycloakUserId={}", keycloakUserId, compensationEx);
            }
        }
    }
}
