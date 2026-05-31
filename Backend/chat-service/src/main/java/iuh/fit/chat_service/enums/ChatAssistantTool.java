package iuh.fit.chat_service.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ChatAssistantTool {
    CHAT_LIST_MY_CONVERSATIONS("chat_list_my_conversations"),
    CHAT_GET_CONVERSATION_MESSAGES("chat_get_conversation_messages"),
    CHAT_SEARCH_KEYWORD("chat_search_keyword"),
    CHAT_SEMANTIC_SEARCH_CONVERSATION("chat_semantic_search_conversation"),
    CHAT_SEMANTIC_SEARCH_MY_SPACE("chat_semantic_search_my_space"),
    CHAT_FIND_WHO_SAID("chat_find_who_said"),
    TASK_LIST_MY_GROUPS("task_list_my_groups"),
    TASK_FIND_TASKS_BY_NAME("task_find_tasks_by_name"),
    TASK_LIST_GROUP_TASKS("task_list_group_tasks"),
    TASK_CREATE_TASK("task_create_task"),
    TASK_UPDATE_TASK("task_update_task"),
    TASK_DELETE_TASK("task_delete_task"),
    TASK_GET_TASK_DETAIL("task_get_task_detail"),
    TASK_ADD_TASK_COMMENT("task_add_task_comment"),
    TASK_LIST_TASK_COMMENTS("task_list_task_comments"),
    TASK_LIST_MY_TASKS("task_list_my_tasks"),
    TASK_LIST_MY_OVERDUE_TASKS("task_list_my_overdue_tasks"),
    TASK_LIST_MY_DUE_SOON_TASKS("task_list_my_due_soon_tasks");

    private final String code;
}
