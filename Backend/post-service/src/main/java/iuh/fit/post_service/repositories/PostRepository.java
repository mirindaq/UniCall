package iuh.fit.post_service.repositories;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import iuh.fit.post_service.entities.Post;
import iuh.fit.post_service.enums.PostPrivacy;
import iuh.fit.post_service.enums.PostStatus;

@Repository
public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {
    
    Optional<Post> findByIdAndStatus(Long id, PostStatus status);
    
    Page<Post> findByAuthorIdAndStatus(String authorId, PostStatus status, Pageable pageable);
    
    Page<Post> findByStatus(PostStatus status, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.status = :status AND (p.privacy = :privacy OR p.authorId = :userId)")
    Page<Post> findFeedPosts(@Param("status") PostStatus status, @Param("privacy") PostPrivacy privacy, @Param("userId") String userId, Pageable pageable);
    
    long countByAuthorIdAndStatus(String authorId, PostStatus status);
    
    @Modifying
    @Query("UPDATE Post p SET p.likeCount = p.likeCount + :delta WHERE p.id = :postId")
    void updateLikeCount(@Param("postId") Long postId, @Param("delta") long delta);
    
    @Modifying
    @Query("UPDATE Post p SET p.commentCount = p.commentCount + :delta WHERE p.id = :postId")
    void updateCommentCount(@Param("postId") Long postId, @Param("delta") long delta);
}
