package iuh.fit.post_service.repositories;

import iuh.fit.post_service.entities.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    
    Page<Comment> findByPostIdAndIsDeletedAndParentCommentIdIsNull(
            Long postId, Boolean isDeleted, Pageable pageable);
    
    List<Comment> findByParentCommentIdAndIsDeleted(Long parentCommentId, Boolean isDeleted);
    
    Optional<Comment> findByIdAndIsDeleted(Long id, Boolean isDeleted);
    
    long countByPostIdAndIsDeleted(Long postId, Boolean isDeleted);
    
    long countByParentCommentIdAndIsDeleted(Long parentCommentId, Boolean isDeleted);
    
    @Modifying
    @Query("UPDATE Comment c SET c.likeCount = c.likeCount + :delta WHERE c.id = :commentId")
    void updateLikeCount(@Param("commentId") Long commentId, @Param("delta") long delta);
    
    @Modifying
    @Query("UPDATE Comment c SET c.replyCount = c.replyCount + :delta WHERE c.id = :commentId")
    void updateReplyCount(@Param("commentId") Long commentId, @Param("delta") long delta);
}
