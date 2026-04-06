package iuh.fit.friend_service.services.impl;

import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.common_service.specification.SpecificationBuildQuery;
import iuh.fit.friend_service.dtos.response.FriendResponse;
import iuh.fit.friend_service.entities.Friend;
import iuh.fit.friend_service.entities.FriendRequest;
import iuh.fit.friend_service.mapper.FriendMapper;
import iuh.fit.friend_service.repositories.FriendRepository;
import iuh.fit.friend_service.services.FriendService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendServiceImpl implements FriendService {
    private final FriendRepository friendRepository;
    private final FriendMapper friendMapper;

    @Override
    public void createFriendService(FriendRequest friendRequest) {
        Friend friend = friendMapper.toFriend(friendRequest);
        friend.setFriendRequest(friendRequest);
        friendRepository.save(friend);
    }

    @Override
    public List<FriendResponse> getAllFriendByIdAccount(String idAccount) {
        Sort sort = Sort.by("firstNameSender").ascending()
                .and(Sort.by("lastNameSender").ascending());

        SpecificationBuildQuery<Friend> specBuilder = new SpecificationBuildQuery<>();
        specBuilder.withCustom((root, query, cb) -> cb.or(
                cb.equal(root.get("idAccountSent"), idAccount),
                cb.equal(root.get("idAccountReceive"), idAccount)));

        Specification<Friend> spec = specBuilder.build();
        List<Friend> friends = friendRepository.findAll(spec, sort);
        return friends.stream()
                .map(friendMapper::toFriendResponse)
                .collect(Collectors.toList());
    }

    @Override
    public boolean areFriends(String idAccountSource, String idAccountTarget) {
        SpecificationBuildQuery<Friend> specBuilder = new SpecificationBuildQuery<>();
        specBuilder.withCustom((root, query, cb) -> cb.or(
                cb.and(
                        cb.equal(root.get("idAccountSent"), idAccountSource),
                        cb.equal(root.get("idAccountReceive"), idAccountTarget)),
                cb.and(
                        cb.equal(root.get("idAccountSent"), idAccountTarget),
                        cb.equal(root.get("idAccountReceive"), idAccountSource))));

        Specification<Friend> spec = specBuilder.build();
        return friendRepository.count(spec) > 0;
    }

    @Override
    public void deleteFriend(String idFriend) {
        if (!friendRepository.existsById(idFriend)) {
            throw new ResourceNotFoundException("Không có friend với id: " + idFriend);
        }

        friendRepository.deleteById(idFriend);
    }
}
