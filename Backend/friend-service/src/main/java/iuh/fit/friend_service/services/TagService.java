package iuh.fit.friend_service.services;

import iuh.fit.friend_service.dtos.request.TagRequest;
import iuh.fit.friend_service.dtos.response.TagResponse;
import iuh.fit.friend_service.entities.Tag;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface TagService {
    void createTag(TagRequest tagRequest);
    List<TagResponse> getTags(String type);
    // chua ro co nen de getUsersByTag o day hay o UserService
    TagResponse tagByUser(String userId);
    void updateTag(TagRequest tagRequest);
    void deleteTag(String tagId);
}
