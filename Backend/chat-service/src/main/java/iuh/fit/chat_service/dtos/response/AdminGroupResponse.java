package iuh.fit.chat_service.dtos.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminGroupResponse {
  private String id;
  private String name;
  private String ownerId;
  private String ownerName;
  private Integer memberCount;
  private Boolean isPrivate;
  private Integer pendingCount;
  private LocalDateTime createdAt;

  public static AdminGroupResponse from(String id, String name, String ownerId, String ownerName,
                                        Integer memberCount, Boolean isPrivate,
                                        Integer pendingCount, LocalDateTime createdAt) {
    return AdminGroupResponse.builder()
        .id(id)
        .name(name)
        .ownerId(ownerId)
        .ownerName(ownerName != null ? ownerName : ownerId)
        .memberCount(memberCount != null ? memberCount : 0)
        .isPrivate(isPrivate != null ? isPrivate : false)
        .pendingCount(pendingCount != null ? pendingCount : 0)
        .createdAt(createdAt)
        .build();
  }
}
