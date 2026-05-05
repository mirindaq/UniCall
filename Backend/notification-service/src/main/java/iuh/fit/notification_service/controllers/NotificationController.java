package iuh.fit.notification_service.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.notification_service.dtos.response.NotificationResponse;
import iuh.fit.notification_service.services.NotificationService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("${api.prefix:/api/v1}/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private static final String USER_ID_HEADER = "X-User-Id";

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ResponseSuccess<PageResponse<NotificationResponse>>> listMyNotifications(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(new ResponseSuccess<>(
                HttpStatus.OK,
                "Get notifications success",
                notificationService.listMyNotifications(currentIdentityUserId, page, limit)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ResponseSuccess<Long>> countUnread(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId) {
        return ResponseEntity.ok(new ResponseSuccess<>(
                HttpStatus.OK,
                "Get unread count success",
                notificationService.countMyUnread(currentIdentityUserId)));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<ResponseSuccess<Void>> markAsRead(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId,
            @PathVariable Long notificationId) {
        notificationService.markAsRead(currentIdentityUserId, notificationId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Mark notification as read success"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ResponseSuccess<Void>> markAllAsRead(
            @RequestHeader(value = USER_ID_HEADER, required = false) String currentIdentityUserId) {
        notificationService.markAllAsRead(currentIdentityUserId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Mark all notifications as read success"));
    }
}
