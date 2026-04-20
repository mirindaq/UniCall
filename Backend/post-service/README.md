# Post Service

Service quản lý bài viết (posts), bình luận (comments) và lượt thích (likes) cho ứng dụng UniCall.

## Tính năng

### Posts
- Tạo, cập nhật, xóa bài viết
- Hỗ trợ văn bản và đa phương tiện (hình ảnh, video)
- Phân quyền riêng tư (PUBLIC, FRIENDS, PRIVATE)
- Theo dõi số lượt reaction và comment

### Comments
- Tạo, cập nhật, xóa bình luận
- Hỗ trợ bình luận lồng nhau (replies)
- Theo dõi số lượt reaction và reply

### Reactions (Cảm xúc)
- 6 loại reaction: 👍 LIKE, ❤️ LOVE, 😂 HAHA, 😮 WOW, 😢 SAD, 😠 ANGRY
- React/Unreact bài viết
- React/Unreact bình luận
- Thay đổi reaction (tự động cập nhật)
- Thống kê số lượng từng loại reaction
- Kiểm tra reaction type của user hiện tại

## Cấu trúc Database

### Bảng `posts`
- `id`: Long (Primary Key)
- `authorId`: String (identityUserId)
- `content`: Text
- `mediaUrls`: List<String>
- `privacy`: Enum (PUBLIC, FRIENDS, PRIVATE)
- `status`: Enum (ACTIVE, DELETED, HIDDEN)
- `likeCount`: Long
- `commentCount`: Long
- `createdAt`: LocalDateTime
- `updatedAt`: LocalDateTime

### Bảng `comments`
- `id`: Long (Primary Key)
- `postId`: Long
- `authorId`: String
- `content`: Text
- `parentCommentId`: Long (cho replies)
- `likeCount`: Long
- `replyCount`: Long
- `isDeleted`: Boolean
- `createdAt`: LocalDateTime
- `updatedAt`: LocalDateTime

### Bảng `post_reactions`
- `id`: Long (Primary Key)
- `postId`: Long
- `userId`: String
- `reactionType`: Enum (LIKE, LOVE, HAHA, WOW, SAD, ANGRY)
- `createdAt`: LocalDateTime
- `updatedAt`: LocalDateTime
- Unique constraint: (postId, userId)

### Bảng `comment_reactions`
- `id`: Long (Primary Key)
- `commentId`: Long
- `userId`: String
- `reactionType`: Enum (LIKE, LOVE, HAHA, WOW, SAD, ANGRY)
- `createdAt`: LocalDateTime
- `updatedAt`: LocalDateTime
- Unique constraint: (commentId, userId)

## API Endpoints

### Posts
- `POST /api/v1/posts` - Tạo bài viết mới
- `GET /api/v1/posts/{postId}` - Lấy chi tiết bài viết
- `PUT /api/v1/posts/{postId}` - Cập nhật bài viết
- `DELETE /api/v1/posts/{postId}` - Xóa bài viết
- `GET /api/v1/posts/user/{authorId}` - Lấy bài viết của user
- `GET /api/v1/posts/feed` - Lấy feed bài viết

### Comments
- `POST /api/v1/comments` - Tạo comment
- `GET /api/v1/comments/{commentId}` - Lấy chi tiết comment
- `PUT /api/v1/comments/{commentId}` - Cập nhật comment
- `DELETE /api/v1/comments/{commentId}` - Xóa comment
- `GET /api/v1/comments/post/{postId}` - Lấy comments của bài viết
- `GET /api/v1/comments/{commentId}/replies` - Lấy replies của comment

### Post Reactions
- `POST /api/v1/posts/{postId}/reactions` - Thả cảm xúc cho bài viết (body: {reactionType: "LIKE|LOVE|HAHA|WOW|SAD|ANGRY"})
- `DELETE /api/v1/posts/{postId}/reactions` - Gỡ cảm xúc khỏi bài viết
- `GET /api/v1/posts/{postId}/reactions` - Lấy thống kê cảm xúc và reaction của user

### Comment Reactions
- `POST /api/v1/comments/{commentId}/reactions` - Thả cảm xúc cho comment (body: {reactionType: "LIKE|LOVE|HAHA|WOW|SAD|ANGRY"})
- `DELETE /api/v1/comments/{commentId}/reactions` - Gỡ cảm xúc khỏi comment
- `GET /api/v1/comments/{commentId}/reactions` - Lấy thống kê cảm xúc và reaction của user

## Cấu hình

### Database
```yaml
spring:
  datasource:
    url: jdbc:mysql://172.16.80.111:3306/unicall_post_service?createDatabaseIfNotExist=true
    username: springstudent
    password: springstudent
```

### Server
- HTTP Port: `8087`
- gRPC Port: `9087`

### Eureka
- Service Name: `post-service`
- Eureka Server: `http://localhost:8761/eureka/`

## Build và Run

### Build
```bash
./mvnw clean install
```

### Run
```bash
./mvnw spring-boot:run
```

hoặc

```bash
java -jar target/post-service-0.0.1-SNAPSHOT.jar
```

## Dependencies

- Spring Boot 4.0.3
- Spring Data JPA
- Spring Security
- Spring Cloud Netflix Eureka Client
- MySQL Connector
- Lombok
- gRPC
- Common Service (internal)
- Proto Common (internal)

## Lưu ý

- Service sử dụng header `X-User-Id` để xác định user hiện tại
- Soft delete được sử dụng cho posts và comments
- Reaction sử dụng unique constraint để tránh duplicate - user chỉ có thể có 1 reaction cho mỗi post/comment
- Khi user thả reaction mới khi đã có reaction, hệ thống sẽ tự động cập nhật reaction type thay vì tạo mới
- Tất cả endpoints đều sử dụng pagination với page và limit

## Reaction Types

```java
public enum ReactionType {
    LIKE,   // 👍 Thích
    LOVE,   // ❤️ Yêu thích
    HAHA,   // 😂 Haha
    WOW,    // 😮 Wow
    SAD,    // 😢 Buồn
    ANGRY   // 😠 Phẫn nộ
}
```

### Response Format cho Reactions

```json
{
  "isLiked": true,
  "userReaction": "LOVE",
  "totalReactions": 125,
  "reactionCounts": {
    "LIKE": 50,
    "LOVE": 40,
    "HAHA": 20,
    "WOW": 10,
    "SAD": 3,
    "ANGRY": 2
  }
}
```
