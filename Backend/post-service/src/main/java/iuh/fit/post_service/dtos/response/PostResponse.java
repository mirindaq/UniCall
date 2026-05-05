package iuh.fit.post_service.dtos.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import iuh.fit.post_service.entities.Post;
import iuh.fit.post_service.enums.PostPrivacy;
import iuh.fit.post_service.enums.PostStatus;
import iuh.fit.post_service.enums.ReactionType;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PostResponse {
    private Long id;
    private String authorId;
    private String content;
    private List<String> mediaUrls;
    private PostPrivacy privacy;
    private PostStatus status;
    private Long likeCount;
    private Long commentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isLikedByCurrentUser;
    private ReactionType userReactionType;
    private Map<ReactionType, Long> reactionCounts;
    
    public static PostResponse from(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .content(post.getContent())
                .mediaUrls(post.getMediaUrls())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
    
    public static PostResponse from(Post post, boolean isLikedByCurrentUser) {
        return PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .content(post.getContent())
                .mediaUrls(post.getMediaUrls())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .isLikedByCurrentUser(isLikedByCurrentUser)
                .build();
    }
    
    public static PostResponse from(Post post, boolean isLikedByCurrentUser, ReactionType userReactionType) {
        return PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .content(post.getContent())
                .mediaUrls(post.getMediaUrls())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .isLikedByCurrentUser(isLikedByCurrentUser)
                .userReactionType(userReactionType)
                .build();
    }
    
    public static PostResponse from(Post post, boolean isLikedByCurrentUser, ReactionType userReactionType, Map<ReactionType, Long> reactionCounts) {
        return PostResponse.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .content(post.getContent())
                .mediaUrls(post.getMediaUrls())
                .privacy(post.getPrivacy())
                .status(post.getStatus())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .isLikedByCurrentUser(isLikedByCurrentUser)
                .userReactionType(userReactionType)
                .reactionCounts(reactionCounts)
                .build();
    }
}
