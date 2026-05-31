# AI Assistant Plan (Chat + Task)

## 1) Mục tiêu
- Xây 1 khung chat AI riêng cho mỗi user (không phụ thuộc cơ chế mention `@unicall`).
- AI trả lời được 2 nhóm câu hỏi:
  - Câu hỏi về hội thoại chat (ai nói gì, lúc nào, tóm tắt đoạn chat, truy vấn ngữ nghĩa).
  - Câu hỏi về task (xem, tạo, cập nhật, xóa, comment, thống kê dashboard).
- AI có thể gọi tool để thao tác thật với task khi người dùng yêu cầu.

## 2) Phạm vi phase này
- Tận dụng hạ tầng đã có:
  - Embedding message text -> Qdrant qua RabbitMQ background (đã chạy).
  - `task-service` REST API hiện có.
  - `chat-service` REST API hiện có.
- Thêm lớp AI Orchestrator + Tool Layer + endpoint chat AI mới.
- Chưa làm multi-agent phức tạp; tập trung 1 assistant ổn định, kiểm soát quyền đầy đủ.

## 3) Hiện trạng code đang có (để bám vào)
- Chat API: `Backend/chat-service/src/main/java/iuh/fit/chat_service/controllers/ChatController.java`
- Conversation API: `Backend/chat-service/src/main/java/iuh/fit/chat_service/controllers/ConversationController.java`
- Task API: `Backend/task-service/src/main/java/iuh/fit/task_service/controllers/TaskController.java`
- Gemini text/image hiện tại: `Backend/chat-service/src/main/java/iuh/fit/chat_service/services/impl/AiAssistantServiceImpl.java`
- Vector message service Qdrant: `Backend/chat-service/src/main/java/iuh/fit/chat_service/services/impl/ConversationMessageVectorServiceImpl.java`

## 4) Kiến trúc đề xuất

### 4.1 Thành phần mới trong chat-service
- `AssistantChatController`
  - Endpoint AI chat riêng cho UI AI.
- `AssistantOrchestratorService`
  - Nhận câu hỏi, chọn chiến lược (Q&A thường / gọi tool / RAG hội thoại).
  - Điều phối vòng lặp model -> tool -> model.
- `AssistantToolRegistry`
  - Khai báo danh sách tool khả dụng + schema input/output.
- `AssistantTaskToolService` (REST client sang task-service)
- `AssistantChatToolService` (truy vấn conversation/messages/vector)
- `AssistantMemoryService`
  - Build ngữ cảnh hội thoại từ Qdrant + keyword fallback.

### 4.2 Lưu dữ liệu AI
- Mongo collection `ai_threads`
  - `threadId`, `ownerUserId`, `title`, `createdAt`, `updatedAt`.
- Mongo collection `ai_thread_messages`
  - `threadId`, `role(user|assistant|tool)`, `content`, `toolCalls`, `createdAt`.
- Mục đích: lưu lịch sử chat AI độc lập với chat người dùng.

## 5) Bộ tool cho AI

### 5.1 Tool hội thoại (Conversation Tools)
1. `chat_list_my_conversations`
- Input: `limit?`
- Output: danh sách conversation người dùng đang tham gia.
- Nguồn: `GET /api/v1/chat/conversations`

2. `chat_get_conversation_messages`
- Input: `conversationId`, `page?`, `limit?`
- Output: messages đã phân trang.
- Nguồn: `GET /api/v1/chat/conversations/{conversationId}/messages`

3. `chat_search_keyword`
- Input: `conversationId`, `keyword`, `page?`, `limit?`
- Output: messages match từ khóa.
- Nguồn: `GET /api/v1/chat/conversations/{conversationId}/messages/search`

4. `chat_semantic_search_conversation`
- Input: `conversationId`, `query`, `limit?`
- Output: top message hits (messageId, senderId, text, timeSent, score).
- Nguồn: dùng trực tiếp `ConversationMessageVectorService.searchConversation(...)`.

5. `chat_semantic_search_my_space` (tool mới cần thêm)
- Input: `query`, `limit?`, `participantId?`
- Output: top hits across mọi conversation mà user có quyền.
- Cần làm thêm:
  - Lấy danh sách conversation user tham gia.
  - Query Qdrant theo từng conversation (parallel) rồi merge/rank.
  - Trả thêm `conversationId`, `conversationType`, participants.

6. `chat_find_who_said`
- Input: `query`, `conversationId?`, `participantId?`
- Output: candidate message + người nói + thời gian + đoạn context.
- Chiến lược:
  - semantic search -> keyword search fallback -> resolve sender profile.

### 5.2 Tool task (Task Tools)
1. `task_list_groups`
- Nguồn: `GET /api/v1/tasks/groups`

2. `task_get_group`
- Input: `groupId`
- Nguồn: `GET /api/v1/tasks/groups/{groupId}`

3. `task_list_items`
- Input: `groupId`, `columnId?`
- Nguồn: `GET /api/v1/tasks/groups/{groupId}/items`

4. `task_list_my_items`
- Nguồn: `GET /api/v1/tasks/my-items`

5. `task_create_item`
- Input bám `CreateTaskItemRequest`:
  - `title`, `description?`, `columnId`, `assigneeIds?`, `startDate?`, `dueDate?`, `priority?`
- Nguồn: `POST /api/v1/tasks/groups/{groupId}/items`

6. `task_update_item`
- Input bám `UpdateTaskItemRequest`.
- Nguồn: `PATCH /api/v1/tasks/items/{taskId}`

7. `task_delete_item`
- Input: `taskId`
- Nguồn: `DELETE /api/v1/tasks/items/{taskId}`

8. `task_create_comment`
- Input: `taskId`, `content`, `attachments?`
- Nguồn: `POST /api/v1/tasks/items/{taskId}/comments`

9. `task_get_dashboard`
- Input: `groupId`
- Nguồn: `GET /api/v1/tasks/groups/{groupId}/dashboard`

## 6) Flow xử lý câu hỏi AI

### 6.1 Câu hỏi hội thoại
- B1: Classify intent (`conversation_qa`, `conversation_search`, `who_said`, `summary`).
- B2: Xác định scope:
  - Có `conversationId` rõ ràng -> search trong conversation đó.
  - Không có -> search trong toàn bộ conversation user tham gia.
- B3: Lấy context từ semantic hits + keyword hits.
- B4: Prompt Gemini trả lời có trích dẫn nguồn (conversationId/messageId/time).

### 6.2 Câu hỏi task
- B1: Classify intent (`read_task`, `create_task`, `update_task`, `delete_task`, `comment_task`, `dashboard`).
- B2: Nếu mutation (create/update/delete):
  - Nếu thiếu field -> AI hỏi bù.
  - Nếu đủ -> gọi tool tương ứng.
- B3: Trả kết quả theo ngôn ngữ tự nhiên + payload ngắn gọn.

### 6.3 Hybrid (chat + task)
- Ví dụ: "Từ đoạn chat với B, tạo task follow-up".
- Flow:
  - Tìm message liên quan -> trích dữ liệu (thời gian, nội dung, owner).
  - Gợi ý draft task.
  - Chỉ gọi `task_create_item` khi user xác nhận.

## 7) Quy tắc an toàn và quyền
- Luôn truyền `X-User-Id` sang các tool REST để backend enforce permission.
- AI không tự ý xóa/sửa dữ liệu khi người dùng chưa xác nhận explicit.
- Các tool đọc/ghi phải validate chặt schema input trước khi gọi.
- Chặn prompt injection trong trích xuất context:
  - Context chat được gắn nhãn "dữ liệu tham khảo" không phải chỉ thị hệ thống.

## 8) API mới cho khung AI riêng (đề xuất)
- `POST /api/v1/ai/threads`
  - Tạo thread mới.
- `GET /api/v1/ai/threads`
  - Danh sách thread của user.
- `GET /api/v1/ai/threads/{threadId}/messages`
  - Lấy lịch sử hội thoại AI.
- `POST /api/v1/ai/threads/{threadId}/messages`
  - Gửi prompt, nhận response (sync) hoặc stream (phase sau).
- `DELETE /api/v1/ai/threads/{threadId}`
  - Xóa thread AI.

## 9) Thứ tự implement đề xuất

### Phase 1 - AI Thread + Read-Only tools
- Tạo bảng/collection AI thread.
- Endpoint AI chat cơ bản.
- Tool đọc:
  - chat_list_my_conversations
  - chat_get_conversation_messages
  - chat_search_keyword
  - chat_semantic_search_conversation
  - task_list_groups
  - task_list_items
  - task_list_my_items
  - task_get_dashboard
- Acceptance:
  - AI trả lời được câu: "Tin nhắn mai họp 9h của ai?" + trích nguồn.

### Phase 2 - Task mutation tools
- Thêm create/update/delete/comment task.
- Flow xác nhận trước mutation.
- Acceptance:
  - AI tạo/sửa task thành công theo quyền user.

### Phase 3 - Semantic search toàn bộ không gian chat
- Thêm `chat_semantic_search_my_space`.
- Rank và explain kết quả đa conversation.
- Acceptance:
  - AI trả lời được khi user không nêu conversationId.

### Phase 4 - Hybrid workflows
- "Từ chat tạo task", "nhắc việc từ đoạn hội thoại".
- Tự động tóm tắt daily follow-up.

## 10) Rủi ro và cách giảm
- 403/401 từ task-service/chat-service: chuẩn hóa propagation auth header.
- Qdrant chưa sẵn hoặc vector disabled: degrade sang keyword search.
- API quota Gemini: retry + timeout + thông báo rõ user.
- Hallucination: bắt buộc trích nguồn message/task id cho câu trả lời factual.

## 11) Tiêu chí hoàn tất MVP
- AI chat riêng hoạt động ổn định cho mỗi user.
- Hỏi đáp hội thoại có semantic retrieval từ Qdrant.
- Đọc task + thao tác task cơ bản qua tool có kiểm soát xác nhận.
- Log đầy đủ: requestId, toolCalls, latency, lỗi từ từng tool.
