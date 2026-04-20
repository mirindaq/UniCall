package iuh.fit.post_service.dtos.response;

import java.time.LocalDateTime;

import iuh.fit.post_service.entities.PostLike;
import iuh.fit.post_service.enums.ReactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionResponse {
    private Long id;
    private String userId;
    private String userName;
    private String userAvatar;
    private ReactionType reactionType;
    private LocalDateTime createdAt;
    
    public static ReactionResponse from(PostLike postLike, String userName, String userAvatar) {
        return ReactionResponse.builder()
                .id(postLike.getId())
                .userId(postLike.getUserId())
                .userName(userName)
                .userAvatar(userAvatar)
                .reactionType(postLike.getReactionType())
                .createdAt(postLike.getCreatedAt())
                .build();
    }
}
