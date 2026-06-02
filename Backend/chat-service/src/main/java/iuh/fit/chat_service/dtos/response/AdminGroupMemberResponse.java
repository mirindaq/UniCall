package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.enums.ParicipantRole;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminGroupMemberResponse {
  private String identityUserId;
  private String displayName;
  private String role;
  private String nickname;
  private LocalDateTime joinedAt;

  public static AdminGroupMemberResponse from(
      String identityUserId,
      String displayName,
      ParicipantRole role,
      String nickname,
      LocalDateTime joinedAt
  ) {
    return AdminGroupMemberResponse.builder()
        .identityUserId(identityUserId)
        .displayName(displayName != null && !displayName.isBlank() ? displayName : identityUserId)
        .role(role == null ? null : role.name())
        .nickname(nickname)
        .joinedAt(joinedAt)
        .build();
  }
}
