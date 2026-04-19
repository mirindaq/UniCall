package iuh.fit.friend_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.friend_service.dtos.request.TagRequest;
import iuh.fit.friend_service.dtos.response.TagResponse;
import iuh.fit.friend_service.services.TagService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tags")
@RequiredArgsConstructor
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class TagController {
    TagService tagService;
    @PostMapping("/")
    public ResponseEntity<ResponseSuccess<?>> createTag(@Valid @RequestBody TagRequest tagRequest){
        tagService.createTag(tagRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ResponseSuccess<>(HttpStatus.CREATED, "DANH TAG THANH CONG"));
    }
    @GetMapping("/user/{userId}")
    public ResponseEntity<ResponseSuccess<?>> getTagsByUserId(@PathVariable String userId){
        TagResponse tag = tagService.tagByUser(userId);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lay tag theo userId", tag));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<ResponseSuccess<?>> getTagsByType(@PathVariable String type){
        List<TagResponse> tagResponseList = tagService.getTags(type);
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Lay danh sach tag", tagResponseList));
    }

    @PutMapping
    public ResponseEntity<ResponseSuccess<?>> changeTag(@Valid @RequestBody TagRequest tagRequest){
        tagService.updateTag(tagRequest);
        return ResponseEntity.status(HttpStatus.OK)
                .body(new ResponseSuccess<>(HttpStatus.OK, "SUA TAG THANH CONG"));
    }
    @DeleteMapping("/{tagId}")
    public ResponseEntity<ResponseSuccess<?>> unTag(@PathVariable String tagId){
        tagService.deleteTag(tagId);
        return ResponseEntity.status(HttpStatus.OK)
                .body(new ResponseSuccess<>(HttpStatus.OK, "XOA TAG THANH CONG"));
    }
}
