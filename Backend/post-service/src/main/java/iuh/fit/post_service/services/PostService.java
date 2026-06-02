package iuh.fit.post_service.services;

import iuh.fit.post_service.dtos.request.CreatePostRequest;
import iuh.fit.post_service.dtos.request.UpdatePostRequest;
import org.springframework.data.domain.Page;

import java.util.List;

public interface PostService {
  iuh.fit.post_service.entities.Post createPost(String authorId, CreatePostRequest request);

  iuh.fit.post_service.entities.Post updatePost(String authorId, Long postId, UpdatePostRequest request);

  void deletePost(String authorId, Long postId);

  iuh.fit.post_service.entities.Post getPostById(Long postId);

  Page<iuh.fit.post_service.entities.Post> getPostsByAuthor(String authorId, int page, int limit, String sortBy);

  Page<iuh.fit.post_service.entities.Post> getFeedPosts(String userId, int page, int limit, String sortBy);

  boolean isPostReactedByUser(Long postId, String userId);

  iuh.fit.post_service.enums.ReactionType getUserReactionType(Long postId, String userId);

  Page<iuh.fit.post_service.entities.Post> getAllPostsForAdmin(
      int page,
      int limit,
      String keyword,
      List<String> authorIds
  );

  void hidePostForAdmin(Long postId);

  void restorePostForAdmin(Long postId);
}
