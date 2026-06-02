# Loki + Promtail Microservice Logging Plan

## Muc tieu

Thiet lap he thong log nhe cho UniCall bang Loki, Promtail va Grafana de:

- Gom log cua cac container microservice dang chay bang Docker.
- Tim log theo tung service: `api-gateway`, `chat-service`, `user-service`, `friend-service`, `file-service`, ...
- Biet mot request di qua nhung service nao bang mot ID chung xuyen suot request.
- Giu cau hinh nhe hon ELK de phu hop server khoang 8GB RAM.

## Co can trace id khong?

Co. Neu muon biet mot request di qua nhung service nao, bat buoc phai co mot ID chung duoc tao o diem vao he thong va truyen qua cac service sau do.

Nen ap dung nhu sau:

- Dung `X-Correlation-Id` cho request/log correlation.
- Log field nen dat la `trace_id` hoac `correlation_id`.
- Khuyen nghi dung field `trace_id` trong log de sau nay ghep voi OpenTelemetry/Tempo de hon.
- Neu client gui san `X-Correlation-Id`, gateway giu lai.
- Neu client khong gui, gateway tao UUID moi.

Ket luan: Loki/Promtail khong tu tao duoc request flow. App phai tao, propagate va log `trace_id`.

## Kien truc de xuat

```text
Frontend/Mobile
    |
    | HTTP/WebSocket
    v
api-gateway
    |
    | HTTP
    v
microservices
    |
    | gRPC / RabbitMQ / HTTP
    v
downstream services

Docker logs -> Promtail -> Loki -> Grafana
```

## Thanh phan can them

### Loki

Loki luu log va ho tro truy van LogQL.

Khuyen nghi cau hinh nhe:

- Bat filesystem storage local.
- Khong can Elasticsearch.
- Gioi han retention log neu server it disk.

### Promtail

Promtail doc Docker logs tu host va day vao Loki.

Promtail can mount:

- `/var/run/docker.sock`
- `/var/lib/docker/containers`

Promtail gan labels tu Docker container:

- `app`
- `service`
- `container`
- `image`

Promtail chi day flow logs vao Loki de Grafana khong bi roi boi log debug/noise. Cac message duoc giu:

```text
request completed
request failed
grpc request completed
grpc request cancelled
notification event consumed...
```

Log chi tiet van xem duoc bang `docker logs`, nhung khong day vao Loki.

Docker Compose gan labels cho moi service:

```yaml
labels:
  unicall.app: unicall
  unicall.service: chat-service
  unicall.logging: "true"
```

### Grafana

Grafana dung de query Loki va tao dashboard.

Dashboard nen co:

- Logs by service.
- Logs by `trace_id`.
- Error logs by service.
- Request timeline theo `trace_id`.

## Docker Compose services can them

Them cac service sau vao `docker-compose.yml`:

```yaml
loki:
  image: grafana/loki:2.9.8
  container_name: unicall-loki
  restart: unless-stopped
  ports:
    - "3100:3100"
  command: -config.file=/etc/loki/loki-config.yml
  volumes:
    - ./observability/loki/loki-config.yml:/etc/loki/loki-config.yml:ro
    - loki_data:/loki

promtail:
  image: grafana/promtail:2.9.8
  container_name: unicall-promtail
  restart: unless-stopped
  depends_on:
    - loki
  command: -config.file=/etc/promtail/promtail-config.yml
  volumes:
    - ./observability/promtail/promtail-config.yml:/etc/promtail/promtail-config.yml:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - /var/lib/docker/containers:/var/lib/docker/containers:ro

grafana:
  image: grafana/grafana:10.4.3
  container_name: unicall-grafana
  restart: unless-stopped
  depends_on:
    - loki
  ports:
    - "3001:3000"
  volumes:
    - grafana_data:/var/lib/grafana
```

Them volumes:

```yaml
volumes:
  loki_data:
  grafana_data:
```

## Chuan log cho Spring services

Moi service nen log co cac field toi thieu:

```json
{
  "app": "unicall",
  "service": "chat-service",
  "trace_id": "8f56c7d2-4f8a-4ad2-98b8-9240c6d0c22c",
  "method": "POST",
  "path": "/api/v1/chat/messages",
  "status": 200,
  "duration_ms": 42,
  "message": "request completed"
}
```

Quy uoc format log:

- Moi log event la mot JSON object tren mot dong.
- `app` co gia tri `unicall`.
- `service` la ten microservice, lay tu `spring.application.name`.
- `trace_id` la ID chung cua request, lay tu header `X-Correlation-Id`.
- `method`, `path`, `status`, `duration_ms` chi bat buoc voi HTTP request log.
- `message` la noi dung log chinh, phai ngan gon va de tim kiem.
- Cac field khac co the them sau: `level`, `logger`, `user_id`, `conversation_id`, `error`, `exception`.

Vi du log loi:

```json
{
  "app": "unicall",
  "service": "chat-service",
  "trace_id": "8f56c7d2-4f8a-4ad2-98b8-9240c6d0c22c",
  "level": "ERROR",
  "method": "POST",
  "path": "/api/v1/chat/messages",
  "status": 500,
  "duration_ms": 219,
  "message": "failed to send chat message",
  "error": "MongoTimeoutException"
}
```

Trong Grafana, nen hien thi log theo cac cot:

```text
time | service | trace_id | method | path | status | duration_ms | message
```

Neu chua muon doi sang JSON log, co the dung pattern log co MDC:

```text
[%d{yyyy-MM-dd HH:mm:ss.SSS}] [%thread] %-5level %logger{36} trace_id=%X{trace_id} service=${spring.application.name} - %msg%n
```

## Propagation qua HTTP

### API Gateway

Them `GlobalFilter`:

- Doc header `X-Correlation-Id`.
- Neu khong co thi tao UUID.
- Set vao request header downstream.
- Set vao response header de client co the debug.
- Dua vao MDC voi key `trace_id`.

### Servlet services

Them filter cho cac service MVC:

- Doc `X-Correlation-Id`.
- Neu khong co thi tao UUID fallback.
- Dua vao MDC `trace_id`.
- Ghi log request start/end neu can.
- Xoa MDC sau khi request ket thuc.

### WebFlux services

Neu service reactive, can dung Reactor context hoac filter rieng. Khong nen chi dua vao MDC truyen thong vi co the mat context khi doi thread.

## Propagation qua gRPC

Can them metadata key:

```text
x-correlation-id
```

Client interceptor:

- Lay `trace_id` tu MDC.
- Gan vao gRPC metadata.

Server interceptor:

- Doc `x-correlation-id`.
- Dua vao MDC `trace_id`.
- Xoa MDC sau khi call ket thuc.

## Propagation qua RabbitMQ

Publisher:

- Lay `trace_id` tu MDC.
- Gan vao message header `x-correlation-id`.

Consumer:

- Doc header `x-correlation-id`.
- Dua vao MDC `trace_id` truoc khi xu ly message.
- Xoa MDC sau khi xu ly xong.

Vi RabbitMQ la async, mot request co the tach thanh nhieu event. Van dung chung `trace_id` de thay duoc luong xu ly lien quan.

## Query trong Grafana/Loki

Tim tat ca log cua mot request:

```logql
{app="unicall"} | json | trace_id="8f56c7d2-4f8a-4ad2-98b8-9240c6d0c22c"
```

Hien thi ro cac field chinh:

```logql
{app="unicall"} | json | trace_id="8f56c7d2-4f8a-4ad2-98b8-9240c6d0c22c"
| line_format "{{.service}} trace_id={{.trace_id}} {{.method}} {{.path}} status={{.status}} duration_ms={{.duration_ms}} message={{.message}}"
```

Neu log chua phai JSON:

```logql
{app="unicall"} |= "trace_id=8f56c7d2-4f8a-4ad2-98b8-9240c6d0c22c"
```

Xem loi theo service:

```logql
{app="unicall"} |~ "ERROR|Exception"
```

Xem log cua chat service:

```logql
{app="unicall", service="chat-service"}
```

## Flow mong muon khi debug

Vi du request gui tin nhan chat:

```text
trace_id=abc api-gateway receives POST /api/v1/chat/messages
trace_id=abc chat-service validates conversation
trace_id=abc chat-service calls user-service by gRPC
trace_id=abc user-service returns user profile
trace_id=abc chat-service publishes notification event to RabbitMQ
trace_id=abc notification-service consumes event
trace_id=abc notification-service sends notification
```

Khi query theo `trace_id=abc`, Grafana se hien duoc request da di qua:

```text
api-gateway -> chat-service -> user-service -> notification-service
```

## Thu tu trien khai

1. Them Loki, Promtail, Grafana vao Docker Compose.
2. Tao config cho Loki va Promtail.
3. Chay stack va kiem tra Promtail co thu log container.
4. Them `trace_id` vao log format cua tat ca Spring services.
5. Them gateway filter tao/truyen `X-Correlation-Id`.
6. Them HTTP filter cho cac microservice.
7. Them gRPC client/server interceptors.
8. Them RabbitMQ header propagation.
9. Tao Grafana dashboard va query mau.
10. Test mot request end-to-end va verify log cung `trace_id`.

## Khi nao can OpenTelemetry/Tempo?

Loki + Promtail + `trace_id` du de debug log va biet request di qua nhung service nao.

Can them OpenTelemetry/Tempo neu muon:

- Xem trace tree truc quan.
- Do latency tung span.
- Biet call nao cham nhat trong mot request.
- Tu dong capture HTTP/gRPC/database spans.

Khuyen nghi cho UniCall hien tai: lam Loki + Promtail + `trace_id` truoc, sau do moi them Tempo neu server du tai nguyen.
