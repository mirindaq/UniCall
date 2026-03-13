package iuh.fit.user_service.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;

    private String email;

    private String phone;

    private LocalDate dob;

    private Boolean gender;

    private String avatar;

    private Boolean isActive;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;
}
