package iuh.fit.chat_service.clients;

import iuh.fit.unicall.grpc.friend.v1.CheckRelationshipRequest;
import iuh.fit.unicall.grpc.friend.v1.CheckRelationshipResponse;
import iuh.fit.unicall.grpc.friend.v1.FriendServiceGrpc;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class GrpcFriendServiceClient {

    @GrpcClient("friend-service")
    private FriendServiceGrpc.FriendServiceBlockingStub friendStub;

    private final long deadlineMs;

    public GrpcFriendServiceClient(@Value("${grpc.friend-service.deadline-ms:5000}") long deadlineMs) {
        this.deadlineMs = deadlineMs;
    }

    public Optional<RelationshipInfo> checkRelationship(String idAccountOrigin, String idAccountTarget) {
        if (idAccountOrigin == null || idAccountOrigin.isBlank() ||
                idAccountTarget == null || idAccountTarget.isBlank()) {
            return Optional.empty();
        }

        CheckRelationshipRequest request = CheckRelationshipRequest.newBuilder()
                .setIdAccountOrigin(idAccountOrigin)
                .setIdAccountTarget(idAccountTarget)
                .build();

        try {
            CheckRelationshipResponse response = friendStub
                    .withDeadlineAfter(deadlineMs, TimeUnit.MILLISECONDS)
                    .checkRelationship(request);

            return Optional.of(new RelationshipInfo(
                    response.getAreFriends(),
                    response.getIsYourself(),
                    response.getIsMeSent(),
                    blankToNull(response.getIdRequest()),
                    blankToNull(response.getNote())
            ));
        } catch (StatusRuntimeException ex) {
            if (ex.getStatus().getCode() == Status.Code.NOT_FOUND) {
                return Optional.empty();
            }
            log.warn("Cannot check relationship via gRPC for origin={} target={}: {}",
                    idAccountOrigin, idAccountTarget, ex.getMessage());
            return Optional.empty();
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    public record RelationshipInfo(
            boolean areFriends,
            boolean yourself,
            boolean meSent,
            String idRequest,
            String note
    ) {
    }
}
