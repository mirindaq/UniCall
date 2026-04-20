package iuh.fit.post_service.services.impl;

import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.common_service.exceptions.UnauthorizedException;
import iuh.fit.common_service.utils.SortUtils;
import iuh.fit.post_service.dtos.request.CreateCommentRequest;
import iuh.fit.post_service.dtos.request.UpdateCommentRequest;
import iuh.fit.post_service.entities.Comment;
import iuh.fit.post_service.entities.CommentLike;
import iuh.fit.post_service.enums.ReactionType;
import iuh.fit.post_service.repositories.CommentLikeRepository;
import iuh.fit.post_service.repositories.CommentRepository;
import iuh.fit.post_service.repositories.PostRepository;
import iuh.fit.post_service.services.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {
    
    private final CommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final PostRepository postRepository;
    
    @Override
    @Transactional
    public Comment createComment(String authorId, CreateCommentRequest request) {
        if (authorId == null || authorId.isBlank()) {
            throw new InvalidParamException("Author ID is required");
        }
        
        // Verify post exists
        if (!postRepository.existsById(request.getPostId())) {
            throw new ResourceNotFoundException("Post not found");
        }
        
        // If it's a reply, verify parent comment exists
        if (request.getParentCommentId() != null) {
            if (!commentRepository.existsById(request.getParentCommentId())) {
                throw new ResourceNotFoundException("Parent comment not found");
            }
        }
        
        Comment comment = Comment.builder()
                .postId(request.getPostId())
                .authorId(authorId)
                .content(request.getContent())
                .parentCommentId(request.getParentCommentId())
                .likeCount(0L)
                .replyCount(0L)
                .isDeleted(false)
                .build();
        
        Comment savedComment = commentRepository.save(comment);
        
        // Update post comment count
        postRepository.updateCommentCount(request.getPostId(), 1);
        
        // If it's a reply, update parent comment reply count
        if (request.getParentCommentId() != null) {
            commentRepository.updateReplyCount(request.getParentCommentId(), 1);
        }
        
        return savedComment;
    }
    
    @Override
    @Transactional
    public Comment updateComment(String authorId, Long commentId, UpdateCommentRequest request) {
        if (authorId == null || authorId.isBlank()) {
            throw new InvalidParamException("Author ID is required");
        }
        
        Comment comment = getCommentById(commentId);
        
        // Check if user is the author
        if (!comment.getAuthorId().equals(authorId)) {
            throw new UnauthorizedException("You are not authorized to update this comment");
        }
        
        comment.setContent(request.getContent());
        
        return commentRepository.save(comment);
    }
    
    @Override
    @Transactional
    public void deleteComment(String authorId, Long commentId) {
        if (authorId == null || authorId.isBlank()) {
            throw new InvalidParamException("Author ID is required");
        }
        
        Comment comment = getCommentById(commentId);
        
        // Check if user is the author
        if (!comment.getAuthorId().equals(authorId)) {
            throw new UnauthorizedException("You are not authorized to delete this comment");
        }
        
        // Soft delete
        comment.setIsDeleted(true);
        commentRepository.save(comment);
        
        // Update post comment count
        postRepository.updateCommentCount(comment.getPostId(), -1);
        
        // If it's a reply, update parent comment reply count
        if (comment.getParentCommentId() != null) {
            commentRepository.updateReplyCount(comment.getParentCommentId(), -1);
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public Comment getCommentById(Long commentId) {
        if (commentId == null) {
            throw new InvalidParamException("Comment ID is required");
        }
        
        return commentRepository.findByIdAndIsDeleted(commentId, false)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<Comment> getCommentsByPost(Long postId, int page, int limit, String sortBy) {
        if (postId == null) {
            throw new InvalidParamException("Post ID is required");
        }
        
        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(1, Math.min(limit, 50));
        
        Pageable pageable = PageRequest.of(safePage - 1, safeLimit, SortUtils.parseSort(sortBy != null ? sortBy : "createdAt:desc"));
        
        return commentRepository.findByPostIdAndIsDeletedAndParentCommentIdIsNull(postId, false, pageable);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<Comment> getRepliesByComment(Long commentId) {
        if (commentId == null) {
            throw new InvalidParamException("Comment ID is required");
        }
        
        return commentRepository.findByParentCommentIdAndIsDeleted(commentId, false);
    }
    
    @Override
    @Transactional(readOnly = true)
    public boolean isCommentReactedByUser(Long commentId, String userId) {
        if (userId == null || userId.isBlank()) {
            return false;
        }
        return commentLikeRepository.existsByCommentIdAndUserId(commentId, userId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public ReactionType getUserReactionType(Long commentId, String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        return commentLikeRepository.findByCommentIdAndUserId(commentId, userId)
                .map(CommentLike::getReactionType)
                .orElse(null);
    }
}
