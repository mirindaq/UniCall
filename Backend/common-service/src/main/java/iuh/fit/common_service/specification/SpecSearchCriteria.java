package iuh.fit.common_service.specification;

import lombok.Getter;
import lombok.Setter;

import static iuh.fit.common_service.constants.QueryConstants.SEARCH_OR_OPERATOR;


@Getter
@Setter
public class SpecSearchCriteria {
    private String key;
    private SearchOperation operation;
    private Object value;
    private Boolean orPredicate;

    public SpecSearchCriteria(String orPredicate, String key, String operation, String value){
        this.orPredicate = orPredicate != null && orPredicate.equals(SEARCH_OR_OPERATOR);
        this.key = key;
        this.operation = SearchOperation.getOperation(operation.charAt(0));
        this.value = value;
    }
}
