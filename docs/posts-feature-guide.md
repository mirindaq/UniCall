# Tính năng Bài viết (Posts Feature)

## Tổng quan

Tính năng bài viết cho phép người dùng tạo, xem, tương tác với các bài viết giống như trên Zalo hoặc Facebook.

## Cấu trúc Frontend

### Pages
- **UserPostsPage** (`Frontend/src/pages/user/UserPostsPage.tsx`): Trang chính quản lý bài viết
  - **FeedTab** (`Frontend/src/pages/user/posts/FeedTab.tsx`): Tab hiển thị bảng tin
  - **MyPostsTab** (`Frontend/src/pages/user/posts/MyPostsTab.tsx`): Tab hiển thị bài viết của người dùng

### Components
- **PostCard** (`Frontend/src/components/post/PostCard.tsx`): Component hiển thị một bài viết
  - Hiển thị thông tin tác giả, nội dung, media
  - Các nút tương tác: Thích, Bình luận, Chia sẻ
  - Hiển thị số lượng reactions, comments, shares
  - Form nhập bình luận

- **ReactionPicker** (`Frontend/src/components/post/ReactionPicker.tsx`): Component chọn cảm xúc
  - 6 loại reactions: 👍 Thích, ❤️ Yêu thích, 😂 Haha, 😮 Wow, 😢 Buồn, 😠 Phẫn nộ
  - Popover hiển thị các lựa chọn reactions
  - Tự động cập nhật reaction khi click lại

### Services
- **postService** (`Frontend/src/services/post/post.service.ts`): Service gọi API
  - CRUD bài viết: create, update, delete, get
  - Feed: getFeed, getMyPosts, getUserPosts
  - Reactions: reactToPost, unreactToPost, getPostReactions
  - Comments: create, update, delete, get, getReplies
  - Comment Reactions: reactToComment, unreactToComment
  - Share: sharePost, unsharePost

### Types
- **post.type.ts** (`Frontend/src/types/post.type.ts`): TypeScript types
  - `Post`, `Comment`, `PostShare`
  - `ReactionType`, `PostPrivacy`, `PostStatus`
  - `ReactionCounts`, `ReactionResponse`
  - Request/Response DTOs

## Routing

### Menu Sidebar
Menu "Bài viết" đã được thêm vào sidebar bên trái với:
- Icon: FileText
- Label: "Bai viet"
- Path: `/user/posts`

### Routes
```typescript
{
  path: USER_PATH.POSTS, // "posts"
  element: <UserPostsPage />,
}
```

## Tính năng chính

### 1. Tạo bài viết
- Nhập nội dung trong textarea "Bạn đang nghĩ gì?"
- Click nút "Đăng bài" để publish
- **TODO**: Thêm tính năng upload media (ảnh, video)

### 2. Xem bảng tin (Feed)
- Hiển thị bài viết của bạn bè và người dùng khác
- Infinite scroll để load thêm bài viết
- **TODO**: Implement pagination với API

### 3. Reactions (Cảm xúc)
- Click vào nút "Thích" để mở ReactionPicker
- Chọn 1 trong 6 loại cảm xúc
- Click lại cùng reaction để unreact
- Click reaction khác để thay đổi
- Hiển thị tổng số reactions và top 3 reactions phổ biến nhất

### 4. Bình luận
- Click nút "Bình luận" để mở form comment
- Nhập nội dung và click Send
- **TODO**: Implement nested comments (replies)
- **TODO**: Implement comment reactions

### 5. Chia sẻ
- Click nút "Chia sẻ" để share bài viết
- **TODO**: Implement share dialog với optional message

### 6. Quản lý bài viết của tôi
- Tab "Bài viết của tôi" hiển thị các bài viết đã đăng
- Nút Edit và Delete trên mỗi bài viết
- **TODO**: Implement edit/delete functionality

## Tích hợp với Backend

### API Endpoints
Tất cả endpoints đã được cấu hình trong API Gateway:

#### Posts
- `POST /api/v1/posts` - Tạo bài viết mới
- `PUT /api/v1/posts/{postId}` - Cập nhật bài viết
- `DELETE /api/v1/posts/{postId}` - Xóa bài viết
- `GET /api/v1/posts/{postId}` - Lấy chi tiết bài viết
- `GET /api/v1/posts/feed` - Lấy bảng tin
- `GET /api/v1/posts/my-posts` - Lấy bài viết của tôi
- `GET /api/v1/posts/user/{userId}` - Lấy bài viết của user

#### Reactions
- `POST /api/v1/posts/{postId}/reactions` - React to post
- `DELETE /api/v1/posts/{postId}/reactions` - Unreact
- `GET /api/v1/posts/{postId}/reactions` - Lấy thông tin reactions

#### Comments
- `POST /api/v1/comments` - Tạo comment
- `PUT /api/v1/comments/{commentId}` - Cập nhật comment
- `DELETE /api/v1/comments/{commentId}` - Xóa comment
- `GET /api/v1/comments/post/{postId}` - Lấy comments của post
- `GET /api/v1/comments/{commentId}/replies` - Lấy replies

#### Comment Reactions
- `POST /api/v1/comments/{commentId}/reactions` - React to comment
- `DELETE /api/v1/comments/{commentId}/reactions` - Unreact
- `GET /api/v1/comments/{commentId}/reactions` - Lấy thông tin reactions

#### Shares
- `POST /api/v1/posts/{postId}/shares` - Chia sẻ bài viết
- `DELETE /api/v1/posts/{postId}/shares` - Hủy chia sẻ

### Authentication
Tất cả API calls sử dụng header `X-User-Id` để xác thực người dùng.

## Cải tiến tiếp theo

### High Priority
1. **Connect to real API**: 
   - Thay thế mock data bằng API calls thật
   - Implement error handling và loading states
   - Add optimistic updates cho better UX

2. **Media Upload**:
   - Tích hợp với file-service để upload ảnh/video
   - Image preview trước khi post
   - Multiple images support

3. **Comment System**:
   - Implement nested comments (replies)
   - Comment pagination
   - Real-time comment updates

4. **Edit/Delete Posts**:
   - Edit dialog với pre-filled content
   - Confirmation dialog cho delete
   - Update cache after edit/delete

### Medium Priority
5. **Share Dialog**:
   - Dialog cho phép thêm message khi share
   - Preview bài viết gốc

6. **User Profiles**:
   - Fetch user info để hiển thị avatar và tên
   - Link to user profile page

7. **Privacy Settings**:
   - UI để chọn privacy khi tạo post (PUBLIC/FRIENDS/PRIVATE)
   - Icon hiển thị privacy level

8. **Notifications**:
   - Real-time notifications khi có người like/comment
   - Tích hợp với notification-service

### Low Priority
9. **Search & Filter**:
   - Search bài viết theo content
   - Filter theo thời gian, người dùng

10. **Saved Posts**:
    - Tab "Đã lưu" để xem bài viết đã save
    - API endpoints cho save/unsave

11. **Post Analytics**:
    - Xem ai đã react/share bài viết
    - View count

12. **Rich Text Editor**:
    - Formatting options (bold, italic, links)
    - Mention users (@username)
    - Hashtags support

## Testing

### Manual Testing Steps
1. Navigate to `/user/posts`
2. Verify menu "Bài viết" is visible in sidebar
3. Test tạo post với content
4. Test reactions: click từng loại reaction
5. Test unreact: click lại same reaction
6. Test change reaction: click different reaction
7. Test comment: mở form và nhập comment
8. Switch to "Bài viết của tôi" tab
9. Verify posts display correctly

### TODO: Automated Tests
- Unit tests cho components
- Integration tests cho services
- E2E tests cho user flows

## Dependencies

### UI Components (shadcn/ui)
- Button
- Card
- Avatar
- Textarea
- ScrollArea
- Popover
- AlertDialog
- DropdownMenu

### Icons (lucide-react)
- FileText (menu icon)
- Heart, MessageCircle, Share2 (action buttons)
- Plus, Send, MoreHorizontal
- Various emoji alternatives

### Libraries
- React Router (routing)
- Axios (HTTP client via http utility)
- React hooks (useState, useEffect)

## Notes for Developers

1. **Code Pattern**: Follow existing patterns from UserFriendsPage and chat components
2. **Styling**: Use Tailwind CSS classes, follow design system
3. **State Management**: Currently using local state, consider Redux/Context for global state
4. **API Calls**: Always handle loading states and errors
5. **Type Safety**: Use TypeScript types from `post.type.ts`
6. **Reusability**: PostCard and ReactionPicker are reusable components
