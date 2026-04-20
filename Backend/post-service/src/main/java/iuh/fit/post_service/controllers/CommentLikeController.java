package iuh.fit.post_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.post_service.dtos.request.ReactRequest;
import iuh.fit.post_service.dtos.response.LikeResponse;
import iuh.fit.post_service.enums.ReactionType;
import iuh.fit.post_service.services.CommentLikeService;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix:/api/v1}/comments/{commentId}/reactions")
@RequiredArgsConstructor
public class CommentLikeController {
    
    private static final String USER_ID_HEADER = "X-User-Id";
    
    private final CommentLikeService commentLikeService;
    
    @PostMapping
    public ResponseEntity<ResponseSuccess<LikeResponse>> reactToComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long commentId,
            @Valid @RequestBody ReactRequest request) {
        
        commentLikeService.reactToComment(commentId, userId, request.getReactionType());
        
        ReactionType userReaction = commentLikeService.getUserReactionType(commentId, userId);
        long totalReactions = commentLikeService.getCommentTotalReactions(commentId);
        Map<ReactionType, Long> reactionCounts = commentLikeService.getCommentReactionCounts(commentId);
        
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
    public ResponseEntity<ResponseSuccess<LikeResponse>> unreactToComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long commentId) {
        
        commentLikeService.unreactToComment(commentId, userId);
        
        long totalReactions = commentLikeService.getCommentTotalReactions(commentId);
        Map<ReactionType, Long> reactionCounts = commentLikeService.getCommentReactionCounts(commentId);
        
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
            @PathVariable Long commentId) {
        
        boolean isReacted = commentLikeService.isCommentReactedByUser(commentId, userId);
        ReactionType userReaction = commentLikeService.getUserReactionType(commentId, userId);
        long totalReactions = commentLikeService.getCommentTotalReactions(commentId);
        Map<ReactionType, Long> reactionCounts = commentLikeService.getCommentReactionCounts(commentId);
        
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
