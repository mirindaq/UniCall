package iuh.fit.friend_service.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendshipResponse {
    private String idRequest;
    private boolean areFriends;
    private boolean isYourself;
    private String note;
    private boolean isMeSent;
}
