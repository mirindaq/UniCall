package iuh.fit.friend_service.services.impl;

import iuh.fit.friend_service.dtos.request.TagRequest;
import iuh.fit.friend_service.dtos.response.TagResponse;
import iuh.fit.friend_service.entities.Tag;
import iuh.fit.friend_service.mapper.TagMapper;
import iuh.fit.friend_service.repositories.TagRepository;
import iuh.fit.friend_service.services.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {
    private final TagRepository tagRepository;
    private final TagMapper tagMapper;

    @Override
    public void createTag(TagRequest tagRequest) {
        Tag tag = tagMapper.toTag(tagRequest);
        tagRepository.save(tag);
    }

    @Override
    public List<TagResponse> getTags(String type) {
        List<Tag> tags = tagRepository.findAll(
                (root, query, cb) -> cb.equal(cb.upper(root.get("tagType")), type.toUpperCase())
        );
        return tags.stream().map(tagMapper::toTagResponse).toList();
    }

    @Override
    public TagResponse tagByUser(String userId) {
        return tagMapper.toTagResponse(tagRepository.findByTaggedId(userId));
    }

    @Override
    public void updateTag(TagRequest tagRequest) {
        // Update by composite (taggerId, taggedId, tagType). If not found, create new.
        Optional<Tag> existing = tagRepository.findOne(
                (root, query, cb) -> cb.and(
                        cb.equal(root.get("taggerId"), tagRequest.getTaggerId()),
                        cb.equal(root.get("taggedId"), tagRequest.getTaggedId()),
                        cb.equal(root.get("tagType"), tagRequest.getTagType())
                )
        );

        Tag tag = existing.orElseGet(() -> tagMapper.toTag(tagRequest));
        // No mutable fields besides these, but keep assignment explicit for safety.
        tag.setTaggerId(tagRequest.getTaggerId());
        tag.setTaggedId(tagRequest.getTaggedId());
        tag.setTagType(tagRequest.getTagType());

        tagRepository.save(tag);
    }

    @Override
    public void deleteTag(String tagId) {
        if (!tagRepository.existsById(tagId)) {
            return;
        }
        tagRepository.deleteById(tagId);
    }
}
