package iuh.fit.friend_service.clients;

import iuh.fit.unicall.grpc.user.v1.GetFriendInvitePrivacyByIdentityRequest;
import iuh.fit.unicall.grpc.user.v1.UserServiceGrpc;
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
public class GrpcUserPrivacyClient {
    private final String host;
    private final int port;
    private final long deadlineMs;

    private ManagedChannel channel;
    private UserServiceGrpc.UserServiceBlockingStub userStub;

    public GrpcUserPrivacyClient(
            @Value("${grpc.user-service.host:localhost}") String host,
            @Value("${grpc.user-service.port:9091}") int port,
            @Value("${grpc.user-service.deadline-ms:5000}") long deadlineMs
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
        userStub = UserServiceGrpc.newBlockingStub(channel);
    }

    @PreDestroy
    void shutdown() {
        if (channel != null) {
            channel.shutdown();
        }
    }

    public boolean allowFriendInvites(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            return true;
        }

        try {
            return userStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .getFriendInvitePrivacyByIdentity(
                            GetFriendInvitePrivacyByIdentityRequest.newBuilder()
                                    .setIdentityUserId(identityUserId)
                                    .build()
                    )
                    .getAllowFriendInvites();
        } catch (StatusRuntimeException ex) {
            if (ex.getStatus().getCode() == Status.Code.NOT_FOUND) {
                return true;
            }
            throw new RuntimeException("Unable to check user privacy", ex);
        }
    }
}
