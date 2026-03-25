package iuh.fit.friend_service.services.impl;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.friend_service.dtos.request.FriendRequestCreateRequest;
import iuh.fit.friend_service.dtos.request.FriendRequestUpdateStatusRequest;
import iuh.fit.friend_service.dtos.response.FriendRequestResponse;
import iuh.fit.friend_service.dtos.response.FriendshipResponse;
import iuh.fit.friend_service.entities.FriendRequest;
import iuh.fit.friend_service.enums.FriendRequestEnum;
import iuh.fit.friend_service.mapper.FriendRequestMapper;
import iuh.fit.friend_service.repositories.FriendRequestRepository;
import iuh.fit.friend_service.services.FriendRequestService;
import iuh.fit.friend_service.services.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FriendRequestServiceImpl implements FriendRequestService {
    @Autowired
    private FriendRequestRepository friendRequestRepository;
    @Autowired
    private FriendRequestMapper friendRequestMapper;
    @Autowired
    private FriendService friendService;

    @Override
    public String createFriendRequest(FriendRequestCreateRequest friendRequestCreateRequest) {
        FriendRequest friendRequest = friendRequestMapper.toFriendRequest(friendRequestCreateRequest);
        friendRequest.setStatus(FriendRequestEnum.SENT);
        FriendRequest friendRequestCreated = friendRequestRepository.save(friendRequest);
        return friendRequestCreated.getIdFriendRequest();
    }

    @Override
    @Transactional
    public void updateFriendRequest(FriendRequestUpdateStatusRequest friendRequestUpdateStatusRequest,
            String idFriendRequest) {
        FriendRequest friendRequest = friendRequestRepository.findById(idFriendRequest).orElseThrow(
                () -> new ResourceNotFoundException("Khong co friend request voi id: " + idFriendRequest));
        FriendRequestEnum status = FriendRequestEnum.valueOf(friendRequestUpdateStatusRequest.getStatus());
        if (friendRequest.getStatus().equals(FriendRequestEnum.ACCEPTED)
                && !status.equals(FriendRequestEnum.ACCEPTED)) {
            throw new InvalidParamException("Khong the cap nhat trang thai khi status ban dau cua friend request id: "
                    + idFriendRequest + " da la ACCEPTED");
        }
        if (!friendRequest.getStatus().equals(FriendRequestEnum.ACCEPTED)
                && status.equals(FriendRequestEnum.ACCEPTED)) {
            friendService.createFriendService(friendRequest);

            // kafka
        }
        friendRequest.setStatus(status);
        friendRequestRepository.save(friendRequest);
    }

    @Override
    public PageResponse<FriendRequestResponse> getAllFriendRequestsByIdAccount(String idAccount,
            int page, int size, String sortDirection) {
        // Validate sortDirection
        if (!sortDirection.equalsIgnoreCase("asc") && !sortDirection.equalsIgnoreCase("desc")) {
            throw new InvalidParamException("sortDirection phải là 'asc' hoặc 'desc'");
        }

        Sort sort = "asc".equalsIgnoreCase(sortDirection)
                ? Sort.by("timeRequest").ascending()
                : Sort.by("timeRequest").descending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<FriendRequest> spec = (root, query, cb) -> {
            var accountPredicate = cb.or(
                    cb.equal(root.get("idAccountSent"), idAccount),
                    cb.equal(root.get("idAccountReceive"), idAccount));
            var statusPredicate = cb.equal(root.get("status"), FriendRequestEnum.SENT);

            return cb.and(accountPredicate, statusPredicate);
        };

        Page<FriendRequest> friendRequestPage = friendRequestRepository.findAll(spec, pageable);

        return PageResponse.fromPage(friendRequestPage, friendRequestMapper::toFriendRequestResponse);
    }

    @Override
    public FriendshipResponse getRelationshipStatus(String idAccountSent, String idAccountTarget) {
        FriendshipResponse response = new FriendshipResponse();

        if (friendService.areFriends(idAccountSent, idAccountTarget)) {
            response.setAreFriends(true);
            return response;
        }

        Specification<FriendRequest> spec = (root, query, cb) -> cb.or(
                cb.and(
                        cb.equal(root.get("idAccountSent"), idAccountSent),
                        cb.equal(root.get("idAccountReceive"), idAccountTarget)),
                cb.and(
                        cb.equal(root.get("idAccountSent"), idAccountTarget),
                        cb.equal(root.get("idAccountReceive"), idAccountSent)),
                cb.and(
                        cb.equal(root.get("status"), FriendRequestEnum.SENT)));

        FriendRequest friendRequest = friendRequestRepository.findOne(spec).orElse(null);

        if (friendRequest == null) {
            response.setAreFriends(false);
            return response;
        }

        response.setAreFriends(false);
        response.setIdRequest(friendRequest.getIdFriendRequest());
        response.setNote(friendRequest.getContent());
        response.setMeSent(friendRequest.getIdAccountSent().equals(idAccountSent));
        response.setYourself(false);

        return response;
    }
}
