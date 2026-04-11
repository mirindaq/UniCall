package iuh.fit.user_service.services.impl;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.common_service.specification.SearchQueryParser;
import iuh.fit.common_service.specification.SpecificationBuildQuery;
import iuh.fit.common_service.utils.SortUtils;
import iuh.fit.user_service.clients.GrpcFileServiceClient;
import iuh.fit.user_service.clients.IdentityAuthClient;
import iuh.fit.user_service.dtos.response.AccountDeletionStatusResponse;
import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.repositories.UserRepository;
import iuh.fit.user_service.services.UserProfileService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {
    private static final long ACCOUNT_DELETION_GRACE_DAYS = 30L;

    private final UserRepository userRepository;
    private final GrpcFileServiceClient grpcFileServiceClient;
    private final IdentityAuthClient identityAuthClient;

    @Override
    @Transactional
    public Long createUserProfile(
            String identityUserId,
            String phoneNumber,
            String email,
            String firstName,
            String lastName,
            String gender,
            LocalDate dateOfBirth
    ) {
        if (userRepository.existsByIdentityUserId(identityUserId)) {
            throw new ConflictException("Identity user already exists");
        }
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new ConflictException("Phone number already exists");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email already exists");
        }

        User user = User.builder()
                .identityUserId(identityUserId)
                .phoneNumber(phoneNumber)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .gender(gender)
                .dateOfBirth(dateOfBirth)
                .isActive(true)
                .build();
        return userRepository.save(user).getId();
    }

    @Override
    @Transactional
    public boolean deleteUserProfileByIdentityUserId(String identityUserId) {
        if (!userRepository.existsByIdentityUserId(identityUserId)) {
            return false;
        }
        userRepository.deleteByIdentityUserId(identityUserId);
        return true;
    }

    @Override
    public User getUserProfileByIdentityUserId(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("identityUserId is required");
        }

        return userRepository.findByIdentityUserId(identityUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User profile not found"));
    }

    @Override
    public User getAuthenticatedUserProfile(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new UnauthenticatedException("Missing authenticated user header");
        }

        return getUserProfileByIdentityUserId(identityUserId);
    }

    @Override
    @Transactional
    public AccountDeletionStatusResponse requestAccountDeletion(
            String identityUserId,
            String phoneNumber,
            String reason,
            String password
    ) {
        User user = getAuthenticatedUserProfile(identityUserId);

        if (!user.getPhoneNumber().equals(phoneNumber.trim())) {
            throw new InvalidParamException("Phone number does not match authenticated account");
        }
        if (reason == null || reason.isBlank()) {
            throw new InvalidParamException("reason is required");
        }
        if (password == null || password.isBlank()) {
            throw new InvalidParamException("password is required");
        }
        identityAuthClient.verifyPassword(identityUserId, user.getPhoneNumber(), password.trim());

        user.setDeletionPending(true);
        user.setDeletionRequestedAt(LocalDateTime.now());
        user.setDeletionReason(reason.trim());
        user.setIsActive(false);
        User updatedUser = userRepository.save(user);

        return AccountDeletionStatusResponse.from(updatedUser, ACCOUNT_DELETION_GRACE_DAYS);
    }

    @Override
    public AccountDeletionStatusResponse getAccountDeletionStatus(String identityUserId) {
        User user = getAuthenticatedUserProfile(identityUserId);
        return AccountDeletionStatusResponse.from(user, ACCOUNT_DELETION_GRACE_DAYS);
    }

    @Override
    @Transactional
    public AccountDeletionStatusResponse cancelAccountDeletionRequest(String identityUserId) {
        User user = getAuthenticatedUserProfile(identityUserId);
        user.setDeletionPending(false);
        user.setDeletionRequestedAt(null);
        user.setDeletionReason(null);
        user.setIsActive(true);
        User updatedUser = userRepository.save(user);
        return AccountDeletionStatusResponse.from(updatedUser, ACCOUNT_DELETION_GRACE_DAYS);
    }

    @Override
    @Transactional
    public long purgeExpiredDeletionRequests(long graceDays) {
        long safeGraceDays = Math.max(graceDays, 1L);
        LocalDateTime deadline = LocalDateTime.now().minusDays(safeGraceDays);
        List<User> expiredUsers = userRepository.findAllByDeletionPendingIsTrueAndDeletionRequestedAtLessThanEqual(deadline);
        if (expiredUsers.isEmpty()) {
            return 0;
        }
        userRepository.deleteAllInBatch(expiredUsers);
        return expiredUsers.size();
    }

    @Override
    @Transactional
    public User updateAuthenticatedUserProfile(
            String identityUserId,
            String firstName,
            String lastName,
            String gender,
            LocalDate dateOfBirth
    ) {
        User user = getAuthenticatedUserProfile(identityUserId);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setGender(gender);
        user.setDateOfBirth(dateOfBirth);
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateAuthenticatedUserAvatar(String identityUserId, MultipartFile avatarFile) {
        User user = getAuthenticatedUserProfile(identityUserId);
        String avatarUrl = grpcFileServiceClient.uploadAvatar(identityUserId, avatarFile);
        user.setAvatar(avatarUrl);
        return userRepository.save(user);
    }

    @Override
    public Page<User> searchUsers(
            int page,
            int limit,
            String sortBy,
            String search,
            String keyword
    ) {
        if ((keyword == null || keyword.isBlank()) && (search == null || search.isBlank())) {
            throw new InvalidParamException("keyword or search is required");
        }

        String mergedSearch = mergeSearchWithKeyword(search, keyword);
        SpecificationBuildQuery<User> buildQuery = SearchQueryParser.parse(mergedSearch);
        buildQuery.withCustom((root, query, cb) -> cb.isTrue(root.get("isActive")));
        if (keyword != null && !keyword.isBlank()) {
            String normalizedKeyword = keyword.trim().toLowerCase();
            String likePattern = "%" + normalizedKeyword + "%";
            buildQuery.withCustom((root, query, cb) -> cb.or(
                    cb.isTrue(root.get("allowPhoneSearch")),
                    cb.like(cb.lower(root.get("firstName")), likePattern),
                    cb.like(cb.lower(root.get("lastName")), likePattern),
                    cb.like(cb.lower(root.get("email")), likePattern)
            ));
        }

        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(1, Math.min(limit, 30));
        Pageable pageable = PageRequest.of(safePage - 1, safeLimit, SortUtils.parseSort(sortBy));
        Specification<User> specification = buildQuery.build();
        return userRepository.findAll(specification, pageable);
    }

    private String mergeSearchWithKeyword(String search, String keyword) {
        String normalizedSearch = search == null ? "" : search.trim();
        String normalizedKeyword = keyword == null ? "" : keyword.trim();

        if (normalizedKeyword.isBlank()) {
            return normalizedSearch;
        }

        String keywordSearch = "phoneNumber~" + normalizedKeyword
                + "'email~" + normalizedKeyword
                + "'firstName~" + normalizedKeyword
                + "'lastName~" + normalizedKeyword;

        if (normalizedSearch.isBlank()) {
            return keywordSearch;
        }

        return normalizedSearch + "," + keywordSearch;
    }
}
