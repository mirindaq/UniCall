package iuh.fit.identity_service.clients;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.unicall.grpc.user.v1.CreateUserProfileRequest;
import iuh.fit.unicall.grpc.user.v1.CreateUserProfileResponse;
import iuh.fit.unicall.grpc.user.v1.UserServiceGrpc;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class GrpcUserServiceClient {
    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userStub;

    private final long deadlineMs;

    public GrpcUserServiceClient(@Value("${grpc.user-service.deadline-ms:5000}") long deadlineMs) {
        this.deadlineMs = deadlineMs;
    }

    public RegisterResponse register(RegisterRequest request, String identityUserId) {
        CreateUserProfileRequest grpcRequest = CreateUserProfileRequest.newBuilder()
                .setIdentityUserId(identityUserId)
                .setPhoneNumber(request.getPhoneNumber())
                .setEmail(request.getEmail())
                .setFirstName(request.getFirstName())
                .setLastName(request.getLastName())
                .setGender(request.getGender())
                .setDateOfBirth(request.getDateOfBirth().toString())
                .build();
        try {
            CreateUserProfileResponse response = userStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .createUserProfile(grpcRequest);

            String persistedIdentityUserId = response.getIdentityUserId();
            if (persistedIdentityUserId == null || persistedIdentityUserId.isBlank()) {
                throw new RuntimeException("User service returned an empty identityUserId");
            }

            return RegisterResponse.builder()
                    .userId(persistedIdentityUserId)
                    .phoneNumber(request.getPhoneNumber())
                    .email(request.getEmail())
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .gender(request.getGender())
                    .dateOfBirth(request.getDateOfBirth())
                    .message("Registration successful")
                    .build();
        } catch (StatusRuntimeException ex) {
            throw mapException(ex);
        }
    }

    private RuntimeException mapException(StatusRuntimeException ex) {
        Status.Code code = ex.getStatus().getCode();
        String description = ex.getStatus().getDescription();
        String message = description == null || description.isBlank()
                ? "Saga orchestrator service error"
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
