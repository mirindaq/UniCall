package iuh.fit.friend_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.friend_service.dtos.response.FriendshipResponse;
import iuh.fit.friend_service.services.FriendRequestService;
import iuh.fit.friend_service.services.FriendService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/friends")
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class FriendController {
 FriendService friendService;
 FriendRequestService friendRequestService;

    @GetMapping("/idAccount/{idAccount}")
    public ResponseEntity<ResponseSuccess<?>> getFriendByIdAccount(
            @PathVariable String idAccount) {

        var response = friendService.getAllFriendByIdAccount(idAccount);
        return ResponseEntity
                        .ok(new ResponseSuccess<>(HttpStatus.OK, "Lấy danh sách bạn bè thành công", response));

    }

    @GetMapping("/check-relationship/idAccountOrigin/{idAccountOrigin}/idTarget/{idAccountTarget}")
    public ResponseEntity<ResponseSuccess<?>> checkFriendship(
            @PathVariable String idAccountOrigin,
            @PathVariable String idAccountTarget) {
        FriendshipResponse response = friendRequestService.getRelationshipStatus(idAccountOrigin, idAccountTarget);

        if (idAccountTarget.equals(idAccountOrigin)) {
            response.setYourself(true);
        }
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Kiểm tra quan hệ bạn bè", response));
    }

    @DeleteMapping("/{idFriend}")
    public ResponseEntity<ResponseSuccess<?>> deleteFriend(@PathVariable String idFriend) {
        friendService.deleteFriend(idFriend);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Xóa bạn thành công"));
    }
}
