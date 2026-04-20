package iuh.fit.post_service.services;

import org.springframework.data.domain.Page;

import iuh.fit.post_service.dtos.request.CreatePostRequest;
import iuh.fit.post_service.dtos.request.UpdatePostRequest;
import iuh.fit.post_service.entities.Post;
import iuh.fit.post_service.enums.ReactionType;

public interface PostService {
    Post createPost(String authorId, CreatePostRequest request);
    
    Post updatePost(String authorId, Long postId, UpdatePostRequest request);
    
    void deletePost(String authorId, Long postId);
    
    Post getPostById(Long postId);
    
    Page<Post> getPostsByAuthor(String authorId, int page, int limit, String sortBy);
    
    Page<Post> getFeedPosts(String userId, int page, int limit, String sortBy);
    
    boolean isPostReactedByUser(Long postId, String userId);
    
    ReactionType getUserReactionType(Long postId, String userId);
}
