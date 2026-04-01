package iuh.fit.friend_service.entities;


import iuh.fit.friend_service.enums.FriendRequestEnum;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.Length;

import java.lang.reflect.Type;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "friend_requests")
@Builder
public class FriendRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String idFriendRequest;
    @NotNull
    private String idAccountSent;
    @NotNull
    private String idAccountReceive;
    @Length(max = 120)
    private String pathAvartar = "";
    @NotNull
    @Size(max = 40)
    private String firstName;
    @NotNull
    @Size(max = 40)
    private String lastName;
    private String content = "";
    private LocalDateTime timeRequest;
    @Enumerated(EnumType.STRING)
    private FriendRequestEnum status;

    @PrePersist
    protected void onCreate() {
        this.timeRequest = LocalDateTime.now();
    }
}
