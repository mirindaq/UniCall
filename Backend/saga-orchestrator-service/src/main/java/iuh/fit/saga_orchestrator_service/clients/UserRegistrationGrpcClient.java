package iuh.fit.saga_orchestrator_service.clients;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.unicall.grpc.user.v1.CreateUserProfileRequest;
import iuh.fit.unicall.grpc.user.v1.DeleteUserProfileRequest;
import iuh.fit.unicall.grpc.user.v1.UserRegistrationServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class UserRegistrationGrpcClient {
    private final ManagedChannel channel;
    private final UserRegistrationServiceGrpc.UserRegistrationServiceBlockingStub userRegistrationStub;
    private final long deadlineMs;

    public UserRegistrationGrpcClient(
            @Value("${grpc.user-service.host:localhost}") String host,
            @Value("${grpc.user-service.port:9091}") int port,
            @Value("${grpc.user-service.deadline-ms:3000}") long deadlineMs
    ) {
        this.channel = ManagedChannelBuilder.forAddress(host, port).usePlaintext().build();
        this.userRegistrationStub = UserRegistrationServiceGrpc.newBlockingStub(channel);
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
            userRegistrationStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .createUserProfile(request);
        } catch (StatusRuntimeException ex) {
            throw mapException(ex);
        }
    }

    public void deleteUserProfile(String identityUserId) {
        DeleteUserProfileRequest request = DeleteUserProfileRequest.newBuilder()
                .setIdentityUserId(identityUserId)
                .build();
        try {
            userRegistrationStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .deleteUserProfile(request);
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

    @PreDestroy
    public void shutdown() {
        channel.shutdown();
    }
}
