package iuh.fit.task_service.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "task_groups")
public class TaskGroup {
    @Id
    private String id;

    private String name;
    private String description;

    @Indexed
    private String ownerId;

    @Builder.Default
    private Set<String> memberIds = new LinkedHashSet<>();

    @Builder.Default
    private List<TaskColumn> columns = new ArrayList<>();

    private Instant createdAt;
    private Instant updatedAt;
}
