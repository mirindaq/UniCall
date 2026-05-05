package iuh.fit.post_service.entities;

import iuh.fit.post_service.enums.ReactionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "post_reactions", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"postId", "userId"}),
       indexes = {
           @Index(name = "idx_post_id", columnList = "postId"),
           @Index(name = "idx_user_id", columnList = "userId"),
           @Index(name = "idx_reaction_type", columnList = "reactionType")
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostLike {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long postId;

    @Column(nullable = false, length = 100)
    private String userId; // identityUserId from user-service

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ReactionType reactionType = ReactionType.LIKE;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
