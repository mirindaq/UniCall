package iuh.fit.chat_service.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupMemberJoinRequest {
    private String idRequest;
    private String requesterIdentityUserId;
    private String targetIdentityUserId;
    private LocalDateTime requestedAt;
}
