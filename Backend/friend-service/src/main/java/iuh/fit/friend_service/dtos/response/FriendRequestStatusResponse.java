package iuh.fit.friend_service.dtos.response;


import iuh.fit.friend_service.enums.FriendRequestEnum;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestStatusResponse {
    private String idFriendRequest;
    private FriendRequestEnum status;
}
