package iuh.fit.friend_service.grpc;

import iuh.fit.friend_service.dtos.response.FriendshipResponse;
import iuh.fit.friend_service.services.FriendRequestService;
import iuh.fit.unicall.grpc.friend.v1.CheckRelationshipRequest;
import iuh.fit.unicall.grpc.friend.v1.CheckRelationshipResponse;
import iuh.fit.unicall.grpc.friend.v1.FriendServiceGrpc;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class GrpcFriendService extends FriendServiceGrpc.FriendServiceImplBase {

    private final FriendRequestService friendRequestService;

    @Override
    public void checkRelationship(
            CheckRelationshipRequest request,
            StreamObserver<CheckRelationshipResponse> responseObserver
    ) {
        try {
            String idAccountOrigin = request.getIdAccountOrigin();
            String idAccountTarget = request.getIdAccountTarget();

            if (idAccountOrigin == null || idAccountOrigin.isBlank() ||
                    idAccountTarget == null || idAccountTarget.isBlank()) {
                responseObserver.onError(Status.INVALID_ARGUMENT
                        .withDescription("Thiếu idAccountOrigin hoặc idAccountTarget")
                        .asRuntimeException());
                return;
            }

            FriendshipResponse relationship = friendRequestService
                    .getRelationshipStatus(idAccountOrigin.trim(), idAccountTarget.trim());

            if (idAccountOrigin.trim().equals(idAccountTarget.trim())) {
                relationship.setYourself(true);
            }

            CheckRelationshipResponse response = CheckRelationshipResponse.newBuilder()
                    .setIdRequest(relationship.getIdRequest() == null ? "" : relationship.getIdRequest())
                    .setAreFriends(relationship.isAreFriends())
                    .setIsYourself(relationship.isYourself())
                    .setNote(relationship.getNote() == null ? "" : relationship.getNote())
                    .setIsMeSent(relationship.isMeSent())
                    .build();

            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception ex) {
            log.warn("gRPC checkRelationship failed: {}", ex.getMessage());
            responseObserver.onError(Status.INTERNAL
                    .withDescription("Không thể kiểm tra quan hệ bạn bè")
                    .asRuntimeException());
        }
    }
}
