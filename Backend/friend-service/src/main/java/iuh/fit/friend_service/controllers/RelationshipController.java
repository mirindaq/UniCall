package iuh.fit.friend_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.friend_service.dtos.request.RelationshipRequest;
import iuh.fit.friend_service.dtos.response.RelationshipResponse;
import iuh.fit.friend_service.services.RelationshipService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/relationships")
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class RelationshipController {
    RelationshipService relationshipService;

    @PostMapping
    public ResponseEntity<ResponseSuccess<?>> createRelationship(
            @Valid @RequestBody RelationshipRequest relationshipRequest) {
        relationshipService.createRelationship(relationshipRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ResponseSuccess<>(HttpStatus.CREATED, "TAO QUAN HE THANH CONG"));
    }

    @GetMapping("/{userId1}/{userId2}")
    public ResponseEntity<ResponseSuccess<?>> getRelationshipBetweenUsers(
            @PathVariable String userId1,
            @PathVariable String userId2) {
        RelationshipResponse relationshipResponse = relationshipService.getRelationshipBetweenUsers(userId1, userId2);
        return ResponseEntity
                .ok(new ResponseSuccess<>(HttpStatus.OK, "Lay quan he giua hai nguoi dung", relationshipResponse));
    }

    @GetMapping("/{type}")
    public ResponseEntity<ResponseSuccess<?>> getRelationshipsByType(@PathVariable String type) {
        List<RelationshipResponse> relationshipResponseList = relationshipService.getRelationships(type);
        return ResponseEntity
                .ok(new ResponseSuccess<>(HttpStatus.OK, "Lay danh sach quan he", relationshipResponseList));
    }

    @PutMapping
    public ResponseEntity<ResponseSuccess<?>> updateRelationship(
            @Valid @RequestBody RelationshipRequest relationshipRequest) {
        relationshipService.updateRelationship(relationshipRequest);
        return ResponseEntity.status(HttpStatus.OK)
                .body(new ResponseSuccess<>(HttpStatus.OK, "SUA QUAN HE THANH CONG"));
    }

    @DeleteMapping("/{relationshipId}")
    public ResponseEntity<ResponseSuccess<?>> deleteRelationship(@PathVariable String relationshipId) {
        relationshipService.deleteRelationship(relationshipId);
        return ResponseEntity.status(HttpStatus.OK)
                .body(new ResponseSuccess<>(HttpStatus.OK, "XOA QUAN HE THANH CONG"));
    }
}
