package iuh.fit.friend_service.entities;

import iuh.fit.friend_service.enums.FriendRequestEnum;
import iuh.fit.friend_service.enums.FriendTypeEnum;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "friends")
@Builder
public class Friend {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String idFriend;
    @NotNull
    private String idAccountSent;
    private String pathAvartar = "";
    @NotNull
    @Size(max = 40)
    private String firstName;
    @NotNull
    @Size(max = 40)
    private String lastName;
    @NotNull
    private String idAccountReceive;
    @Enumerated(EnumType.STRING)
    private FriendTypeEnum friendType = FriendTypeEnum.NORMAL_FRIEND;
    private LocalDateTime timeCreate;

    @JoinColumn(name = "idFriendRequest")
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    private FriendRequest friendRequest;

    @PrePersist
    protected void onCreate() {
        this.timeCreate = LocalDateTime.now();
    }
}