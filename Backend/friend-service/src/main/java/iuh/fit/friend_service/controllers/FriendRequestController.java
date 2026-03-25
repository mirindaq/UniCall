package iuh.fit.friend_service.controllers;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.common_service.dtos.response.base.ResponseError;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.friend_service.dtos.request.FriendRequestCreateRequest;
import iuh.fit.friend_service.dtos.request.FriendRequestUpdateStatusRequest;
import iuh.fit.friend_service.dtos.response.FriendRequestResponse;
import iuh.fit.friend_service.services.FriendRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;

@RestController
@RequestMapping("/api/v1/friend-requestes")
@RequiredArgsConstructor
public class FriendRequestController {
    private FriendRequestService friendRequestService;

    @PostMapping
    public ResponseEntity<?> createFriendRequest(
            @Valid @RequestBody FriendRequestCreateRequest friendRequestCreateRequest) {
        try {
            System.out.println("FriendRequestCreateReequst: " + friendRequestCreateRequest.toString());
            String idFriendRequested = friendRequestService.createFriendRequest(friendRequestCreateRequest);
            System.out.println("result create friend request: " + idFriendRequested);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ResponseSuccess<>(HttpStatus.CREATED, "Đã gửi lời mời kết bạn"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseError.builder()
                            .timestamp(new Date())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .error("FRIEND_REQUEST_CREATION_ERROR")
                            .message("Tạo lời mời kết bạn thất bại")
                            .build());
        }
    }

    @PutMapping("{idFriendReceivedRequest}/status")
    public ResponseEntity<?> updateFriendRequest(
            @Valid @RequestBody FriendRequestUpdateStatusRequest friendRequestUpdateStatusRequest,
            @PathVariable String idFriendReceivedRequest) {
        try {
            friendRequestService.updateFriendRequest(friendRequestUpdateStatusRequest, idFriendReceivedRequest);
            return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Cập nhật trạng thái lời mời thành công"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ResponseError.builder()
                            .timestamp(new Date())
                            .status(HttpStatus.NOT_FOUND.value())
                            .error("NOT_FOUND")
                            .message(e.getMessage())
                            .build());
        } catch (InvalidParamException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseError.builder()
                            .timestamp(new Date())
                            .status(HttpStatus.BAD_REQUEST.value())
                            .error("INVALID_PARAMETER")
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseError.builder()
                            .timestamp(new Date())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .error("FRIEND_REQUEST_UPDATE_ERROR")
                            .message("Cập nhật trạng thái lời mời thất bại")
                            .build());
        }
    }

    @GetMapping("/all/{idAccount}")
    public ResponseEntity<?> getAllFriendRequestsByIdAccount(
            @PathVariable String idAccount,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "desc") String sortDirection) {
        try {
            PageResponse<FriendRequestResponse> responses = friendRequestService.getAllFriendRequestsByIdAccount(
                    idAccount, page, size, sortDirection);
            return responses.getTotalItem() == 0
                    ? ResponseEntity.status(HttpStatus.NO_CONTENT)
                            .body(new ResponseSuccess<>(HttpStatus.NO_CONTENT,
                                    "Không có danh sách lời mời kết bạn nào phù hợp"))
                    : ResponseEntity.status(HttpStatus.OK)
                            .body(new ResponseSuccess<>(HttpStatus.OK, "Lấy danh sách lời mời kết bạn thành công",
                                    responses));
        } catch (InvalidParamException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ResponseError.builder()
                            .timestamp(new Date())
                            .status(HttpStatus.BAD_REQUEST.value())
                            .error("INVALID_PARAMETER")
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ResponseError.builder()
                            .timestamp(new Date())
                            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                            .error("FRIEND_REQUEST_RETRIEVAL_ERROR")
                            .message("Lấy danh sách lời mời thất bại")
                            .build());
        }
    }

}
