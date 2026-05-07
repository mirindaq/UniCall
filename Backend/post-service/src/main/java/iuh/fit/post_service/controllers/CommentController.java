package iuh.fit.post_service.controllers;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.post_service.dtos.request.CreateCommentRequest;
import iuh.fit.post_service.dtos.request.UpdateCommentRequest;
import iuh.fit.post_service.dtos.response.CommentResponse;
import iuh.fit.post_service.entities.Comment;
import iuh.fit.post_service.services.CommentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix:/api/v1}/comments")
@RequiredArgsConstructor
public class CommentController {
    
    private static final String USER_ID_HEADER = "X-User-Id";
    
    private final CommentService commentService;
    
    @PostMapping
    public ResponseEntity<ResponseSuccess<CommentResponse>> createComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @Valid @RequestBody CreateCommentRequest request) {
        
        Comment comment = commentService.createComment(userId, request);
        boolean isReacted = commentService.isCommentReactedByUser(comment.getId(), userId);
        var reactionType = commentService.getUserReactionType(comment.getId(), userId);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(
                new ResponseSuccess<>(HttpStatus.CREATED, "Comment created successfully", 
                        CommentResponse.from(comment, isReacted, reactionType))
        );
    }
    
    @PutMapping("/{commentId}")
    public ResponseEntity<ResponseSuccess<CommentResponse>> updateComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateCommentRequest request) {
        
        Comment comment = commentService.updateComment(userId, commentId, request);
        boolean isReacted = commentService.isCommentReactedByUser(comment.getId(), userId);
        var reactionType = commentService.getUserReactionType(comment.getId(), userId);
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Comment updated successfully", 
                        CommentResponse.from(comment, isReacted, reactionType))
        );
    }
    
    @DeleteMapping("/{commentId}")
    public ResponseEntity<ResponseSuccess<Void>> deleteComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long commentId) {
        
        commentService.deleteComment(userId, commentId);
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Comment deleted successfully", null)
        );
    }
    
    @GetMapping("/{commentId}")
    public ResponseEntity<ResponseSuccess<CommentResponse>> getComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long commentId) {
        
        Comment comment = commentService.getCommentById(commentId);
        boolean isReacted = commentService.isCommentReactedByUser(comment.getId(), userId);
        var reactionType = commentService.getUserReactionType(comment.getId(), userId);
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get comment successfully", 
                        CommentResponse.from(comment, isReacted, reactionType))
        );
    }
    
    @GetMapping("/post/{postId}")
    public ResponseEntity<ResponseSuccess<PageResponse<CommentResponse>>> getCommentsByPost(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long postId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "sortBy", required = false) String sortBy) {
        
        Page<Comment> commentPage = commentService.getCommentsByPost(postId, page, limit, sortBy);
        PageResponse<CommentResponse> data = PageResponse.fromPage(commentPage, 
                comment -> CommentResponse.from(comment, 
                        commentService.isCommentReactedByUser(comment.getId(), userId),
                        commentService.getUserReactionType(comment.getId(), userId)));
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get comments by post successfully", data)
        );
    }
    
    @GetMapping("/{commentId}/replies")
    public ResponseEntity<ResponseSuccess<List<CommentResponse>>> getRepliesByComment(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long commentId) {
        
        List<Comment> replies = commentService.getRepliesByComment(commentId);
        List<CommentResponse> data = replies.stream()
                .map(comment -> CommentResponse.from(comment, 
                        commentService.isCommentReactedByUser(comment.getId(), userId),
                        commentService.getUserReactionType(comment.getId(), userId)))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get replies successfully", data)
        );
    }
}
