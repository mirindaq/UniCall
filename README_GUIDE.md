# UniCall - Orchestrator Usage Guide

Tai lieu nay thong nhat cach chon flow cho team:
- Khi nao dung `orchestrator` (saga).
- Khi nao goi binh thuong service-to-service.
- Cach code de tranh du logic va tranh trang thai khong nhat quan.

## 1) Rule nhanh de quyet dinh

Su dung **flow binh thuong** neu:
- Chi co `1 step` nghiep vu chinh.
- Hoac co nhieu step nhung cung 1 service/database transaction.
- Failure co the xu ly don gian tai cho goi.

Su dung **orchestrator/saga** neu:
- Co tu `2 step` tro len qua nhieu service.
- Moi step tao side effect rieng (DB, external API, queue, billing...).
- Can compensation theo thu tu neu fail o giua.
- Can retry va theo doi trang thai toan bo flow.

## Proto naming convention (bat buoc cho team)

Chia proto theo service:
- `proto-common/user-service.proto`
- `proto-common/identity-service.proto`
- `proto-common/saga-orchestrator.proto`

Rule vang:
1. `1 service = 1 file proto`.
2. Service name phai unique trong he thong:
   - `UserService`
   - `IdentityService`
   - `SignupSagaService`
3. File name nen map truc tiep voi service:
- `user-service.proto` -> `UserService`
- `identity-service.proto` -> `IdentityService`
- `saga-orchestrator.proto` -> `SignupSagaService`

## 2) Vi du ap dung trong UniCall

### Case A: Register 1-step (hien tai)

Flow de nghi:
1. `identity-service` tao user o Keycloak.
2. `identity-service` goi truc tiep `user-service.createUserProfile`.
3. Neu buoc 2 fail -> xoa user Keycloak de rollback.

Khong can `saga-orchestrator-service` vi:
- Chi co 1 action xuong user-service.
- Them orchestrator luc nay tang do phuc tap van hanh, logs, timeout path.

Vi du xu ly theo code hien tai (tham chieu `identity-service`):

```java
// KeycloakAuthServiceImpl.register(...)
String identityUserId = keycloakIdentityClient.createUser(request);
try {
    return grpcUserServiceClient.register(request, identityUserId); // goi user-service.createUserProfile
} catch (RuntimeException ex) {
    keycloakIdentityClient.deleteUser(identityUserId); // rollback Keycloak
    throw ex;
}
```

```java
// GrpcUserServiceClient.register(...)
CreateUserProfileResponse response = userStub.createUserProfile(grpcRequest);
if (response.getIdentityUserId().isBlank()) {
    throw new RuntimeException("User service returned an empty identityUserId");
}
```

Checklist cho Case A:
1. Rollback step truoc neu step sau fail.
2. Timeout phai ro rang (grpc deadline).
3. Message loi tra ve phai map dung (`ALREADY_EXISTS`, `INVALID_ARGUMENT`...).

### Case B: Register nhieu step (tuong lai)

Vi du flow:
1. Tao user Keycloak.
2. Tao profile.
3. Tao wallet mac dinh.
4. Gui welcome email.

Nen dung orchestrator vi:
- Co nhieu side effect, fail o step 3/4 can compensation step 2/1.
- Can state machine de biet dang o step nao.

Vi du xu ly khi nang cap thanh saga (mau de coder team follow):

```text
SignupSagaService.startSaga(command):
  sagaId = createSaga(PENDING)

  step1 createKeycloakUser -> SUCCESS
  step2 createUserProfile -> SUCCESS
  step3 createWallet -> FAILED

  compensate step2 deleteUserProfile -> COMPENSATED
  compensate step1 deleteKeycloakUser -> COMPENSATED

  markSaga(FAILED)
  return error with sagaId
```

Pseudo-code khung:

```java
try {
    keycloakId = identityClient.createUser(...);
    markStep("CREATE_KEYCLOAK_USER", SUCCESS);

    profileId = userClient.createProfile(...);
    markStep("CREATE_PROFILE", SUCCESS);

    walletId = walletClient.createWallet(...);
    markStep("CREATE_WALLET", SUCCESS);

    markSaga(SUCCESS);
} catch (Exception ex) {
    compensateInReverseOrder();
    markSaga(FAILED);
    throw ex;
}
```

Checklist cho Case B:
1. Moi step + compensation phai idempotent.
2. Co bang/tracker luu state tung step.
3. Co `sagaId/correlationId` trong logs de trace end-to-end.
4. Co test cho fail giua flow va timeout/retry.

## 3) Coding checklist cho 2 kieu flow

### A. Normal flow (khong orchestrator)

- Keep thin:
  - Controller -> Service -> 1 client call chinh.
- Handle rollback ro rang:
  - Neu step sau fail thi rollback step truoc.
- Dat timeout hop ly cho gRPC/HTTP.
- Tra loi error message ro cho client.

### B. Orchestrator flow (saga)

- Moi request phai co `sagaId` (hoac correlationId) de trace.
- Luu state tung step: `PENDING`, `SUCCESS`, `FAILED`, `COMPENSATED`.
- Moi action va compensation phai **idempotent**.
- Retry co gioi han + backoff.
- Timeout khong rollback mu:
  - Kiem tra state truoc khi compensate.
- Metrics/log bat buoc:
  - ti le fail theo step
  - so lan compensate
  - thoi gian trung binh moi saga

## 4) Smell can tranh

- Dung orchestrator cho 1-step CRUD don gian.
- Double orchestration (2 lop dieu phoi) ma khong co gia tri bo sung.
- Mapping data trung lap o nhieu lop.
- Compensate ngay khi timeout ma khong verify trang thai step ben kia.

## 5) Rule review PR

Khi review PR co lien quan flow moi:
1. Liet ke so step va service tham gia.
2. Neu `<= 1 step` qua 1 service -> reject orchestrator (tru khi co ly do dac biet).
3. Neu `>= 2 step` qua nhieu service -> yeu cau saga design (state + compensation + idempotency).
4. Bat buoc co test cho scenario fail/timeout.

## 6) Lay user da xac thuc o API Gateway

Theo code hien tai cua UniCall:
- Gateway dung `oauth2ResourceServer().jwt(...)` de xac thuc bearer token.
- Sau khi xac thuc, `JwtHeaderInjectionFilter` inject:
  - `X-User-Id` = `sub` cua JWT
  - `X-User-Role` = role dau tien tim thay trong `roles` hoac `realm_access.roles`

Tham chieu:
- `Backend/api-gateway/src/main/java/iuh/fit/api_gateway/config/SecurityConfig.java`
- `Backend/api-gateway/src/main/java/iuh/fit/api_gateway/config/JwtHeaderInjectionFilter.java`

### Cach dung o service phia sau gateway

Controller co the doc truc tiep header:

```java
@GetMapping("/me")
public ResponseEntity<?> me(
        @RequestHeader(value = "X-User-Id", required = false) String userId,
        @RequestHeader(value = "X-User-Role", required = false) String userRole
) {
    if (userId == null || userId.isBlank()) {
        throw new UnauthenticatedException("Missing authenticated user header");
    }
    return ResponseEntity.ok(Map.of("userId", userId, "role", userRole));
}
```

### API that trong `user-service` de service khac goi

Da them 2 endpoint:
1. `GET /api/v1/users/me`
- Dung cho request di qua gateway.
- `user-service` doc `X-User-Id` va tra profile cua chinh user dang dang nhap.

2. `GET /api/v1/users/identity/{identityUserId}`
- Dung cho service-to-service noi bo khi da biet `identityUserId`.
- Tra profile theo `identityUserId`.

Them gRPC cho service-to-service:
- `UserService/GetUserProfileByIdentity`
- Request: `identityUserId`
- Response: profile day du (`id`, `identityUserId`, `phoneNumber`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `avatar`, `isActive`)

Khuyen dung:
1. Frontend qua gateway: goi `GET /api/v1/users/me` (gateway se co `X-User-Id`).
2. Service-to-service: uu tien gRPC `GetUserProfileByIdentity`.

Neu can lay profile day du cua user trong chat-service:
- Goi `user-service /api/v1/users/me` (forward `X-User-Id`), hoac
- Goi `user-service /api/v1/users/identity/{identityUserId}`

Rule khuyen dung:
1. Chi tin header `X-User-*` khi request di qua API Gateway noi bo.
2. Khong expose service backend truc tiep ra internet neu dang dung co che header nay.
3. Neu endpoint can role, check role tai service duoi truoc khi xu ly business logic.

## 7) Pattern Search/Sort (bat buoc follow)

Muc tieu:
- Search/sort giua cac service phai dong nhat.
- Coder moi vao team co mau de copy nhanh.

### 7.1 Quy uoc query param

Ap dung cho REST list API (vi du user search):
- `page`: trang bat dau tu `1`
- `limit`: so item moi trang
- `sortBy`: kieu `field:asc` hoac `field:desc`
- `search`: filter nang cao theo parser cua `common-service`
- `keyword`: keyword nhanh cho UI search box

Vi du request:

```http
GET /api/v1/users/search?page=1&limit=5&sortBy=firstName:asc&keyword=091196
```

### 7.2 Pattern backend (service)

Follow mau hien tai o `user-service`:
1. Validate input (`keyword` hoac `search` phai co gia tri).
2. Merge `keyword` vao chuoi `search`.
3. Parse specification bang `SearchQueryParser.parse(...)`.
4. Them filter he thong (vd `isActive=true`).
5. Parse sort bang `SortUtils.parseSort(sortBy)`.
6. Tra `PageResponse.fromPage(...)`.

Pseudo-code:

```java
String mergedSearch = mergeSearchWithKeyword(search, keyword);
SpecificationBuildQuery<User> buildQuery = SearchQueryParser.parse(mergedSearch);
buildQuery.withCustom((root, query, cb) -> cb.isTrue(root.get("isActive")));

Pageable pageable = PageRequest.of(page - 1, limit, SortUtils.parseSort(sortBy));
Page<User> userPage = userRepository.findAll(buildQuery.build(), pageable);

return PageResponse.fromPage(userPage, UserSearchResponse::from);
```

### 7.3 Pattern sortBy

Khuyen dung:
- Mac dinh: `firstName:asc`
- Truyen tu FE vao service qua query string.
- Khong hard-code sort trong repository query neu da co `SortUtils`.

Vi du:
- `sortBy=firstName:asc`
- `sortBy=createdAt:desc`

### 7.3.1 Quy uoc parse `search` (toan tu)

Theo parser trong `common-service`, team dung nhanh cac toan tu sau:
- `field:value`: so sanh bang (exact match)
- `field~value`: tim gan dung/chua chuoi (contains)
- `,`: AND condition
- `'`: OR condition

Vi du:

```text
phoneNumber:0911964350
```
- Nghia: `phoneNumber` bang dung `0911964350`.

```text
firstName~viet
```
- Nghia: `firstName` co chua `viet`.

```text
isActive:true,gender:male
```
- Nghia: `isActive = true` AND `gender = male`.

```text
phoneNumber~091196'firstName~viet'lastName~giap
```
- Nghia: match theo phone OR firstName OR lastName.

Quy tac chon toan tu:
- Tim exact theo id/phone duy nhat: uu tien `:`.
- Tim theo ten/keyword linh hoat: dung `~`.


### 7.4 Checklist PR cho API search/sort

1. Response list phai la `PageResponse<T>`.
2. `sortBy` phai parse qua `SortUtils`.
3. Search parser phai di qua `SearchQueryParser`.
4. FE phai co debounce + append khi load more.
5. Nut `Xem them` chi hien khi con trang.

---

## 8) Chat: REST + WebSocket STOMP (chat-service)

Muc tieu:
- REST lay lich su / tao hoi thoai; real-time gui/nhan bang WebSocket + STOMP (mau pho bien voi Spring Boot, tuong tu nhieu du an Hanh-Chinh / portal).

### 8.1 REST (qua API Gateway)

Tat ca request di qua gateway, Bearer JWT nhu cac API khac. `chat-service` doc `X-User-Id` (gateway inject sau khi xac thuc).

| Method | Path (sau prefix gateway) | Mo ta |
|--------|---------------------------|-------|
| GET | `/chat-service/api/v1/chat/conversations` | Danh sach hoi thoai cua user |
| POST | `/chat-service/api/v1/chat/conversations/direct` | Body `{ "otherUserId": "<sub doi phuong>" }` — lay hoac tao hoi thoai 1-1 |
| GET | `/chat-service/api/v1/chat/conversations/{id}/messages?page=1&limit=20` | Trang tin nhan |
| POST | `/chat-service/api/v1/chat/conversations/{id}/messages` | Body `{ "content": "...", "type": "TEXT" }` |

Frontend da co `chatApiService` (`Frontend/src/services/chat/chat-api.service.ts`) goi cac endpoint tren qua `axiosClient`.

### 8.2 WebSocket / STOMP

- Endpoint WebSocket (native, **khong** SockJS): broker URL = `ws` hoac `wss` tu `VITE_API_BASE_URL`, duong dan: `/chat-service/ws`.
- Vi trinh duyet khong gui duoc header `Authorization` khi bat tay WebSocket, gateway co filter `WebSocketAccessTokenQueryGatewayFilter`: truyen JWT bang query `access_token`, gateway se gan `Authorization: Bearer ...` truoc JWT resource server.
- Sau khi noi WebSocket, STOMP:
  - Subscribe: `/topic/conversations.{conversationId}.messages`
  - Gui tin: destination `/app/chat.send`, body JSON, header `content-type: application/json`:
    `{ "conversationId", "content", "type": "TEXT" }`
- Ban bat tay WebSocket phai di qua gateway de co `X-User-Id`; `chat-service` `UserIdHandshakeInterceptor` luu `sub` vao session STOMP.

Frontend:
- `buildChatStompBrokerUrl` trong `Frontend/src/constants/api.ts`
- `chatSocketService` + hook `useChatSocket` trong `Frontend/src/services/chat/chat-socket.service.ts`, `Frontend/src/hooks/useChatSocket.ts`

**Luu y:** `authTokenStore` khong lam React re-render; sau login can mount lai component dung hook hoac doi `key` de kich hoat ket noi moi.

---

Tai lieu nay uu tien tinh thuc dung cho UniCall. Neu architecture doi, cap nhat file nay truoc khi mo rong flow moi.
