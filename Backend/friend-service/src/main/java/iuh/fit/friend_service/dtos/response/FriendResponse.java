package iuh.fit.friend_service.dtos.response;

import iuh.fit.friend_service.enums.FriendTypeEnum;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendResponse {
    private String idFriend;
    private String idAccountSent;
    private String idAccountReceive;
    private String pathAvartar;
    private String firstName;
    private String lastName;
    private LocalDateTime timeCreate;
    private FriendTypeEnum friendType;
}
