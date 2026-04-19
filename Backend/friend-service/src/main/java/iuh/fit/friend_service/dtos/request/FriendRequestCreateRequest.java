package iuh.fit.friend_service.dtos.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestCreateRequest {

    @NotNull(message = "Id account sent không được de trong")
    private String idAccountSent;

    @NotNull(message = "Id account receive không được de trong")
    private String idAccountReceive;


    private String pathAvartar = "";

    @NotNull
    @Size(max = 40, message = "First name không được dài hơn 40 ký tự")
    private String firstNameSender;

    @NotNull
    @Size(max = 40, message = "Last name không được dài hơn 40 ký tự")
    private String lastNameSender;
    private String firstNameReceiver;
    private String lastNameReceiver;

    @Size(max = 200, message = "Nội dung không được dài quá 120 ký tự")
    private String content = "";

}

