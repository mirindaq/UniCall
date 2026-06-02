# Luồng Trace Với Loki + Promtail

File này mô tả cách luồng log/trace hiện tại đang được triển khai cho UniCall.

## Mục Tiêu

Dùng Loki + Promtail để gom log của các microservice, sau đó query theo `trace_id` để biết một request đã đi qua những service nào.

Hệ thống hiện tại dùng:

- Header HTTP: `X-Correlation-Id`
- Field log: `trace_id`
- Docker/Loki label chính: `app`, `service`, `container`
- Log format: JSON, mỗi log là một dòng

## Tổng Quan Luồng Xử Lý

```text
Client
  |
  | HTTP request
  v
api-gateway
  |
  | forward X-Correlation-Id
  v
target service
  |
  | HTTP / gRPC / RabbitMQ
  v
downstream services

Docker logs
  |
  v
Promtail
  |
  v
Loki
  |
  v
Grafana query theo trace_id
```

## 1. Client Gọi API

Client có thể gửi sẵn header:

```http
X-Correlation-Id: abc-123
```

Nếu client không gửi, `api-gateway` sẽ tự tạo UUID mới.

## 2. API Gateway Xử Lý Trace ID

File triển khai:

```text
Backend/api-gateway/src/main/java/iuh/fit/api_gateway/config/GatewayTraceFilter.java
```

Gateway làm các việc:

1. Đọc header `X-Correlation-Id`.
2. Nếu header không có thì tạo UUID.
3. Set lại `X-Correlation-Id` vào request downstream.
4. Set `X-Correlation-Id` vào response để client debug.
5. Đưa `trace_id`, `method`, `path`, `status`, `duration_ms` vào MDC.
6. Log JSON với message `request completed` hoặc `request failed`.

Ví dụ log gateway:

```json
{
  "timestamp": "2026-06-02T04:18:30.001Z",
  "app": "unicall",
  "service": "api-gateway",
  "level": "INFO",
  "trace_id": "abc-123",
  "method": "POST",
  "path": "/api/v1/chat/messages",
  "status": "200",
  "duration_ms": "65",
  "message": "request completed"
}
```

## 3. Service HTTP Nhận Request

File triển khai chung:

```text
Backend/common-service/src/main/java/iuh/fit/common_service/observability/TraceHttpRequestFilter.java
```

Áp dụng cho các service có dependency `common-service` và chạy Spring MVC.

Filter này làm các việc:

1. Đọc `X-Correlation-Id` từ request.
2. Nếu không có thì tạo fallback UUID.
3. Đưa `trace_id`, `method`, `path` vào MDC.
4. Set `X-Correlation-Id` vào response.
5. Sau khi request xong, log `request completed`.
6. Nếu lỗi, log `request failed`.
7. Xóa MDC sau khi kết thúc request để tránh leak trace sang request khác.

Ví dụ log `chat-service`:

```json
{
  "timestamp": "2026-06-02T04:18:30.026Z",
  "app": "unicall",
  "service": "chat-service",
  "level": "INFO",
  "trace_id": "abc-123",
  "method": "POST",
  "path": "/api/v1/chat/messages",
  "status": "200",
  "duration_ms": "41",
  "message": "request completed"
}
```

## 4. Service Gọi HTTP Nội Bộ Bằng RestTemplate

File helper:

```text
Backend/common-service/src/main/java/iuh/fit/common_service/observability/TraceRestTemplate.java
```

Helper này thêm interceptor vào `RestTemplate`.

Khi service gọi HTTP downstream:

1. Lấy `trace_id` hiện tại từ MDC.
2. Set header `X-Correlation-Id` vào request downstream.
3. Downstream service tiếp tục log cùng `trace_id`.

Đang được gắn trong `chat-service` cho các call:

- Gemini API
- Qdrant API
- Task service tool API
- Assistant orchestrator HTTP calls

## 5. Service Gọi gRPC

Client helper:

```text
Backend/common-service/src/main/java/iuh/fit/common_service/observability/TraceGrpcClientInterceptor.java
Backend/common-service/src/main/java/iuh/fit/common_service/observability/GrpcTrace.java
```

Server interceptor:

```text
Backend/common-service/src/main/java/iuh/fit/common_service/observability/TraceGrpcServerInterceptor.java
```

gRPC dùng metadata:

```text
x-correlation-id
```

Luồng xử lý:

1. gRPC client lấy `trace_id` từ MDC.
2. Gắn vào metadata `x-correlation-id`.
3. gRPC server đọc metadata này.
4. Server đưa vào MDC `trace_id`.
5. Server log `grpc request completed` hoặc `grpc request cancelled`.

Ví dụ:

```json
{
  "timestamp": "2026-06-02T04:18:30.042Z",
  "app": "unicall",
  "service": "user-service",
  "level": "INFO",
  "trace_id": "abc-123",
  "method": "GRPC",
  "path": "iuh.fit.unicall.grpc.user.v1.UserService/GetUserProfileByIdentity",
  "status": "OK",
  "duration_ms": "8",
  "message": "grpc request completed"
}
```

## 6. Service Publish RabbitMQ Event

File helper:

```text
Backend/common-service/src/main/java/iuh/fit/common_service/observability/TraceRabbitTemplatePostProcessor.java
```

Khi service publish message RabbitMQ:

1. Lấy `trace_id` từ MDC.
2. Gắn vào message header `x-correlation-id`.
3. Gắn vào RabbitMQ `correlationId`.

Không cần sửa từng publisher vì helper này tự động gắn vào `RabbitTemplate`.

## 7. Service Consume RabbitMQ Event

Đã patch các listener:

```text
Backend/chat-service/src/main/java/iuh/fit/chat_service/services/impl/MessageVectorIndexEventListener.java
Backend/notification-service/src/main/java/iuh/fit/notification_service/services/impl/GroupNotificationEventConsumer.java
```

Consumer làm các việc:

1. Đọc header `x-correlation-id`.
2. Đưa vào MDC `trace_id`.
3. Xử lý event.
4. Log message trong cùng trace.
5. Xóa MDC sau khi xử lý xong.

Ví dụ log notification:

```json
{
  "timestamp": "2026-06-02T04:18:30.080Z",
  "app": "unicall",
  "service": "notification-service",
  "level": "INFO",
  "trace_id": "abc-123",
  "message": "notification event consumed type=GROUP_MEMBER_ADDED eventId=evt-001 recipients=3"
}
```

## 8. Promtail Gom Log

File config:

```text
observability/promtail/promtail-config.yml
```

Promtail làm các việc:

1. Đọc Docker containers qua Docker socket.
2. Chỉ lấy container có label `unicall.logging=true`.
3. Gắn Loki labels từ Docker labels:
   - `app`
   - `service`
   - `container`
4. Parse log JSON để đọc field `message` và `trace_id`.
5. Chỉ push flow logs vào Loki.

Các message được giữ lại:

```text
request completed
request failed
grpc request completed
grpc request cancelled
notification event consumed...
```

Các log chi tiết như Mongo debug, driver debug, log nghiệp vụ phụ vẫn còn trong `docker logs`, nhưng không được đẩy vào Loki để màn hình Grafana chỉ tập trung vào luồng request đi qua các service.

## 9. Loki Lưu Log

File config:

```text
observability/loki/loki-config.yml
```

Loki lưu log local trong volume:

```text
loki_data
```

Retention hiện tại:

```text
168h
```

Tức là giữ log khoảng 7 ngày.

## 10. Grafana Query

Datasource Loki được provision tại:

```text
observability/grafana/provisioning/datasources/loki.yml
```

Query tất cả log của một request:

```logql
{app="unicall"} | json | trace_id="abc-123"
```

Query log của một service:

```logql
{app="unicall", service="chat-service"} | json
```

Query request flow gọn:

```logql
{app="unicall"} | json | trace_id="abc-123"
| line_format "{{.service}} {{.method}} {{.path}} status={{.status}} duration_ms={{.duration_ms}} message={{.message}}"
```

Kết quả mong muốn:

```text
api-gateway POST /api/v1/chat/messages status=200 duration_ms=65 message=request completed
chat-service POST /api/v1/chat/messages status=200 duration_ms=41 message=request completed
user-service GRPC iuh.fit.unicall.grpc.user.v1.UserService/GetUserProfileByIdentity status=OK duration_ms=8 message=grpc request completed
notification-service   status= duration_ms= message=notification event consumed type=GROUP_MEMBER_ADDED eventId=evt-001 recipients=3
```

## Ví Dụ End-To-End

Nếu client gọi:

```http
POST /api/v1/chat/messages
X-Correlation-Id: abc-123
```

Flow có thể là:

```text
1. api-gateway nhận request
2. api-gateway forward X-Correlation-Id=abc-123 sang chat-service
3. chat-service xử lý gửi tin nhắn
4. chat-service gọi user-service bằng gRPC để lấy thông tin user
5. user-service log grpc request completed cùng trace_id=abc-123
6. chat-service publish notification event vào RabbitMQ
7. notification-service consume event và log cùng trace_id=abc-123
8. Promtail gom tất cả log vào Loki
9. Grafana query trace_id=abc-123 để xem toàn bộ flow
```

## Cách Chạy Trên Server

Build và chạy stack:

```bash
docker compose up -d --build
```

Xem container observability:

```bash
docker ps | grep -E "loki|promtail|grafana"
```

Mở Grafana:

```text
http://<server-ip>:3001
```

Mặc định Grafana thường là:

```text
admin / admin
```

## Cách Debug Nhanh

Lấy trace id từ response header:

```text
X-Correlation-Id: abc-123
```

Sau đó vào Grafana Explore và query:

```logql
{app="unicall"} | json | trace_id="abc-123"
```

Nếu không thấy log:

1. Kiểm tra Promtail có chạy không.
2. Kiểm tra container có label `unicall.logging=true` không.
3. Kiểm tra service có in JSON log không.
4. Kiểm tra log có message thuộc nhóm flow logs được Promtail giữ lại không.
5. Kiểm tra request có đi qua gateway không.
6. Kiểm tra downstream có nhận `X-Correlation-Id` hoặc `x-correlation-id` không.

## Giới Hạn Hiện Tại

Loki + Promtail + `trace_id` giúp xem flow qua log, nhưng không phải distributed tracing đầy đủ.

Hệ thống hiện tại chưa có:

- Span tree trực quan.
- Latency breakdown tự động theo từng sub-call.
- Auto instrumentation database.

Nếu cần những tính năng đó thì bước tiếp theo là thêm OpenTelemetry + Tempo.
