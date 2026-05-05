package iuh.fit.post_service.services;

import iuh.fit.post_service.enums.ReactionType;

import java.util.Map;

public interface CommentLikeService {
    void reactToComment(Long commentId, String userId, ReactionType reactionType);
    
    void unreactToComment(Long commentId, String userId);
    
    boolean isCommentReactedByUser(Long commentId, String userId);
    
    ReactionType getUserReactionType(Long commentId, String userId);
    
    long getCommentTotalReactions(Long commentId);
    
    Map<ReactionType, Long> getCommentReactionCounts(Long commentId);
}
