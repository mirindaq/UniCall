package iuh.fit.user_service.clients;

import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.unicall.grpc.identity.v1.IdentityServiceGrpc;
import iuh.fit.unicall.grpc.identity.v1.VerifyPasswordRequest;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
public class GrpcIdentityServiceClient {
    private final String host;
    private final int port;
    private final long deadlineMs;

    private ManagedChannel channel;
    private IdentityServiceGrpc.IdentityServiceBlockingStub identityStub;

    public GrpcIdentityServiceClient(
            @Value("${grpc.identity-service.host:localhost}") String host,
            @Value("${grpc.identity-service.port:9092}") int port,
            @Value("${grpc.identity-service.deadline-ms:5000}") long deadlineMs
    ) {
        this.host = host;
        this.port = port;
        this.deadlineMs = deadlineMs;
    }

    @PostConstruct
    void init() {
        channel = ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()
                .build();
        identityStub = IdentityServiceGrpc.newBlockingStub(channel);
    }

    @PreDestroy
    void shutdown() {
        if (channel != null) {
            channel.shutdown();
        }
    }

    public void verifyPassword(String identityUserId, String phoneNumber, String password) {
        VerifyPasswordRequest request = VerifyPasswordRequest.newBuilder()
                .setIdentityUserId(identityUserId == null ? "" : identityUserId)
                .setPhoneNumber(phoneNumber == null ? "" : phoneNumber)
                .setPassword(password == null ? "" : password)
                .build();

        try {
            identityStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .verifyPassword(request);
        } catch (StatusRuntimeException ex) {
            Status.Code code = ex.getStatus().getCode();
            String message = ex.getStatus().getDescription();
            if (message == null || message.isBlank()) {
                message = "Unable to verify password";
            }

            if (code == Status.Code.UNAUTHENTICATED || code == Status.Code.INVALID_ARGUMENT) {
                throw new InvalidParamException(message);
            }
            throw new RuntimeException("Identity service is unavailable", ex);
        }
    }
}
