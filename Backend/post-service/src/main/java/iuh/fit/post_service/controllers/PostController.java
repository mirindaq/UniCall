package iuh.fit.post_service.controllers;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.post_service.dtos.request.CreatePostRequest;
import iuh.fit.post_service.dtos.request.UpdatePostRequest;
import iuh.fit.post_service.dtos.response.PostResponse;
import iuh.fit.post_service.dtos.response.ReactionResponse;
import iuh.fit.post_service.entities.Post;
import iuh.fit.post_service.entities.PostLike;
import iuh.fit.post_service.services.PostLikeService;
import iuh.fit.post_service.services.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("${api.prefix:/api/v1}/posts")
@RequiredArgsConstructor
public class PostController {
    
    private static final String USER_ID_HEADER = "X-User-Id";
    
    private final PostService postService;
    private final PostLikeService postLikeService;
    
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseSuccess<PostResponse>> createPost(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @Valid CreatePostRequest request) {
        
        Post post = postService.createPost(userId, request);
        boolean isReacted = postService.isPostReactedByUser(post.getId(), userId);
        var reactionType = postService.getUserReactionType(post.getId(), userId);
        var reactionCounts = postLikeService.getPostReactionCounts(post.getId());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(
                new ResponseSuccess<>(HttpStatus.CREATED, "Post created successfully", 
                        PostResponse.from(post, isReacted, reactionType, reactionCounts))
        );
    }
    
    @PutMapping("/{postId}")
    public ResponseEntity<ResponseSuccess<PostResponse>> updatePost(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long postId,
            @Valid @RequestBody UpdatePostRequest request) {
        
        Post post = postService.updatePost(userId, postId, request);
        boolean isReacted = postService.isPostReactedByUser(post.getId(), userId);
        var reactionType = postService.getUserReactionType(post.getId(), userId);
        var reactionCounts = postLikeService.getPostReactionCounts(post.getId());
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Post updated successfully", 
                        PostResponse.from(post, isReacted, reactionType, reactionCounts))
        );
    }
    
    @DeleteMapping("/{postId}")
    public ResponseEntity<ResponseSuccess<Void>> deletePost(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long postId) {
        
        postService.deletePost(userId, postId);
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Post deleted successfully", null)
        );
    }
    
    @GetMapping("/{postId}")
    public ResponseEntity<ResponseSuccess<PostResponse>> getPost(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable Long postId) {
        
        Post post = postService.getPostById(postId);
        boolean isReacted = postService.isPostReactedByUser(post.getId(), userId);
        var reactionType = postService.getUserReactionType(post.getId(), userId);
        var reactionCounts = postLikeService.getPostReactionCounts(post.getId());
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get post successfully", 
                        PostResponse.from(post, isReacted, reactionType, reactionCounts))
        );
    }
    
    @GetMapping("/user/{authorId}")
    public ResponseEntity<ResponseSuccess<PageResponse<PostResponse>>> getPostsByAuthor(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @PathVariable String authorId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "sortBy", required = false) String sortBy) {
        
        Page<Post> postPage = postService.getPostsByAuthor(authorId, page, limit, sortBy);
        PageResponse<PostResponse> data = PageResponse.fromPage(postPage, 
                post -> PostResponse.from(post, 
                        postService.isPostReactedByUser(post.getId(), userId),
                        postService.getUserReactionType(post.getId(), userId),
                        postLikeService.getPostReactionCounts(post.getId())));
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get posts by author successfully", data)
        );
    }
    
    @GetMapping("/feed")
    public ResponseEntity<ResponseSuccess<PageResponse<PostResponse>>> getFeedPosts(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "sortBy", required = false) String sortBy) {
        
        Page<Post> postPage = postService.getFeedPosts(userId, page, limit, sortBy);
        PageResponse<PostResponse> data = PageResponse.fromPage(postPage, 
                post -> PostResponse.from(post, 
                        postService.isPostReactedByUser(post.getId(), userId),
                        postService.getUserReactionType(post.getId(), userId),
                        postLikeService.getPostReactionCounts(post.getId())));
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get feed posts successfully", data)
        );
    }
    
    @GetMapping("/my-posts")
    public ResponseEntity<ResponseSuccess<PageResponse<PostResponse>>> getMyPosts(
            @RequestHeader(value = USER_ID_HEADER, required = false) String userId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "10") int limit,
            @RequestParam(name = "sortBy", required = false) String sortBy) {
        
        Page<Post> postPage = postService.getPostsByAuthor(userId, page, limit, sortBy);
        PageResponse<PostResponse> data = PageResponse.fromPage(postPage, 
                post -> PostResponse.from(post, 
                        postService.isPostReactedByUser(post.getId(), userId),
                        postService.getUserReactionType(post.getId(), userId),
                        postLikeService.getPostReactionCounts(post.getId())));;
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get my posts successfully", data)
        );
    }
    
    @GetMapping("/{postId}/reactions/list")
    public ResponseEntity<ResponseSuccess<PageResponse<ReactionResponse>>> getPostReactions(
            @PathVariable Long postId,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        
        Page<PostLike> reactionsPage = postLikeService.getPostReactions(postId, page, limit);
        PageResponse<ReactionResponse> data = PageResponse.fromPage(reactionsPage, 
                reaction -> ReactionResponse.from(reaction, null, null));
        
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Get post reactions successfully", data)
        );
    }
}
