package iuh.fit.common_service.dtos.response.base;

import lombok.*;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> items;
    private int page;
    private int totalPage;
    private int limit;
    private long totalItem;

    public static <E, R> PageResponse<R> fromPage(
            Page<E> page,
            Function<E, R> mapper
    ) {
        return PageResponse.<R>builder()
                .items(page.getContent().stream().map(mapper).toList())
                .page(page.getNumber() + 1)
                .totalPage(page.getTotalPages())
                .limit(page.getSize())
                .totalItem(page.getTotalElements())
                .build();
    }
}
