package iuh.fit.post_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.post_service.dtos.request.ReactRequest;
import iuh.fit.post_service.dtos.response.LikeResponse;
import iuh.fit.post_service.enums.ReactionType;
import iuh.fit.post_service.services.PostLikeService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix:/api/v1}/posts/{postId}/reactions")
@RequiredArgsConstructor
public class PostLikeController {
    
    private static final String USER_ID_HEADER = "X-User-Id";
    
    private final PostLikeService postLikeService;
    
    @PostMapping
    public ResponseEntity<ResponseSuccess<LikeResponse>> reactToPost(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long postId,
            @Valid @RequestBody ReactRequest request) {
        
        postLikeService.reactToPost(postId, userId, request.getReactionType());
        
        ReactionType userReaction = postLikeService.getUserReactionType(postId, userId);
        long totalReactions = postLikeService.getPostTotalReactions(postId);
        Map<ReactionType, Long> reactionCounts = postLikeService.getPostReactionCounts(postId);
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Reaction added successfully", 
                        LikeResponse.builder()
                                .isLiked(true)
                                .userReaction(userReaction)
                                .totalReactions(totalReactions)
                                .reactionCounts(reactionCounts)
                                .build())
        );
    }
    
    @DeleteMapping
    public ResponseEntity<ResponseSuccess<LikeResponse>> unreactToPost(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long postId) {
        
        postLikeService.unreactToPost(postId, userId);
        
        long totalReactions = postLikeService.getPostTotalReactions(postId);
        Map<ReactionType, Long> reactionCounts = postLikeService.getPostReactionCounts(postId);
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Reaction removed successfully", 
                        LikeResponse.builder()
                                .isLiked(false)
                                .userReaction(null)
                                .totalReactions(totalReactions)
                                .reactionCounts(reactionCounts)
                                .build())
        );
    }
    
    @GetMapping
    public ResponseEntity<ResponseSuccess<LikeResponse>> getReactionStatus(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long postId) {
        
        boolean isReacted = postLikeService.isPostReactedByUser(postId, userId);
        ReactionType userReaction = postLikeService.getUserReactionType(postId, userId);
        long totalReactions = postLikeService.getPostTotalReactions(postId);
        Map<ReactionType, Long> reactionCounts = postLikeService.getPostReactionCounts(postId);
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get reaction status successfully", 
                        LikeResponse.builder()
                                .isLiked(isReacted)
                                .userReaction(userReaction)
                                .totalReactions(totalReactions)
                                .reactionCounts(reactionCounts)
                                .build())
        );
    }
}
