package iuh.fit.post_service.services.impl;

import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.post_service.entities.CommentLike;
import iuh.fit.post_service.enums.ReactionType;
import iuh.fit.post_service.repositories.CommentLikeRepository;
import iuh.fit.post_service.repositories.CommentRepository;
import iuh.fit.post_service.services.CommentLikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CommentLikeServiceImpl implements CommentLikeService {
    
    private final CommentLikeRepository commentLikeRepository;
    private final CommentRepository commentRepository;
    
    @Override
    @Transactional
    public void reactToComment(Long commentId, String userId, ReactionType reactionType) {
        if (userId == null || userId.isBlank()) {
            throw new InvalidParamException("User ID is required");
        }
        
        if (commentId == null) {
            throw new InvalidParamException("Comment ID is required");
        }
        
        if (reactionType == null) {
            throw new InvalidParamException("Reaction type is required");
        }
        
        // Verify comment exists
        if (!commentRepository.existsById(commentId)) {
            throw new ResourceNotFoundException("Comment not found");
        }
        
        // Check if already reacted
        Optional<CommentLike> existingReaction = commentLikeRepository.findByCommentIdAndUserId(commentId, userId);
        
        if (existingReaction.isPresent()) {
            // Update existing reaction
            CommentLike reaction = existingReaction.get();
            reaction.setReactionType(reactionType);
            commentLikeRepository.save(reaction);
        } else {
            // Create new reaction
            CommentLike reaction = CommentLike.builder()
                    .commentId(commentId)
                    .userId(userId)
                    .reactionType(reactionType)
                    .build();
            
            commentLikeRepository.save(reaction);
            
            // Update comment like count
            commentRepository.updateLikeCount(commentId, 1);
        }
    }
    
    @Override
    @Transactional
    public void unreactToComment(Long commentId, String userId) {
        if (userId == null || userId.isBlank()) {
            throw new InvalidParamException("User ID is required");
        }
        
        if (commentId == null) {
            throw new InvalidParamException("Comment ID is required");
        }
        
        // Check if reaction exists
        if (!commentLikeRepository.existsByCommentIdAndUserId(commentId, userId)) {
            throw new ResourceNotFoundException("Reaction not found");
        }
        
        commentLikeRepository.deleteByCommentIdAndUserId(commentId, userId);
        
        // Update comment like count
        commentRepository.updateLikeCount(commentId, -1);
    }
    
    @Override
    @Transactional(readOnly = true)
    public boolean isCommentReactedByUser(Long commentId, String userId) {
        if (userId == null || userId.isBlank() || commentId == null) {
            return false;
        }
        return commentLikeRepository.existsByCommentIdAndUserId(commentId, userId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public ReactionType getUserReactionType(Long commentId, String userId) {
        if (userId == null || userId.isBlank() || commentId == null) {
            return null;
        }
        
        return commentLikeRepository.findByCommentIdAndUserId(commentId, userId)
                .map(CommentLike::getReactionType)
                .orElse(null);
    }
    
    @Override
    @Transactional(readOnly = true)
    public long getCommentTotalReactions(Long commentId) {
        if (commentId == null) {
            throw new InvalidParamException("Comment ID is required");
        }
        return commentLikeRepository.countByCommentId(commentId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<ReactionType, Long> getCommentReactionCounts(Long commentId) {
        if (commentId == null) {
            throw new InvalidParamException("Comment ID is required");
        }
        
        List<Object[]> results = commentLikeRepository.countReactionsByCommentId(commentId);
        Map<ReactionType, Long> reactionCounts = new HashMap<>();
        
        // Initialize all reaction types with 0
        for (ReactionType type : ReactionType.values()) {
            reactionCounts.put(type, 0L);
        }
        
        // Update with actual counts
        for (Object[] result : results) {
            ReactionType type = (ReactionType) result[0];
            Long count = (Long) result[1];
            reactionCounts.put(type, count);
        }
        
        return reactionCounts;
    }
}
