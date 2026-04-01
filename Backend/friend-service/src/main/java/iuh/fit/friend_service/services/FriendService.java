package iuh.fit.friend_service.services;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.friend_service.dtos.response.FriendResponse;
import iuh.fit.friend_service.entities.FriendRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface FriendService {
    void createFriendService(FriendRequest friendRequest);
    List<FriendResponse> getAllFriendByIdAccount(String idAccount);
    boolean areFriends(String idAccountSource, String idAccountTarget);
    void deleteFriend(String idFriend);
}
