package iuh.fit.post_service.services.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.post_service.entities.PostLike;
import iuh.fit.post_service.enums.ReactionType;
import iuh.fit.post_service.repositories.PostLikeRepository;
import iuh.fit.post_service.repositories.PostRepository;
import iuh.fit.post_service.services.PostLikeService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostLikeServiceImpl implements PostLikeService {
    
    private final PostLikeRepository postLikeRepository;
    private final PostRepository postRepository;
    
    @Override
    @Transactional
    public void reactToPost(Long postId, String userId, ReactionType reactionType) {
        if (userId == null || userId.isBlank()) {
            throw new InvalidParamException("User ID is required");
        }
        
        if (postId == null) {
            throw new InvalidParamException("Post ID is required");
        }
        
        if (reactionType == null) {
            throw new InvalidParamException("Reaction type is required");
        }
        
        // Verify post exists
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException("Post not found");
        }
        
        // Check if already reacted
        Optional<PostLike> existingReaction = postLikeRepository.findByPostIdAndUserId(postId, userId);
        
        if (existingReaction.isPresent()) {
            // Update existing reaction
            PostLike reaction = existingReaction.get();
            reaction.setReactionType(reactionType);
            postLikeRepository.save(reaction);
        } else {
            // Create new reaction
            PostLike reaction = PostLike.builder()
                    .postId(postId)
                    .userId(userId)
                    .reactionType(reactionType)
                    .build();
            
            postLikeRepository.save(reaction);
            
            // Update post like count
            postRepository.updateLikeCount(postId, 1);
        }
    }
    
    @Override
    @Transactional
    public void unreactToPost(Long postId, String userId) {
        if (userId == null || userId.isBlank()) {
            throw new InvalidParamException("User ID is required");
        }
        
        if (postId == null) {
            throw new InvalidParamException("Post ID is required");
        }
        
        // Check if reaction exists
        if (!postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
            throw new ResourceNotFoundException("Reaction not found");
        }
        
        postLikeRepository.deleteByPostIdAndUserId(postId, userId);
        
        // Update post like count
        postRepository.updateLikeCount(postId, -1);
    }
    
    @Override
    @Transactional(readOnly = true)
    public boolean isPostReactedByUser(Long postId, String userId) {
        if (userId == null || userId.isBlank() || postId == null) {
            return false;
        }
        return postLikeRepository.existsByPostIdAndUserId(postId, userId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public ReactionType getUserReactionType(Long postId, String userId) {
        if (userId == null || userId.isBlank() || postId == null) {
            return null;
        }
        
        return postLikeRepository.findByPostIdAndUserId(postId, userId)
                .map(PostLike::getReactionType)
                .orElse(null);
    }
    
    @Override
    @Transactional(readOnly = true)
    public long getPostTotalReactions(Long postId) {
        if (postId == null) {
            throw new InvalidParamException("Post ID is required");
        }
        return postLikeRepository.countByPostId(postId);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<ReactionType, Long> getPostReactionCounts(Long postId) {
        if (postId == null) {
            throw new InvalidParamException("Post ID is required");
        }
        
        List<Object[]> results = postLikeRepository.countReactionsByPostId(postId);
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
    
    @Override
    @Transactional(readOnly = true)
    public Page<PostLike> getPostReactions(Long postId, int page, int limit) {
        if (postId == null) {
            throw new InvalidParamException("Post ID is required");
        }
        
        // Verify post exists
        if (!postRepository.existsById(postId)) {
            throw new ResourceNotFoundException("Post not found");
        }
        
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        return postLikeRepository.findByPostId(postId, pageable);
    }
}
