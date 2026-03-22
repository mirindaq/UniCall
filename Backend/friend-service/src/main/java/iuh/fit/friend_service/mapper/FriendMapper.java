package iuh.fit.friend_service.mapper;


import iuh.fit.friend_service.dtos.request.FriendCreateRequest;
import iuh.fit.friend_service.dtos.response.FriendResponse;
import iuh.fit.friend_service.entities.Friend;
import iuh.fit.friend_service.entities.FriendRequest;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface FriendMapper {
    Friend toFriend(FriendCreateRequest friendCreateRequest);
    Friend toFriend(FriendRequest friendRequest);

    FriendResponse toFriendResponse(Friend friend)
;}
