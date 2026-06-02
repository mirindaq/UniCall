package iuh.fit.post_service.services.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.common_service.exceptions.UnauthorizedException;
import iuh.fit.common_service.utils.SortUtils;
import iuh.fit.post_service.dtos.request.CreatePostRequest;
import iuh.fit.post_service.dtos.request.UpdatePostRequest;
import iuh.fit.post_service.entities.Post;
import iuh.fit.post_service.entities.PostLike;
import iuh.fit.post_service.enums.PostPrivacy;
import iuh.fit.post_service.enums.PostStatus;
import iuh.fit.post_service.enums.ReactionType;
import iuh.fit.post_service.repositories.PostLikeRepository;
import iuh.fit.post_service.repositories.PostRepository;
import iuh.fit.post_service.services.FileUploadService;
import iuh.fit.post_service.services.PostService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostServiceImpl implements PostService {
  private final PostRepository postRepository;
  private final PostLikeRepository postLikeRepository;
  private final FileUploadService fileUploadService;

  @Override
  @Transactional
  public Post createPost(String authorId, CreatePostRequest request) {
    if (authorId == null || authorId.isBlank()) {
      throw new InvalidParamException("Author ID is required");
    }

    List<String> mediaUrls = new ArrayList<>();
    if (request.getFiles() != null && !request.getFiles().isEmpty()) {
      mediaUrls = fileUploadService.uploadFiles(request.getFiles());
    }

    if ((request.getContent() == null || request.getContent().isBlank()) && mediaUrls.isEmpty()) {
      throw new InvalidParamException("Post must have content or media");
    }

    Post post = Post.builder()
        .authorId(authorId)
        .content(request.getContent())
        .mediaUrls(mediaUrls)
        .privacy(request.getPrivacy())
        .status(PostStatus.ACTIVE)
        .likeCount(0L)
        .commentCount(0L)
        .build();

    return postRepository.save(post);
  }

  @Override
  @Transactional
  public Post updatePost(String authorId, Long postId, UpdatePostRequest request) {
    if (authorId == null || authorId.isBlank()) {
      throw new InvalidParamException("Author ID is required");
    }

    Post post = getPostById(postId);

    if (!post.getAuthorId().equals(authorId)) {
      throw new UnauthorizedException("You are not authorized to update this post");
    }

    if (request.getContent() != null) {
      post.setContent(request.getContent());
    }
    if (request.getMediaUrls() != null) {
      post.setMediaUrls(request.getMediaUrls());
    }
    if (request.getPrivacy() != null) {
      post.setPrivacy(request.getPrivacy());
    }

    return postRepository.save(post);
  }

  @Override
  @Transactional
  public void deletePost(String authorId, Long postId) {
    if (authorId == null || authorId.isBlank()) {
      throw new InvalidParamException("Author ID is required");
    }

    Post post = getPostById(postId);

    if (!post.getAuthorId().equals(authorId)) {
      throw new UnauthorizedException("You are not authorized to delete this post");
    }

    post.setStatus(PostStatus.DELETED);
    postRepository.save(post);
  }

  @Override
  @Transactional(readOnly = true)
  public Post getPostById(Long postId) {
    if (postId == null) {
      throw new InvalidParamException("Post ID is required");
    }

    return postRepository.findByIdAndStatus(postId, PostStatus.ACTIVE)
        .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
  }

  @Override
  @Transactional(readOnly = true)
  public Page<Post> getPostsByAuthor(String authorId, int page, int limit, String sortBy) {
    if (authorId == null || authorId.isBlank()) {
      throw new InvalidParamException("Author ID is required");
    }

    int safePage = Math.max(page, 1);
    int safeLimit = Math.max(1, Math.min(limit, 50));

    Pageable pageable = PageRequest.of(
        safePage - 1,
        safeLimit,
        SortUtils.parseSort(sortBy != null ? sortBy : "createdAt:desc")
    );

    return postRepository.findByAuthorIdAndStatus(authorId, PostStatus.ACTIVE, pageable);
  }

  @Override
  @Transactional(readOnly = true)
  public Page<Post> getFeedPosts(String userId, int page, int limit, String sortBy) {
    int safePage = Math.max(page, 1);
    int safeLimit = Math.max(1, Math.min(limit, 50));

    Pageable pageable = PageRequest.of(
        safePage - 1,
        safeLimit,
        SortUtils.parseSort(sortBy != null ? sortBy : "createdAt:desc")
    );

    if (userId == null || userId.isBlank()) {
      return postRepository.findByStatus(PostStatus.ACTIVE, pageable);
    }

    return postRepository.findFeedPosts(PostStatus.ACTIVE, PostPrivacy.PUBLIC, userId, pageable);
  }

  @Override
  @Transactional(readOnly = true)
  public boolean isPostReactedByUser(Long postId, String userId) {
    if (userId == null || userId.isBlank()) {
      return false;
    }
    return postLikeRepository.existsByPostIdAndUserId(postId, userId);
  }

  @Override
  @Transactional(readOnly = true)
  public ReactionType getUserReactionType(Long postId, String userId) {
    if (userId == null || userId.isBlank()) {
      return null;
    }
    return postLikeRepository.findByPostIdAndUserId(postId, userId)
        .map(PostLike::getReactionType)
        .orElse(null);
  }

  @Override
  @Transactional(readOnly = true)
  public Page<Post> getAllPostsForAdmin(
      int page,
      int limit,
      String keyword,
      List<String> authorIds
  ) {
    int safePage = Math.max(page, 1);
    int safeLimit = Math.max(1, Math.min(limit, 50));
    Pageable pageable = PageRequest.of(safePage - 1, safeLimit);

    return postRepository.findAll((root, query, cb) -> {
      List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

      if (keyword != null && !keyword.isBlank()) {
        String normalizedKeyword = keyword.trim().toLowerCase(Locale.ROOT);
        String like = "%" + normalizedKeyword + "%";
        predicates.add(cb.like(cb.lower(root.get("content")), like));

        if ("active".contains(normalizedKeyword) || "dang hien thi".contains(normalizedKeyword)
            || "đang hiển thị".contains(normalizedKeyword)) {
          predicates.add(cb.equal(root.get("status"), PostStatus.ACTIVE));
        }
        if ("hidden".contains(normalizedKeyword) || "da an".contains(normalizedKeyword)
            || "đã ẩn".contains(normalizedKeyword)) {
          predicates.add(cb.equal(root.get("status"), PostStatus.HIDDEN));
        }
        if ("deleted".contains(normalizedKeyword) || "bi go".contains(normalizedKeyword)
            || "bị gỡ".contains(normalizedKeyword)) {
          predicates.add(cb.equal(root.get("status"), PostStatus.DELETED));
        }
      }

      if (authorIds != null && !authorIds.isEmpty()) {
        predicates.add(root.get("authorId").in(authorIds));
      }

      if (predicates.isEmpty()) {
        return cb.conjunction();
      }

      return cb.or(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
    }, pageable);
  }

  @Override
  @Transactional
  public void hidePostForAdmin(Long postId) {
    Post post = postRepository.findById(postId)
        .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    post.setStatus(PostStatus.HIDDEN);
    postRepository.save(post);
  }

  @Override
  @Transactional
  public void restorePostForAdmin(Long postId) {
    Post post = postRepository.findById(postId)
        .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    post.setStatus(PostStatus.ACTIVE);
    postRepository.save(post);
  }
}
