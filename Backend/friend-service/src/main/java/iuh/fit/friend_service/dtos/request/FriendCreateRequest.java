package iuh.fit.friend_service.dtos.request;


import iuh.fit.common_service.customEnum.ValidEnum;
import iuh.fit.friend_service.enums.FriendRequestEnum;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FriendCreateRequest {
    @NotNull
    private String idAccountSent;

    @NotNull
    private String idAccountReceive;

    @Length(max = 120, message = "Đường dẫn avatar không được quá 120 ký tự")
    private String pathAvartar = "";

    @NotNull(message = "First name khong duoc bo trong")
    @Size(max = 40, message = "First name không được dài hơn 40 ký tự")
    private String firstName;

    @NotNull(message = "Last name khong duoc bo trong")
    @Size(max = 40, message = "Last name không được dài hơn 40 ký tự")
    private String lastName;
//    private String firstNameReceiver;
//    private String lastNameReceiver;

    @ValidEnum(enumClass = FriendRequestEnum.class)
    private FriendRequestEnum status;
}
