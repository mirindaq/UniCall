package iuh.fit.common_service.specification;

import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class SpecificationBuildQuery<T> {
    public final List<SpecSearchCriteria> params;
    private final List<Specification<T>> customSpecs;
    public SpecificationBuildQuery(){
        this.params = new ArrayList<>();
        this.customSpecs = new ArrayList<>();
    }

    public void with(String orPredicate, String key, String operation, String value) {
        params.add(new SpecSearchCriteria(orPredicate, key, operation, value));
    }

    public void withCustom(Specification<T> spec) {
        if (spec != null) {
            customSpecs.add(spec);
        }
    }

    public Specification<T> build(){
        Specification<T> result = null;

        // Build từ params nếu có
        if (!params.isEmpty()) {
            result = new EntitySpecification<T>(params.getFirst());
            for (int i = 1; i < params.size(); i++) {
                result = params.get(i).getOrPredicate()
                        ? Specification.where(result).or(new EntitySpecification<T>(params.get(i)))
                        : Specification.where(result).and(new EntitySpecification<T>(params.get(i)));
            }
        }

        // Thêm customSpecs vào result
        for (Specification<T> spec : customSpecs) {
            if (result == null) {
                result = spec;
            } else {
                result = result.and(spec);
            }
        }

        return result;
    }
}
