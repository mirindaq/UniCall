package iuh.fit.friend_service.controllers;

import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.common_service.model.ResponseMessage;
import iuh.fit.friend_service.dtos.response.FriendshipResponse;
import iuh.fit.friend_service.services.FriendRequestService;
import iuh.fit.friend_service.services.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/friends")
public class FriendController {
    @Autowired
    private FriendService friendService;
    @Autowired
    private FriendRequestService friendRequestService;

    @GetMapping("/idAccount/{idAccount}")
    public ResponseEntity<ResponseMessage> getFriendByIdAccount(
            @PathVariable String idAccount) {

        var response = friendService.getAllFriendByIdAccount(idAccount);
        return response.isEmpty()
                ? ResponseEntity.status(HttpStatus.NO_CONTENT)
                        .body(new ResponseMessage(204, "Danh sách trống.", null, HttpStatus.NO_CONTENT))
                : ResponseEntity
                        .ok(new ResponseMessage(200, "Lấy danh sách bạn bè thành công", HttpStatus.OK, response));

    }

    @GetMapping("/check-relationship/idAccountOrigin/{idAccountOrigin}/idTarget/{idAccountTarget}")
    public ResponseEntity<ResponseMessage> checkFriendship(
            @PathVariable String idAccountOrigin,
            @PathVariable String idAccountTarget) {
        FriendshipResponse response = friendRequestService.getRelationshipStatus(idAccountOrigin, idAccountTarget);
        // Set yourself flag
        if (idAccountTarget.equals(idAccountOrigin)) {
            response.setYourself(true);
        }
        return ResponseEntity.ok(new ResponseMessage(200, "Kiểm tra quan hệ bạn bè", HttpStatus.OK, response));
    }

    @DeleteMapping("/{idFriend}")
    public ResponseEntity<ResponseMessage> deleteFriend(@PathVariable String idFriend) {
        try {
            friendService.deleteFriend(idFriend);
            return ResponseEntity.ok(new ResponseMessage(200, "Xóa bạn thành công", HttpStatus.OK, null));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ResponseMessage(404, e.getMessage(), HttpStatus.NOT_FOUND, null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ResponseMessage(500, "Xóa bạn thất bại", HttpStatus.INTERNAL_SERVER_ERROR, null));
        }
    }
}
