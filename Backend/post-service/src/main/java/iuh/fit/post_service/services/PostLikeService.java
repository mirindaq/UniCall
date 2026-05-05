package iuh.fit.post_service.services;

import java.util.Map;

import org.springframework.data.domain.Page;

import iuh.fit.post_service.entities.PostLike;
import iuh.fit.post_service.enums.ReactionType;

public interface PostLikeService {
    void reactToPost(Long postId, String userId, ReactionType reactionType);
    
    void unreactToPost(Long postId, String userId);
    
    boolean isPostReactedByUser(Long postId, String userId);
    
    ReactionType getUserReactionType(Long postId, String userId);
    
    long getPostTotalReactions(Long postId);
    
    Map<ReactionType, Long> getPostReactionCounts(Long postId);
    
    Page<PostLike> getPostReactions(Long postId, int page, int limit);
}
