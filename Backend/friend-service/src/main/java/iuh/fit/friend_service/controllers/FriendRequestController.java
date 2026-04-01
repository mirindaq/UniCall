package iuh.fit.friend_service.controllers;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.friend_service.dtos.request.FriendRequestCreateRequest;
import iuh.fit.friend_service.dtos.request.FriendRequestUpdateStatusRequest;
import iuh.fit.friend_service.dtos.response.FriendRequestResponse;
import iuh.fit.friend_service.services.FriendRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/friend-requestes")
@RequiredArgsConstructor
public class FriendRequestController {
        private final FriendRequestService friendRequestService;

        @PostMapping
        public ResponseEntity<ResponseSuccess<?>> createFriendRequest(
                        @Valid @RequestBody FriendRequestCreateRequest friendRequestCreateRequest) {
                friendRequestService.createFriendRequest(friendRequestCreateRequest);
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(new ResponseSuccess<>(HttpStatus.CREATED, "Đã gửi lời mời kết bạn"));
        }

        @PutMapping("{idFriendReceivedRequest}/status")
        public ResponseEntity<ResponseSuccess<?>> updateFriendRequest(
                        @Valid @RequestBody FriendRequestUpdateStatusRequest friendRequestUpdateStatusRequest,
                        @PathVariable String idFriendReceivedRequest) {
                friendRequestService.updateFriendRequest(friendRequestUpdateStatusRequest, idFriendReceivedRequest);
                return ResponseEntity
                                .ok(new ResponseSuccess<>(HttpStatus.OK, "Cập nhật trạng thái lời mời thành công"));
        }

        @GetMapping("/all/{idAccount}")
        public ResponseEntity<ResponseSuccess<?>> getAllFriendRequestsByIdAccount(
                        @PathVariable String idAccount,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(defaultValue = "desc") String sortDirection) {
                return ResponseEntity.status(HttpStatus.OK)
                        .body(new ResponseSuccess<>(HttpStatus.OK,
                                "Lấy danh sách lời mời kết bạn thành công",
                                friendRequestService.getAllFriendRequestsByIdAccount(
                                        idAccount, page, size, sortDirection)));
        }

}
