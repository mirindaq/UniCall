package iuh.fit.user_service.services.impl;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.user_service.entities.User;
import iuh.fit.user_service.repositories.UserRepository;
import iuh.fit.user_service.services.UserProfileService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Long createUserProfile(
            String identityUserId,
            String phoneNumber,
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

        User user = User.builder()
                .identityUserId(identityUserId)
                .phoneNumber(phoneNumber)
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
}
