package iuh.fit.post_service.services;

import iuh.fit.post_service.dtos.request.CreateCommentRequest;
import iuh.fit.post_service.dtos.request.UpdateCommentRequest;
import iuh.fit.post_service.entities.Comment;
import iuh.fit.post_service.enums.ReactionType;
import org.springframework.data.domain.Page;

import java.util.List;

public interface CommentService {
    Comment createComment(String authorId, CreateCommentRequest request);
    
    Comment updateComment(String authorId, Long commentId, UpdateCommentRequest request);
    
    void deleteComment(String authorId, Long commentId);
    
    Comment getCommentById(Long commentId);
    
    Page<Comment> getCommentsByPost(Long postId, int page, int limit, String sortBy);
    
    List<Comment> getRepliesByComment(Long commentId);
    
    boolean isCommentReactedByUser(Long commentId, String userId);
    
    ReactionType getUserReactionType(Long commentId, String userId);
}
