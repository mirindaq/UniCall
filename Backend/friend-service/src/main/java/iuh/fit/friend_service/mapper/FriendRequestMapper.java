package iuh.fit.friend_service.mapper;


import iuh.fit.friend_service.dtos.request.FriendRequestCreateRequest;
import iuh.fit.friend_service.dtos.response.FriendRequestResponse;
import iuh.fit.friend_service.entities.FriendRequest;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FriendRequestMapper {
    FriendRequest toFriendRequest(FriendRequestCreateRequest friendRequestCreateRequest);
    FriendRequestResponse toFriendRequestResponse(FriendRequest friendRequest);
}
