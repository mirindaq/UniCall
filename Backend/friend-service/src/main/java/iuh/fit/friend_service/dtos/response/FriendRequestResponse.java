package iuh.fit.friend_service.dtos.response;


import iuh.fit.friend_service.enums.FriendRequestEnum;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestResponse {
    private String idFriendRequest;
    private String idAccountSent;
    private String pathAvartar;
    private String firstNameSender;
    private String lastNameSender;
    private String firstNameReceiver;
    private String lastNameReceiver;
    private String content;
    private LocalDateTime timeRequest;
    private FriendRequestEnum status;
}
