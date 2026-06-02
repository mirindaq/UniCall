package iuh.fit.post_service.dtos.response;

import java.time.LocalDateTime;

import iuh.fit.post_service.enums.PostStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AdminPostResponse {
  private Long id;
  private String authorId;
  private String authorName;
  private String content;
  private PostStatus status;
  private Integer flaggedCount;
  private LocalDateTime createdAt;

  public static AdminPostResponse from(Long id, String authorId, String authorName,
                                       String content, PostStatus status,
                                       Integer flaggedCount, LocalDateTime createdAt) {
    return AdminPostResponse.builder()
        .id(id)
        .authorId(authorId)
        .authorName(authorName != null ? authorName : authorId)
        .content(content)
        .status(status)
        .flaggedCount(flaggedCount != null ? flaggedCount : 0)
        .createdAt(createdAt)
        .build();
  }
}
