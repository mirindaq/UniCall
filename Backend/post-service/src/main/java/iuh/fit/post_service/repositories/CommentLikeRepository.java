package iuh.fit.post_service.repositories;

import iuh.fit.post_service.entities.CommentLike;
import iuh.fit.post_service.enums.ReactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    
    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, String userId);
    
    boolean existsByCommentIdAndUserId(Long commentId, String userId);
    
    long countByCommentId(Long commentId);
    
    long countByCommentIdAndReactionType(Long commentId, ReactionType reactionType);
    
    List<CommentLike> findByCommentId(Long commentId);
    
    void deleteByCommentIdAndUserId(Long commentId, String userId);
    
    @Query("SELECT cl.reactionType, COUNT(cl) FROM CommentLike cl WHERE cl.commentId = :commentId GROUP BY cl.reactionType")
    List<Object[]> countReactionsByCommentId(@Param("commentId") Long commentId);
}
