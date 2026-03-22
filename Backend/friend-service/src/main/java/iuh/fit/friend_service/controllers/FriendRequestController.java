package iuh.fit.friend_service.controllers;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.model.ResponseMessage;
import iuh.fit.friend_service.dtos.request.FriendRequestCreateRequest;
import iuh.fit.friend_service.dtos.request.FriendRequestUpdateStatusRequest;
import iuh.fit.friend_service.dtos.response.FriendRequestResponse;
import iuh.fit.friend_service.dtos.response.FriendRequestStatusResponse;
import iuh.fit.friend_service.services.FriendRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/friend-requestes")
public class FriendRequestController {
    @Autowired
    private FriendRequestService friendRequestService;


    @PostMapping
    public ResponseEntity<ResponseMessage> createFriendRequest(@Valid @RequestBody FriendRequestCreateRequest friendRequestCreateRequest) {
        System.out.println("FriendRequestCreateReequst: " + friendRequestCreateRequest.toString());
        String idFriendRequested = friendRequestService.createFriendRequest(friendRequestCreateRequest);
        // kafka

        System.out.println("result create friend request: " + idFriendRequested);
        return new ResponseEntity<>(new ResponseMessage(200, "Đã gửi lời mờ kết bạn", HttpStatus.OK, null), HttpStatus.OK);
    }

    @PutMapping("{idFriendReceivedRequest}/status")
    public ResponseEntity<ResponseMessage> updateFriendRequest(@Valid @RequestBody FriendRequestUpdateStatusRequest friendRequestUpdateStatusRequest, @PathVariable String idFriendReceivedRequest) {
        friendRequestService.updateFriendRequest(friendRequestUpdateStatusRequest, idFriendReceivedRequest);

        return new ResponseEntity<>(new ResponseMessage(200, "Update status friend request thanh cong", HttpStatus.OK, null), HttpStatus.OK);
    }

    @GetMapping("/all/{idAccount}")
    public ResponseEntity<ResponseMessage> getAllFriendRequestsByIdAccount(
            @PathVariable String idAccount,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "desc") String sortDirection
            ) {
        PageResponse<FriendRequestResponse> responses = friendRequestService.getAllFriendRequestsByIdAccount(
                idAccount, page, size, sortDirection);
        // Chỉ chấp nhận "asc" hoặc "desc" cho sortDirection
        if (!sortDirection.equalsIgnoreCase("asc") && !sortDirection.equalsIgnoreCase("desc")) {
            return ResponseEntity.badRequest().body(new ResponseMessage(400, "sortDirection phải là 'asc' hoặc 'desc'", null, HttpStatus.BAD_REQUEST));
        }

        return responses.getTotalItem() == 0 ?
                ResponseEntity.status(HttpStatus.NO_CONTENT).body(new ResponseMessage(204, "Không có danh sách lời mời kết bạn nào phù hợp", null, HttpStatus.NO_CONTENT))
                :
                ResponseEntity.status(HttpStatus.OK).body(new ResponseMessage(200, "Lay danh sach loi moi ket ban thanh cong", HttpStatus.OK, responses));
    }



}
