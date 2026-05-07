package iuh.fit.post_service.repositories;

import iuh.fit.post_service.entities.PostLike;
import iuh.fit.post_service.enums.ReactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    
    Optional<PostLike> findByPostIdAndUserId(Long postId, String userId);
    
    boolean existsByPostIdAndUserId(Long postId, String userId);
    
    long countByPostId(Long postId);
    
    long countByPostIdAndReactionType(Long postId, ReactionType reactionType);
    
    Page<PostLike> findByPostId(Long postId, Pageable pageable);
    
    List<PostLike> findByPostId(Long postId);
    
    void deleteByPostIdAndUserId(Long postId, String userId);
    
    @Query("SELECT pl.reactionType, COUNT(pl) FROM PostLike pl WHERE pl.postId = :postId GROUP BY pl.reactionType")
    List<Object[]> countReactionsByPostId(@Param("postId") Long postId);
}
