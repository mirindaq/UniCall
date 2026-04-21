package iuh.fit.post_service.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments", indexes = {
        @Index(name = "idx_post_id", columnList = "postId"),
        @Index(name = "idx_author_id", columnList = "authorId"),
        @Index(name = "idx_parent_comment_id", columnList = "parentCommentId"),
        @Index(name = "idx_created_at", columnList = "createdAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long postId;

    @Column(nullable = false, length = 100)
    private String authorId; // identityUserId from user-service

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column
    private Long parentCommentId; // For nested comments/replies

    @Column(nullable = false)
    @Builder.Default
    private Long likeCount = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Long replyCount = 0L;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
