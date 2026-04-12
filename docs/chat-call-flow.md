# Chat + Call Flow (Frontend + Backend)

Tài liệu mô tả luồng realtime Chat và Call đang chạy trong UniCall, bám sát code hiện tại ở `Frontend` và `Backend/chat-service`.

## 1. Tổng quan kiến trúc

- FE dùng 1 STOMP client dùng chung: `Frontend/src/services/realtime/realtime-socket.service.ts`.
- FE layer chat bọc trên shared socket: `Frontend/src/services/chat/chat-socket.service.ts`.
- BE dùng Spring WebSocket STOMP:
  - STOMP endpoint: `/ws`
  - app destinations: `/app/*`
  - user destination prefix: `/user`
  - broker: `/topic`, `/queue`
- Mọi realtime event cho user được push về **một queue thống nhất**: `/user/queue/events`.

## 2. Kênh STOMP chuẩn

### FE gửi lên BE

- Gửi tin nhắn chat: `/app/chat.send`
- Gửi tín hiệu call (WebRTC signaling): `/app/call.signal`

### FE subscribe

- Queue realtime theo user: `/user/queue/events`

### Event type trong queue

- `MESSAGE_UPSERT`: tin nhắn mới/chỉnh sửa/thu hồi
- `CALL_SIGNAL`: tín hiệu gọi (`OFFER`, `ACCEPT`, `ICE_CANDIDATE`, `REJECT`, `END`) cho cả thoại và video

## 3. Luồng Chat realtime

### B1. FE gửi tin

- `chatSocketService.sendMessage(...)` publish lên `/app/chat.send`.
- BE vào `ChatStompController#sendMessage` rồi gọi `ChatMessageServiceImpl.sendFromStomp(...)`.

### B2. BE lưu DB + phát event

- `ChatMessageServiceImpl.persistAndBroadcast(...)`:
  - validate payload
  - lưu `Message`
  - cập nhật `Conversation.lastMessageContent`, `dateUpdateMessage`
- Sau đó phát đến từng participant qua:
  - `RealtimeEventPublisher.publishUserMessageEvent(...)`
  - thực thi bằng `SimpMessagingTemplate.convertAndSendToUser(..., "/queue/events", ...)`

### B3. FE nhận event

- `useChatSocket` subscribe `/user/queue/events`.
- `ChatWindow` xử lý `eventType === "MESSAGE_UPSERT"`:
  - update danh sách message đang mở
  - gọi `onRealtimeMessage` để cập nhật sidebar conversation (last message/time) kể cả khi đang mở chat khác.

## 4. Luồng Call realtime + WebRTC signaling

## 4.1 WebRTC và SDP là gì trong flow này

- `RTCPeerConnection`: đối tượng thiết lập kết nối media trực tiếp giữa 2 trình duyệt.
- `SDP` (`sdp` string): mô tả media/session.
- `offer SDP`: phía gọi tạo ra, gửi cho phía nhận.
- `answer SDP`: phía nhận tạo ra sau khi set remote offer.
- `ICE candidate`: địa chỉ mạng khả dụng để 2 peer tìm đường kết nối thực tế.
- `audioOnly`:
  - `true`: gọi thoại
  - `false`: gọi video (audio + video)

## 4.2 Contract payload Call (input/output)

### 4.2.1 FE -> BE (`/app/call.signal`) dùng `ConversationCallSignalRequest`

| Tham số | Kiểu | Bắt buộc | Dùng cho type | Ý nghĩa |
|---|---|---|---|---|
| `conversationId` | `string` | Có | Tất cả | ID hội thoại 1-1 đang gọi. |
| `callId` | `string` | Có (thực tế FE luôn gửi) | Tất cả | ID phiên gọi để gom `OFFER/ACCEPT/ICE/END` vào cùng một call. |
| `type` | enum | Có | Tất cả | Loại signal: `OFFER`, `ACCEPT`, `ICE_CANDIDATE`, `REJECT`, `END`. |
| `audioOnly` | `boolean` | Không | Tất cả | `true` là thoại, `false` là video. |
| `sdp` | `string` | Có với `OFFER`,`ACCEPT` | `OFFER`,`ACCEPT` | SDP raw do WebRTC sinh ra (`pc.localDescription.sdp`). |
| `candidate` | `string` | Có với `ICE_CANDIDATE` | `ICE_CANDIDATE` | Chuỗi candidate raw do `onicecandidate` trả về. |
| `sdpMid` | `string` | Không | `ICE_CANDIDATE` | Media stream id của candidate (thường `"0"` cho audio). |
| `sdpMLineIndex` | `number` | Không | `ICE_CANDIDATE` | Index m-line tương ứng trong SDP (thường `0` cho audio). |

Lưu ý:

- `sdp` và `candidate` phải truyền raw, không trim/replace newline.
- `callId` phải giữ nguyên trong suốt một phiên gọi.

Giải thích nhanh từng tham số:

- `conversationId`: xác định cuộc hội thoại nào đang gọi. Nếu sai ID, BE sẽ chặn vì user không thuộc conversation đó.
- `callId`: mã phiên gọi duy nhất. Toàn bộ `OFFER`, `ACCEPT`, `ICE_CANDIDATE`, `END` của cùng một cuộc gọi phải dùng chung callId này.
- `type`: hành động hiện tại của signaling.
  - `OFFER`: bắt đầu đề nghị kết nối.
  - `ACCEPT`: bên nhận đồng ý và trả answer.
  - `ICE_CANDIDATE`: gửi thêm địa chỉ mạng để đàm phán đường truyền.
  - `REJECT`: từ chối cuộc gọi.
  - `END`: kết thúc/hủy cuộc gọi.
- `audioOnly`: cờ định nghĩa media call.
  - `true`: FE lấy media `audio: true, video: false`
  - `false`: FE lấy media `audio: true, video: { facingMode: "user" }`
- `sdp`: bản mô tả media/session do WebRTC tạo ra.
  - Với caller: đây là offer SDP.
  - Với callee: đây là answer SDP.
  - FE nhận về sẽ đưa vào `setRemoteDescription(...)`.
- `candidate`: một ICE candidate cụ thể (địa chỉ IP/port/protocol khả dụng).
- `sdpMid`: định danh media section mà candidate này thuộc về (thường `"0"` trong call audio 1 track).
- `sdpMLineIndex`: vị trí media line tương ứng trong SDP (thường `0` cho audio đầu tiên).

### 4.2.2 BE -> FE (`/user/queue/events`) dùng `UserRealtimeEventResponse` (`eventType = CALL_SIGNAL`)

`UserRealtimeEventResponse` bọc ngoài:

| Tham số | Kiểu | Ý nghĩa |
|---|---|---|
| `eventType` | enum | `CALL_SIGNAL` cho luồng call. |
| `conversationId` | `string` | Hội thoại liên quan. |
| `sentAt` | datetime | Thời điểm BE phát event. |
| `callSignal` | object | Payload chi tiết tín hiệu call. |

`callSignal` bên trong (`ConversationCallSignalResponse`):

| Tham số | Kiểu | Ý nghĩa |
|---|---|---|
| `conversationId` | `string` | Hội thoại của call. |
| `callId` | `string` | ID phiên gọi. |
| `type` | enum | `OFFER`,`ACCEPT`,`ICE_CANDIDATE`,`REJECT`,`END`. |
| `fromUserId` | `string` | Người vừa gửi signal. |
| `toUserId` | `string` | Người đích của signal. |
| `audioOnly` | `boolean` | Cờ call thoại. |
| `sdp` | `string?` | Có khi `OFFER` hoặc `ACCEPT`. |
| `candidate` | `string?` | Có khi `ICE_CANDIDATE`. |
| `sdpMid` | `string?` | Đi kèm candidate. |
| `sdpMLineIndex` | `number?` | Đi kèm candidate. |
| `sentAt` | datetime | Thời điểm BE tạo signal response. |

BE phát cho cả 2 bên, FE phải bỏ qua event do chính mình gửi:

```ts
if (signal.fromUserId === currentUserId) return
```

Giải thích thêm các tham số BE trả về:

- `fromUserId`: ai vừa phát tín hiệu này.
- `toUserId`: người nhận đích của tín hiệu theo ngữ cảnh nghiệp vụ.
- `sentAt`: thời gian BE đóng gói và phát event.
- `callSignal.sdp` hoặc `callSignal.candidate`: FE dùng để thao tác WebRTC thật sự (`setRemoteDescription`, `addIceCandidate`).

## 4.3 Ví dụ payload theo từng signal type

### 4.3.1 OFFER (caller -> BE)

```json
{
  "conversationId": "5bed058a-f5c4-4b48-a0c6-9702300478fd",
  "callId": "31bb652e-e94e-48fe-abe3-3d8f6fa5ea97",
  "type": "OFFER",
  "audioOnly": true,
  "sdp": "v=0\r\no=- 461173266367772751 2 IN IP4 127.0.0.1\r\ns=-\r\n..."
}
```

Ý nghĩa:

- Mở phiên gọi mới và gửi mô tả media từ caller.
- Callee dùng `sdp` này để `setRemoteDescription(offer)`.

### 4.3.2 ACCEPT (callee -> BE)

```json
{
  "conversationId": "5bed058a-f5c4-4b48-a0c6-9702300478fd",
  "callId": "31bb652e-e94e-48fe-abe3-3d8f6fa5ea97",
  "type": "ACCEPT",
  "audioOnly": true,
  "sdp": "v=0\r\no=- 6222048394468081265 2 IN IP4 127.0.0.1\r\ns=-\r\n..."
}
```

Ý nghĩa:

- Xác nhận nhận cuộc gọi và trả answer SDP cho caller.
- Caller nhận rồi `setRemoteDescription(answer)`.

Ví dụ OFFER cho video call:

```json
{
  "conversationId": "5bed058a-f5c4-4b48-a0c6-9702300478fd",
  "callId": "9c8f9dfd-6d02-4341-9cc6-e3e51d843118",
  "type": "OFFER",
  "audioOnly": false,
  "sdp": "v=0\r\no=- 3119016509920432468 2 IN IP4 127.0.0.1\r\ns=-\r\n..."
}
```

Ví dụ ACCEPT cho video call:

```json
{
  "conversationId": "5bed058a-f5c4-4b48-a0c6-9702300478fd",
  "callId": "9c8f9dfd-6d02-4341-9cc6-e3e51d843118",
  "type": "ACCEPT",
  "audioOnly": false,
  "sdp": "v=0\r\no=- 749151388588431215 2 IN IP4 127.0.0.1\r\ns=-\r\n..."
}
```

### 4.3.3 ICE_CANDIDATE (2 chiều)

```json
{
  "conversationId": "5bed058a-f5c4-4b48-a0c6-9702300478fd",
  "callId": "31bb652e-e94e-48fe-abe3-3d8f6fa5ea97",
  "type": "ICE_CANDIDATE",
  "audioOnly": true,
  "candidate": "candidate:4048816459 1 udp 2122260223 192.168.1.10 53989 typ host generation 0 ufrag HyQj network-id 1",
  "sdpMid": "0",
  "sdpMLineIndex": 0
}
```

Ý nghĩa:

- Cập nhật endpoint mạng để 2 peer tìm đường nối tốt nhất.
- Nếu chưa có remote description, FE queue candidate rồi add sau.

### 4.3.4 REJECT (callee -> BE)

```json
{
  "conversationId": "5bed058a-f5c4-4b48-a0c6-9702300478fd",
  "callId": "31bb652e-e94e-48fe-abe3-3d8f6fa5ea97",
  "type": "REJECT",
  "audioOnly": true
}
```

Ý nghĩa:

- Từ chối cuộc gọi trước khi thiết lập xong media.

### 4.3.5 END (caller hoặc callee -> BE)

```json
{
  "conversationId": "5bed058a-f5c4-4b48-a0c6-9702300478fd",
  "callId": "31bb652e-e94e-48fe-abe3-3d8f6fa5ea97",
  "type": "END",
  "audioOnly": true
}
```

Ý nghĩa:

- Kết thúc cuộc gọi đang diễn ra hoặc hủy khi đang đổ chuông.

## 4.4 Sequence chi tiết caller/callee

### Caller

1. `createPeerConnection()`.
2. `getUserMedia(...)`:
   - thoại: `audio=true`, `video=false`
   - video: `audio=true`, `video=true`
3. `addTrack(...)`:
   - thoại: add audio track
   - video: add audio + video track
4. `createOffer()` -> `setLocalDescription(offer)`.
5. Gửi `OFFER` với `sdp = pc.localDescription.sdp` + `audioOnly`.
6. Nhận `ACCEPT` -> `setRemoteDescription(answer)`.
7. Nhận/gửi `ICE_CANDIDATE` đến khi `connectionState = connected`.

### Callee

1. Nhận `OFFER` từ `/user/queue/events`.
2. `createPeerConnection()`.
3. Đọc `signal.audioOnly` để quyết định gọi thoại hay video.
4. `getUserMedia(...)` và `addTrack(...)` theo loại cuộc gọi.
5. `setRemoteDescription(offer)`.
6. `createAnswer()` -> `setLocalDescription(answer)`.
7. Gửi `ACCEPT` với `sdp = pc.localDescription.sdp` + `audioOnly`.
8. Nhận/gửi `ICE_CANDIDATE` đến khi `connectionState = connected`.

## 4.5 Xử lý ICE queue và điều kiện add candidate

- Nếu FE nhận candidate khi chưa có `pc.remoteDescription`, candidate được đẩy vào `pendingIceCandidatesRef`.
- Sau khi `setRemoteDescription` thành công, FE gọi flush để `addIceCandidate` lần lượt.
- Mục tiêu: tránh lỗi add candidate quá sớm.

## 4.6 BE xử lý signal + state call

- `CallStompController#sendSignal` vào `ConversationCallServiceImpl.sendSignal(...)`.
- Validate chính:
  - user thuộc conversation.
  - conversation phải là `DOUBLE`.
  - `OFFER/ACCEPT` bắt buộc có `sdp`.
  - `ICE_CANDIDATE` bắt buộc có `candidate`.
- Đồng bộ `CallSession`:
  - `OFFER`: khởi tạo/cập nhật phiên call.
  - `ACCEPT`: set thời điểm accepted.
  - `REJECT/END`: set outcome + endedAt + duration.
- Phát realtime qua `RealtimeEventPublisher.publishUserCallSignalEvent(...)`.

Lưu ý quan trọng hiện tại:

- SDP/candidate đang giữ **raw 100%** từ FE sang BE và từ BE về FE (không trim/replace), để tránh hỏng định dạng SDP.

## 4.7 Kết thúc cuộc gọi

- Khi một bên gửi `END` hoặc `REJECT`, FE cleanup peer connection/local stream và reset state.
- BE cập nhật `CallSession` outcome (`COMPLETED`, `NO_ANSWER`, `REJECTED`, `CANCELED`).
- Nếu call kết thúc hợp lệ, BE tạo message type `CALL` để hiển thị vào lịch sử chat.

Lưu ý mới (audio + video):

- FE có `startAudioCall()` và `startVideoCall()`, cùng dùng một signaling flow.
- UI call video dùng `remoteVideoRef` (video bên kia) + `localVideoRef` (preview local).
- BE dùng `audioOnly` để phân biệt text lịch sử:
  - thoại: `Cuộc gọi thoại`, `Cuộc gọi nhỡ`, `Cuộc gọi bị từ chối`
  - video: `Cuộc gọi video`, `Cuộc gọi video nhỡ`, `Cuộc gọi video bị từ chối`

## 5. Auth + phân quyền subscribe

- `ChatStompChannelInterceptor` kiểm tra:
  - CONNECT phải có user trong session/principal
  - SUBSCRIBE conversation topic chỉ cho participant
  - cho phép subscribe `/user/queue/events`
- Mục tiêu: user chỉ nghe được event của chính họ, và chỉ subscribe đúng conversation được phép.

## 6. FE cấp App vs cấp Chat

Hiện tại theo hướng best practice cho app chat:

- Có 1 shared STOMP connection cấp app (`realtime-socket.service.ts`).
- Mọi event user-level đi qua `/user/queue/events`.
- Component chat/call chỉ đăng ký listener, không tự tạo socket mới.
- `UserLayout` gắn `useConversationCall` ở scope global (khi không ở trang chat) để đang tab nào cũng bật được incoming call popup.

## 7. Các file chính để trace

### Frontend

- `src/services/realtime/realtime-socket.service.ts`
- `src/services/chat/chat-socket.service.ts`
- `src/hooks/useChatSocket.ts`
- `src/hooks/useConversationCall.ts`
- `src/components/message/ChatWindow.tsx`
- `src/layouts/UserLayout.tsx`
- `src/types/chat.ts`

### Backend (chat-service)

- `config/WebSocketConfig.java`
- `config/ChatStompChannelInterceptor.java`
- `controllers/ChatStompController.java`
- `controllers/CallStompController.java`
- `services/impl/ChatMessageServiceImpl.java`
- `services/impl/ConversationCallServiceImpl.java`
- `services/RealtimeEventPublisher.java`
- `services/impl/RealtimeEventPublisherImpl.java`
- `dtos/response/UserRealtimeEventResponse.java`

## 8. Checklist debug nhanh

- Không nhận event:
  - kiểm tra đã connect STOMP chưa
  - đã subscribe `/user/queue/events` chưa
  - token/session user có hợp lệ không (401)
- Có incoming call nhưng bấm nhận không vào call:
  - kiểm tra `OFFER` có `sdp` đầy đủ
  - đảm bảo SDP raw, không trim/replace
  - kiểm tra permission micro
- Kết nối lên nhưng không nghe tiếng nói:
  - kiểm tra `MediaStreamTrack.readyState` không phải `ended`
  - kiểm tra audio element đã bind `remoteAudioRef` và `play()`
- Sidebar không cập nhật đoạn chat:
  - đảm bảo xử lý `MESSAGE_UPSERT` ở layer dùng chung (`onRealtimeMessage`).

## 9. Định hướng mở rộng (khuyến nghị)

- Thêm ack cho signal quan trọng (`OFFER`, `ACCEPT`) nếu muốn tăng độ chắc chắn.
- Thêm call timeout/cancel policy nhất quán FE-BE.
- Nếu cần scale cao hơn, cân nhắc chuyển từ simple broker sang message broker ngoài (RabbitMQ/Kafka bridge) cho realtime.
