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

---

Tai lieu nay uu tien tinh thuc dung cho UniCall. Neu architecture doi, cap nhat file nay truoc khi mo rong flow moi.
