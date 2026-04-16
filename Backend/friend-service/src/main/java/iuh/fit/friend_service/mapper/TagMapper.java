package iuh.fit.friend_service.mapper;

import iuh.fit.friend_service.dtos.request.TagRequest;
import iuh.fit.friend_service.dtos.response.TagResponse;
import iuh.fit.friend_service.entities.Tag;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TagMapper {
    Tag toTag(TagRequest tagRequest);
    TagResponse toTagResponse(Tag tag);
}
