package iuh.fit.saga_orchestrator_service.orchestrator;

import iuh.fit.saga_orchestrator_service.clients.GrpcUserServiceClient;
import iuh.fit.unicall.grpc.saga.signup.v1.UserRequest;
import iuh.fit.unicall.grpc.saga.signup.v1.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SignupSagaOrchestrator {
    private final GrpcUserServiceClient grpcUserServiceClient;

    public UserResponse register(UserRequest request) {
        String identityUserId = request.getIdentityUserId();
        log.info("Start signup saga for phoneNumber={}", request.getPhoneNumber());

        try {
            grpcUserServiceClient.createUserProfile(
                    identityUserId,
                    request.getPhoneNumber(),
                    request.getFirstName(),
                    request.getLastName(),
                    request.getGender(),
                    request.getDateOfBirth()
            );
            log.info("Signup saga completed for identityUserId={}", identityUserId);

            return UserResponse.newBuilder()
                    .setUserId(identityUserId)
                    .setPhoneNumber(request.getPhoneNumber())
                    .setFirstName(request.getFirstName())
                    .setLastName(request.getLastName())
                    .setGender(request.getGender())
                    .setDateOfBirth(request.getDateOfBirth())
                    .setMessage("Registration successful")
                    .build();
        } catch (RuntimeException ex) {
            log.error("Signup saga exception for phoneNumber={}: {}", request.getPhoneNumber(), ex.getMessage(), ex);
            compensate(identityUserId);
            throw ex;
        }
    }

    private void compensate(String identityUserId) {
        if (identityUserId != null && !identityUserId.isBlank()) {
            try {
                grpcUserServiceClient.deleteUserProfile(identityUserId);
                log.warn("Compensated user profile for identityUserId={}", identityUserId);
            } catch (Exception compensationEx) {
                log.error("Failed compensating user profile for identityUserId={}", identityUserId, compensationEx);
            }
        }
    }
}
