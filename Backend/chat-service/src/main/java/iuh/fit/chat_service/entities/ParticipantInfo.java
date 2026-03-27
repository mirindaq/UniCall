package iuh.fit.chat_service.entities;

import iuh.fit.chat_service.enums.ParicipantRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantInfo {
    private String idAccount;
    private ParicipantRole role;
    private String nickname;
    private LocalDateTime dateJoin;
}
