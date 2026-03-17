package iuh.fit.identity_service.clients;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaRequest;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaResponse;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class SignupSagaGrpcClient {
    private final ManagedChannel channel;
    private final SignupSagaServiceGrpc.SignupSagaServiceBlockingStub signupSagaStub;
    private final long deadlineMs;

    public SignupSagaGrpcClient(
            @Value("${grpc.saga-orchestrator.host:localhost}") String host,
            @Value("${grpc.saga-orchestrator.port:9096}") int port,
            @Value("${grpc.saga-orchestrator.deadline-ms:5000}") long deadlineMs
    ) {
        this.channel = ManagedChannelBuilder.forAddress(host, port).usePlaintext().build();
        this.signupSagaStub = SignupSagaServiceGrpc.newBlockingStub(channel);
        this.deadlineMs = deadlineMs;
    }

    public RegisterResponse register(RegisterRequest request) {
        SignupSagaRequest grpcRequest = SignupSagaRequest.newBuilder()
                .setPhoneNumber(request.getPhoneNumber())
                .setFirstName(request.getFirstName())
                .setLastName(request.getLastName())
                .setGender(request.getGender())
                .setDateOfBirth(request.getDateOfBirth().toString())
                .setPassword(request.getPassword())
                .build();
        try {
            SignupSagaResponse response = signupSagaStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .registerUser(grpcRequest);

            return RegisterResponse.builder()
                    .userId(response.getUserId())
                    .phoneNumber(response.getPhoneNumber())
                    .firstName(response.getFirstName())
                    .lastName(response.getLastName())
                    .gender(response.getGender())
                    .dateOfBirth(request.getDateOfBirth())
                    .message(response.getMessage())
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

    @PreDestroy
    public void shutdown() {
        channel.shutdown();
    }
}
