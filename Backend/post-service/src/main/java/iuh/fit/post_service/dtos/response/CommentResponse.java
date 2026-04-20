package iuh.fit.post_service.dtos.response;

import iuh.fit.post_service.entities.Comment;
import iuh.fit.post_service.enums.ReactionType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CommentResponse {
    private Long id;
    private Long postId;
    private String authorId;
    private String content;
    private Long parentCommentId;
    private Long likeCount;
    private Long replyCount;
    private Boolean isDeleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isLikedByCurrentUser;
    private ReactionType userReactionType;
    
    public static CommentResponse from(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .authorId(comment.getAuthorId())
                .content(comment.getContent())
                .parentCommentId(comment.getParentCommentId())
                .likeCount(comment.getLikeCount())
                .replyCount(comment.getReplyCount())
                .isDeleted(comment.getIsDeleted())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
    
    public static CommentResponse from(Comment comment, boolean isLikedByCurrentUser) {
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .authorId(comment.getAuthorId())
                .content(comment.getContent())
                .parentCommentId(comment.getParentCommentId())
                .likeCount(comment.getLikeCount())
                .replyCount(comment.getReplyCount())
                .isDeleted(comment.getIsDeleted())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .isLikedByCurrentUser(isLikedByCurrentUser)
                .build();
    }
    
    public static CommentResponse from(Comment comment, boolean isLikedByCurrentUser, ReactionType userReactionType) {
        return CommentResponse.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .authorId(comment.getAuthorId())
                .content(comment.getContent())
                .parentCommentId(comment.getParentCommentId())
                .likeCount(comment.getLikeCount())
                .replyCount(comment.getReplyCount())
                .isDeleted(comment.getIsDeleted())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .isLikedByCurrentUser(isLikedByCurrentUser)
                .userReactionType(userReactionType)
                .build();
    }
}
