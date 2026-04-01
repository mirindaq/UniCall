package iuh.fit.friend_service.services;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.friend_service.dtos.request.FriendRequestCreateRequest;
import iuh.fit.friend_service.dtos.request.FriendRequestUpdateStatusRequest;
import iuh.fit.friend_service.dtos.response.FriendRequestResponse;
import iuh.fit.friend_service.dtos.response.FriendRequestStatusResponse;
import iuh.fit.friend_service.dtos.response.FriendshipResponse;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public interface FriendRequestService {
    String createFriendRequest(FriendRequestCreateRequest friendRequestCreateRequest);
    void updateFriendRequest(FriendRequestUpdateStatusRequest friendRequestUpdateStatusRequest, String idFriendRequest);

    PageResponse<FriendRequestResponse> getAllFriendRequestsByIdAccount(String idAccountReceive, int page, int size, String sortDirection);

    FriendshipResponse getRelationshipStatus(String idAccountSent, String idAccountTarget);
}
