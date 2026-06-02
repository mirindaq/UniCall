package iuh.fit.post_service.controllers;

import iuh.fit.post_service.clients.GrpcUserServiceClient;
import iuh.fit.post_service.services.PostService;
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
import iuh.fit.common_service.exceptions.UnauthorizedException;
import iuh.fit.post_service.dtos.request.CreatePostRequest;
import iuh.fit.post_service.dtos.request.UpdatePostRequest;
import iuh.fit.post_service.dtos.response.AdminPostResponse;
import iuh.fit.post_service.dtos.response.PostResponse;
import iuh.fit.post_service.dtos.response.ReactionResponse;
import iuh.fit.post_service.entities.Post;
import iuh.fit.post_service.entities.PostLike;
import iuh.fit.post_service.enums.PostStatus;
import iuh.fit.post_service.services.PostLikeService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix:/api/v1}/posts")
@RequiredArgsConstructor
public class PostController {

  private static final String USER_ID_HEADER = "X-User-Id";
  private static final String USER_ROLE_HEADER = "X-User-Role";

  private final PostService postService;
  private final PostLikeService postLikeService;
  private final GrpcUserServiceClient grpcUserServiceClient;

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

  @GetMapping("/admin/posts")
  public ResponseEntity<ResponseSuccess<PageResponse<AdminPostResponse>>> getAdminPosts(
      @RequestHeader(value = USER_ROLE_HEADER, required = false) String userRole,
      @RequestParam(name = "page", defaultValue = "1") int page,
      @RequestParam(name = "limit", defaultValue = "20") int limit,
      @RequestParam(name = "authorIds", required = false) String authorIds,
      @RequestParam(name = "keyword", required = false) String keyword) {

    requireAdminRole(userRole);
    Page<Post> postPage = postService.getAllPostsForAdmin(
        page,
        limit,
        keyword,
        parseAuthorIds(authorIds)
    );
    Map<String, String> authorNameCache = new HashMap<>();
    PageResponse<AdminPostResponse> data = PageResponse.fromPage(postPage,
        post -> AdminPostResponse.from(
            post.getId(),
            post.getAuthorId(),
            resolveAuthorName(post.getAuthorId(), authorNameCache),
            post.getContent(),
            post.getStatus(),
            0,
            post.getCreatedAt()
        ));

    return ResponseEntity.ok(
        new ResponseSuccess<>(HttpStatus.OK, "Get admin posts success", data)
    );
  }

  private List<String> parseAuthorIds(String rawAuthorIds) {
    if (rawAuthorIds == null || rawAuthorIds.isBlank()) {
      return List.of();
    }
    return java.util.Arrays.stream(rawAuthorIds.split(","))
        .map(String::trim)
        .filter(value -> !value.isBlank())
        .distinct()
        .toList();
  }

  private String resolveAuthorName(String authorId, Map<String, String> authorNameCache) {
    if (authorId == null || authorId.isBlank()) {
      return null;
    }
    return authorNameCache.computeIfAbsent(authorId, key ->
        grpcUserServiceClient.getUserProfile(key)
            .map(GrpcUserServiceClient.UserProfileResult::displayName)
            .orElse(key)
    );
  }

  @PutMapping("/admin/posts/{postId}/hide")
  public ResponseEntity<ResponseSuccess<Void>> hidePostByAdmin(
      @RequestHeader(value = USER_ROLE_HEADER, required = false) String userRole,
      @PathVariable Long postId) {

    requireAdminRole(userRole);
    postService.hidePostForAdmin(postId);

    return ResponseEntity.ok(
        new ResponseSuccess<>(HttpStatus.OK, "Hide post success", null)
    );
  }

  @PutMapping("/admin/posts/{postId}/restore")
  public ResponseEntity<ResponseSuccess<Void>> restorePostByAdmin(
      @RequestHeader(value = USER_ROLE_HEADER, required = false) String userRole,
      @PathVariable Long postId) {

    requireAdminRole(userRole);
    postService.restorePostForAdmin(postId);

    return ResponseEntity.ok(
        new ResponseSuccess<>(HttpStatus.OK, "Restore post success", null)
    );
  }

  private void requireAdminRole(String userRoleHeader) {
    if (userRoleHeader == null || userRoleHeader.isBlank()) {
      throw new UnauthorizedException("Missing admin role");
    }
    boolean hasAdminRole = java.util.Arrays.stream(userRoleHeader.split(","))
        .map(String::trim)
        .map(String::toLowerCase)
        .anyMatch(role -> role.equals("admin")
            || role.equals("role_admin")
            || role.equals("system_admin")
            || role.equals("super_admin")
            || role.equals("super-admin"));
    if (!hasAdminRole) {
      throw new UnauthorizedException("Admin role required");
    }
  }
}
