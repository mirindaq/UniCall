package iuh.fit.friend_service.services.impl;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.friend_service.dtos.response.FriendResponse;
import iuh.fit.friend_service.entities.Friend;
import iuh.fit.friend_service.entities.FriendRequest;
import iuh.fit.friend_service.mapper.FriendMapper;
import iuh.fit.friend_service.repositories.FriendRepository;
import iuh.fit.friend_service.services.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FriendServiceImpl implements FriendService {
    @Autowired
    private FriendRepository friendRepository;
    @Autowired
    private FriendMapper friendMapper;

    @Override
    public void createFriendService(FriendRequest friendRequest) {
        Friend friend = friendMapper.toFriend(friendRequest);
        friend.setFriendRequest(friendRequest);
        friendRepository.save(friend);
    }

    @Override
    public List<FriendResponse> getAllFriendByIdAccount(String idAccount) {
        Sort sort = Sort.by("firstName").ascending()
                .and(Sort.by("lastName").ascending());

        Specification<Friend> spec = (root, query, cb) -> cb.or(
                cb.equal(root.get("idAccountSent"), idAccount),
                cb.equal(root.get("idAccountReceive"), idAccount));

        List<Friend> friends = friendRepository.findAll(spec, sort);
        return friends.stream()
                .map(friendMapper::toFriendResponse)
                .collect(Collectors.toList());
    }

    @Override
    public boolean areFriends(String idAccountSource, String idAccountTarget) {
        Specification<Friend> spec = (root, query, cb) -> {
            var bothDirections = cb.or(
                    cb.and(
                            cb.equal(root.get("idAccountSent"), idAccountSource),
                            cb.equal(root.get("idAccountReceive"), idAccountTarget)),
                    cb.and(
                            cb.equal(root.get("idAccountSent"), idAccountTarget),
                            cb.equal(root.get("idAccountReceive"), idAccountSource)));
            return bothDirections;
        };

        return friendRepository.count(spec) > 0;
    }

    @Override
    public void deleteFriend(String idFriend) {
        if (!friendRepository.existsById(idFriend)) {
            throw new ResourceNotFoundException("Không có friend với id: " + idFriend);
        }

        try {
            // Tạo event và gửi Kafka

            // Xoá bản ghi trong database
            friendRepository.deleteById(idFriend);
        } catch (Exception e) {
            throw new RuntimeException("Xóa bạn bè thất bại, vui lòng thử lại!");
        }
    }
}
