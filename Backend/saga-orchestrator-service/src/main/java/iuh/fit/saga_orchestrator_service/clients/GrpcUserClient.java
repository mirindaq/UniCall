package iuh.fit.saga_orchestrator_service.clients;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.unicall.grpc.user.v1.CreateUserProfileRequest;
import iuh.fit.unicall.grpc.user.v1.CreateUserProfileResponse;
import iuh.fit.unicall.grpc.user.v1.DeleteUserProfileRequest;
import iuh.fit.unicall.grpc.user.v1.DeleteUserProfileResponse;
import iuh.fit.unicall.grpc.user.v1.UserRegistrationServiceGrpc;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class GrpcUserClient {
    @GrpcClient("user-service")
    private UserRegistrationServiceGrpc.UserRegistrationServiceBlockingStub userStub;

    private final long deadlineMs;

    public GrpcUserClient(@Value("${app.grpc.user-service.deadline-ms:3000}") long deadlineMs) {
        this.deadlineMs = deadlineMs;
    }

    public void createUserProfile(
            String identityUserId,
            String phoneNumber,
            String firstName,
            String lastName,
            String gender,
            String dateOfBirth
    ) {
        CreateUserProfileRequest request = CreateUserProfileRequest.newBuilder()
                .setIdentityUserId(identityUserId)
                .setPhoneNumber(phoneNumber)
                .setFirstName(firstName)
                .setLastName(lastName)
                .setGender(gender)
                .setDateOfBirth(dateOfBirth)
                .build();
        try {
            CreateUserProfileResponse response = userStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .createUserProfile(request);
            if (response.getId() <= 0) {
                throw new RuntimeException("User service returned invalid profile id");
            }
        } catch (StatusRuntimeException ex) {
            throw mapException(ex);
        }
    }

    public void deleteUserProfile(String identityUserId) {
        DeleteUserProfileRequest request = DeleteUserProfileRequest.newBuilder()
                .setIdentityUserId(identityUserId)
                .build();
        try {
            DeleteUserProfileResponse response = userStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .deleteUserProfile(request);
            if (!response.getDeleted()) {
                throw new RuntimeException("User service did not delete user profile");
            }
        } catch (StatusRuntimeException ex) {
            throw mapException(ex);
        }
    }

    private RuntimeException mapException(StatusRuntimeException ex) {
        Status.Code code = ex.getStatus().getCode();
        String description = ex.getStatus().getDescription();
        String message = description == null || description.isBlank()
                ? "User service gRPC error"
                : description;

        if (code == Status.Code.ALREADY_EXISTS) {
            return new ConflictException(message);
        }

        if (code == Status.Code.INVALID_ARGUMENT) {
            return new InvalidParamException(message);
        }

        return new RuntimeException(message, ex);
    }
}
