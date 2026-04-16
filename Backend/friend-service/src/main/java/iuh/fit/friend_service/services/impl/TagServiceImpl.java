package iuh.fit.friend_service.services.impl;

import iuh.fit.friend_service.dtos.request.TagRequest;
import iuh.fit.friend_service.dtos.response.TagResponse;
import iuh.fit.friend_service.mapper.TagMapper;
import iuh.fit.friend_service.services.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {
    TagMapper tagMapper;

    @Override
    public void createTag(TagRequest tagRequest) {

    }

    @Override
    public List<TagResponse> getTags(String type) {
        return List.of();
    }

    @Override
    public void updateTag(TagRequest tagRequest) {

    }

    @Override
    public void deleteTag(String tagId) {

    }
}
