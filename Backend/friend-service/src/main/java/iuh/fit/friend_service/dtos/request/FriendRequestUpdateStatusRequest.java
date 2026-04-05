package iuh.fit.friend_service.dtos.request;

import iuh.fit.common_service.customEnum.ValidEnum;
import iuh.fit.friend_service.enums.FriendRequestEnum;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestUpdateStatusRequest {
    @ValidEnum(enumClass = FriendRequestEnum.class, message = "Invalid action value")
    private String status;
}
