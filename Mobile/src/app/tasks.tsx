import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { MessagesBottomTabs } from '@/components/messages/messages-bottom-tabs';
import { AppStatusBarBlue } from '@/components/ui/app-status-bar-blue';
import { taskService } from '@/services/task.service';
import type {
  CreateTaskItemPayload,
  TaskComment,
  TaskGroup,
  TaskItem,
  TaskPriority,
} from '@/types/task';
import { formatDateVi } from '@/utils/date.util';

type TaskScope = 'group' | 'my';
type TaskView = 'list' | 'kanban' | 'dashboard';

const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};
const PRIORITY_CLASS: Record<TaskPriority, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-rose-100 text-rose-700',
};

const buildLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const formatDateTime = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

const toIsoStart = (value?: string) => {
  if (!value?.trim()) return undefined;
  return new Date(`${value.trim()}T00:00:00`).toISOString();
};

const toIsoEnd = (value?: string) => {
  if (!value?.trim()) return undefined;
  return new Date(`${value.trim()}T23:59:59`).toISOString();
};

const isOverdue = (task: TaskItem) => {
  if (!task.dueDate || task.completed) return false;
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due)) return false;
  return due < Date.now();
};

const TaskCard = ({
  task,
  onPress,
  onToggleComplete,
}: {
  task: TaskItem;
  onPress: () => void;
  onToggleComplete: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
    <View className="flex-row items-start justify-between gap-2">
      <Pressable
        onPress={onToggleComplete}
        className={`mr-2 mt-0.5 h-5 w-5 items-center justify-center rounded-full border ${
          task.completed ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
        }`}>
        {task.completed ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
      </Pressable>

      <View className="flex-1">
        <Text
          className={`text-[14px] font-semibold ${
            task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
          }`}>
          {task.title}
        </Text>
        <Text className="mt-1 text-xs text-slate-500">
          {formatDateVi(task.startDate || task.createdAt)} - {formatDateVi(task.dueDate)}
        </Text>
      </View>

      <View className={`rounded-full px-2 py-1 ${PRIORITY_CLASS[task.priority]}`}>
        <Text className="text-[10px] font-semibold">{PRIORITY_LABEL[task.priority]}</Text>
      </View>
    </View>
  </Pressable>
);

export default function TasksScreen() {
  const [scope, setScope] = useState<TaskScope>('group');
  const [view, setView] = useState<TaskView>('list');
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskColumnId, setTaskColumnId] = useState('');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const visibleTasks = scope === 'my' ? myTasks : tasks;
  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((group) => map.set(group.id, group.name));
    return map;
  }, [groups]);

  const groupedTasks = useMemo(() => {
    if (scope === 'group' && selectedGroup) {
      const byColumn = new Map<string, TaskItem[]>();
      selectedGroup.columns
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .forEach((column) => byColumn.set(column.id, []));
      visibleTasks.forEach((task) => {
        if (!byColumn.has(task.columnId)) {
          byColumn.set(task.columnId, []);
        }
        byColumn.get(task.columnId)?.push(task);
      });

      return Array.from(byColumn.entries()).map(([columnId, items]) => ({
        columnId,
        columnName:
          selectedGroup.columns.find((column) => column.id === columnId)?.name || 'Khác',
        items,
      }));
    }

    const byStatus = new Map<string, TaskItem[]>();
    visibleTasks.forEach((task) => {
      const group = groups.find((item) => item.id === task.groupId);
      const column = group?.columns.find((item) => item.id === task.columnId);
      const columnName = column?.name || 'Khác';
      if (!byStatus.has(columnName)) {
        byStatus.set(columnName, []);
      }
      byStatus.get(columnName)?.push(task);
    });
    return Array.from(byStatus.entries()).map(([columnName, items]) => ({
      columnId: columnName,
      columnName,
      items,
    }));
  }, [groups, scope, selectedGroup, visibleTasks]);

  const dashboardSummary = useMemo(() => {
    const totalTasks = visibleTasks.length;
    const completedTasks = visibleTasks.filter((task) => task.completed).length;
    const incompleteTasks = totalTasks - completedTasks;
    const overdueTasks = visibleTasks.filter((task) => isOverdue(task)).length;
    const priorityCount: Record<TaskPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    groupedTasks.forEach((groupItem) => {
      groupItem.items.forEach((task) => {
        priorityCount[task.priority] += 1;
      });
    });
    return {
      totalTasks,
      completedTasks,
      incompleteTasks,
      overdueTasks,
      priorityCount,
    };
  }, [groupedTasks, visibleTasks]);

  const loadData = async (
    targetScope: TaskScope,
    preferredGroupId?: string | null,
    showPrimaryLoading = false
  ) => {
    if (showPrimaryLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const groupsResponse = await taskService.listGroups();
      const nextGroups = groupsResponse.data ?? [];
      setGroups(nextGroups);

      let resolvedGroupId = preferredGroupId ?? selectedGroupId;
      if (nextGroups.length === 0) {
        resolvedGroupId = null;
      } else if (!resolvedGroupId || !nextGroups.some((group) => group.id === resolvedGroupId)) {
        resolvedGroupId = nextGroups[0].id;
      }
      setSelectedGroupId(resolvedGroupId);

      if (targetScope === 'my') {
        const myTaskResponse = await taskService.listMyTasks();
        setMyTasks(myTaskResponse.data ?? []);
        setTasks([]);
      } else if (resolvedGroupId) {
        const taskResponse = await taskService.listTasks(resolvedGroupId);
        setTasks(taskResponse.data ?? []);
        setMyTasks([]);
      } else {
        setTasks([]);
        setMyTasks([]);
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Không tải được dữ liệu công việc',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData('group', undefined, true);
    // Initial bootstrap only. Subsequent reloads are triggered by user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScopeChange = (nextScope: TaskScope) => {
    if (scope === nextScope) {
      return;
    }
    setScope(nextScope);
    if (nextScope === 'my' && view === 'dashboard') {
      setView('list');
    }
    void loadData(nextScope);
  };

  const handleSelectGroup = (groupId: string) => {
    if (selectedGroupId === groupId && scope === 'group') {
      return;
    }
    setScope('group');
    setSelectedGroupId(groupId);
    void loadData('group', groupId);
  };

  const handleRefresh = () => {
    void loadData(scope, selectedGroupId);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập tên task group' });
      return;
    }
    setCreatingGroup(true);
    try {
      const response = await taskService.createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });
      const created = response.data;
      setIsCreateGroupOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setScope('group');
      Toast.show({ type: 'success', text1: 'Đã tạo task group' });
      await loadData('group', created.id);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Tạo task group thất bại',
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const openCreateTaskModal = () => {
    if (!selectedGroup) {
      Toast.show({
        type: 'error',
        text1: 'Vui lòng chọn task group',
      });
      return;
    }
    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('MEDIUM');
    setTaskColumnId(selectedGroup.columns[0]?.id ?? '');
    setTaskStartDate('');
    setTaskDueDate('');
    setIsCreateTaskOpen(true);
  };

  const handleCreateTask = async () => {
    if (!selectedGroup) {
      Toast.show({ type: 'error', text1: 'Không có task group để tạo task' });
      return;
    }
    if (!taskTitle.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập tiêu đề task' });
      return;
    }
    if (!taskColumnId) {
      Toast.show({ type: 'error', text1: 'Vui lòng chọn trạng thái task' });
      return;
    }

    setCreatingTask(true);
    try {
      const payload: CreateTaskItemPayload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        columnId: taskColumnId,
        priority: taskPriority,
        startDate: toIsoStart(taskStartDate),
        dueDate: toIsoEnd(taskDueDate),
      };
      await taskService.createTask(selectedGroup.id, payload);
      setIsCreateTaskOpen(false);
      Toast.show({ type: 'success', text1: 'Đã tạo task mới' });
      await loadData('group', selectedGroup.id);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Tạo task thất bại',
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleToggleTaskComplete = async (task: TaskItem) => {
    setUpdatingTaskId(task.id);
    try {
      await taskService.updateTask(task.id, { completed: !task.completed });
      await loadData(scope, selectedGroupId);
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask((prev) => (prev ? { ...prev, completed: !prev.completed } : prev));
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Cập nhật trạng thái task thất bại',
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleOpenTaskDetail = async (task: TaskItem) => {
    setSelectedTask(task);
    setCommentDraft('');
    setTaskComments([]);
    setLoadingComments(true);
    try {
      const response = await taskService.listComments(task.id);
      setTaskComments(response.data ?? []);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Không tải được bình luận task',
      });
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !commentDraft.trim()) {
      return;
    }
    setSendingComment(true);
    try {
      const response = await taskService.createComment(selectedTask.id, {
        content: commentDraft.trim(),
      });
      setTaskComments((prev) => [...prev, response.data]);
      setCommentDraft('');
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Không thêm được bình luận',
      });
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f3f4f6]">
      <AppStatusBarBlue />
      <SafeAreaView edges={['top']} className="bg-[#1e98f3]" />

      <View className="bg-[#1e98f3] px-4 pb-3 pt-1">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-[18px] font-semibold text-white">Task Management</Text>
            <Text className="mt-0.5 text-xs text-blue-100">Quản lý công việc nhóm và cá nhân</Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center bg-white px-3 pb-2 pt-2.5">
        <Pressable
          onPress={() => handleScopeChange('group')}
          className={`mr-2 rounded-full px-3 py-1.5 ${
            scope === 'group' ? 'bg-blue-600' : 'bg-slate-200'
          }`}>
          <Text className={`text-xs font-semibold ${scope === 'group' ? 'text-white' : 'text-slate-700'}`}>
            Theo nhóm
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleScopeChange('my')}
          className={`rounded-full px-3 py-1.5 ${
            scope === 'my' ? 'bg-blue-600' : 'bg-slate-200'
          }`}>
          <Text className={`text-xs font-semibold ${scope === 'my' ? 'text-white' : 'text-slate-700'}`}>
            Công việc của tôi
          </Text>
        </Pressable>

        <View className="ml-auto flex-row items-center gap-2">
          <Pressable
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5"
            onPress={() => setIsCreateGroupOpen(true)}>
            <Text className="text-xs font-medium text-slate-700">+ Nhóm</Text>
          </Pressable>
          <Pressable
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5"
            onPress={handleRefresh}
            disabled={refreshing || loading}>
            <Text className="text-xs font-medium text-slate-700">
              {refreshing || loading ? '...' : 'Làm mới'}
            </Text>
          </Pressable>
        </View>
      </View>

      {scope === 'group' ? (
        <View className="border-b border-slate-200 bg-white pb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 px-3">
            {groups.map((group) => {
              const active = selectedGroupId === group.id;
              return (
                <Pressable
                  key={group.id}
                  onPress={() => handleSelectGroup(group.id)}
                  className={`rounded-xl border px-3 py-2 ${
                    active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                    {group.name}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-slate-500">{group.memberIds.length} thành viên</Text>
                </Pressable>
              );
            })}
            {groups.length === 0 ? (
              <View className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
                <Text className="text-xs text-slate-500">Chưa có task group</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <View className="border-b border-slate-200 bg-white px-3 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {(['list', 'kanban', 'dashboard'] as TaskView[]).map((key) => {
            if (scope === 'my' && key === 'dashboard') {
              return null;
            }
            const active = key === view;
            const label = key === 'list' ? 'List' : key === 'kanban' ? 'Kanban' : 'Dashboard';
            return (
              <Pressable
                key={key}
                onPress={() => setView(key)}
                className={`rounded-full px-3 py-1.5 ${active ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-3 py-3" contentContainerClassName="pb-6">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-slate-900">
            {scope === 'my'
              ? `Công việc của tôi (${myTasks.length})`
              : `${selectedGroup?.name ?? 'Task group'} (${tasks.length})`}
          </Text>
          {scope === 'group' ? (
            <Pressable className="rounded-lg bg-slate-900 px-3 py-2" onPress={openCreateTaskModal}>
              <Text className="text-xs font-semibold text-white">+ Task mới</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View className="rounded-xl border border-slate-200 bg-white p-5">
            <Text className="text-center text-sm text-slate-600">Đang tải dữ liệu task...</Text>
          </View>
        ) : null}

        {!loading && visibleTasks.length === 0 ? (
          <View className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
            <Text className="text-center text-sm text-slate-500">Chưa có task nào.</Text>
          </View>
        ) : null}

        {!loading && visibleTasks.length > 0 && view === 'list'
          ? groupedTasks.map((groupItem) => (
              <View key={groupItem.columnId} className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <View className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <Text className="text-sm font-semibold text-slate-800">
                    {groupItem.columnName} ({groupItem.items.length})
                  </Text>
                </View>
                <View className="p-2">
                  {groupItem.items.length === 0 ? (
                    <Text className="px-2 py-2 text-xs text-slate-400">Không có task</Text>
                  ) : (
                    groupItem.items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onPress={() => void handleOpenTaskDetail(task)}
                        onToggleComplete={() => {
                          if (!updatingTaskId) {
                            void handleToggleTaskComplete(task);
                          }
                        }}
                      />
                    ))
                  )}
                </View>
              </View>
            ))
          : null}

        {!loading && visibleTasks.length > 0 && view === 'kanban' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3 pb-2">
              {groupedTasks.map((groupItem) => (
                <View key={groupItem.columnId} className="w-[300px] rounded-xl border border-slate-200 bg-white p-2.5">
                  <Text className="mb-2 text-sm font-semibold text-slate-800">
                    {groupItem.columnName} ({groupItem.items.length})
                  </Text>
                  {groupItem.items.length === 0 ? (
                    <View className="rounded-lg border border-dashed border-slate-300 px-2 py-3">
                      <Text className="text-center text-xs text-slate-400">Trống</Text>
                    </View>
                  ) : (
                    groupItem.items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onPress={() => void handleOpenTaskDetail(task)}
                        onToggleComplete={() => {
                          if (!updatingTaskId) {
                            void handleToggleTaskComplete(task);
                          }
                        }}
                      />
                    ))
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}

        {!loading && visibleTasks.length > 0 && view === 'dashboard' ? (
          <View className="gap-3">
            <View className="rounded-xl border border-slate-200 bg-white p-4">
              <Text className="text-sm text-slate-500">Tổng task</Text>
              <Text className="mt-2 text-4xl font-bold text-slate-900">{dashboardSummary.totalTasks}</Text>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-xs text-slate-500">Hoàn thành</Text>
                <Text className="mt-2 text-2xl font-semibold text-emerald-600">
                  {dashboardSummary.completedTasks}
                </Text>
              </View>
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-xs text-slate-500">Chưa xong</Text>
                <Text className="mt-2 text-2xl font-semibold text-amber-600">
                  {dashboardSummary.incompleteTasks}
                </Text>
              </View>
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-xs text-slate-500">Trễ hạn</Text>
                <Text className="mt-2 text-2xl font-semibold text-rose-600">
                  {dashboardSummary.overdueTasks}
                </Text>
              </View>
            </View>

            <View className="rounded-xl border border-slate-200 bg-white p-4">
              <Text className="mb-2 text-sm font-semibold text-slate-800">Theo mức ưu tiên</Text>
              {PRIORITY_OPTIONS.map((priority) => (
                <View key={priority} className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm text-slate-600">{PRIORITY_LABEL[priority]}</Text>
                  <View className={`rounded-full px-2 py-1 ${PRIORITY_CLASS[priority]}`}>
                    <Text className="text-xs font-semibold">{dashboardSummary.priorityCount[priority]}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <MessagesBottomTabs activeTab="tasks" />
      <SafeAreaView edges={['bottom']} className="bg-white" />

      <Modal visible={isCreateGroupOpen} transparent animationType="fade" onRequestClose={() => setIsCreateGroupOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/35 px-4">
          <View className="w-full rounded-2xl bg-white p-4">
            <Text className="text-lg font-semibold text-slate-900">Tạo task group</Text>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Tên group"
              className="mt-3 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              placeholder="Mô tả (tùy chọn)"
              multiline
              className="mt-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              placeholderTextColor="#94a3b8"
            />
            <View className="mt-3 flex-row justify-end gap-2">
              <Pressable className="rounded-lg bg-slate-200 px-3 py-2" onPress={() => setIsCreateGroupOpen(false)}>
                <Text className="text-sm font-medium text-slate-700">Hủy</Text>
              </Pressable>
              <Pressable
                className={`rounded-lg px-3 py-2 ${creatingGroup ? 'bg-blue-300' : 'bg-blue-600'}`}
                disabled={creatingGroup}
                onPress={() => void handleCreateGroup()}>
                <Text className="text-sm font-semibold text-white">
                  {creatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isCreateTaskOpen} transparent animationType="fade" onRequestClose={() => setIsCreateTaskOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/35 px-4">
          <ScrollView className="w-full" contentContainerClassName="py-5">
            <View className="rounded-2xl bg-white p-4">
              <Text className="text-lg font-semibold text-slate-900">Tạo task mới</Text>

              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Tiêu đề task"
                className="mt-3 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                value={taskDescription}
                onChangeText={setTaskDescription}
                placeholder="Mô tả task"
                multiline
                className="mt-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
                placeholderTextColor="#94a3b8"
              />

              <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 pt-2">
                {(selectedGroup?.columns ?? []).map((column) => {
                  const active = taskColumnId === column.id;
                  return (
                    <Pressable
                      key={column.id}
                      onPress={() => setTaskColumnId(column.id)}
                      className={`rounded-full px-3 py-1.5 ${
                        active ? 'bg-blue-600' : 'bg-slate-200'
                      }`}>
                      <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>
                        {column.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ưu tiên</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 pt-2">
                {PRIORITY_OPTIONS.map((priority) => {
                  const active = taskPriority === priority;
                  return (
                    <Pressable
                      key={priority}
                      onPress={() => setTaskPriority(priority)}
                      className={`rounded-full px-3 py-1.5 ${
                        active ? 'bg-blue-600' : 'bg-slate-200'
                      }`}>
                      <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>
                        {PRIORITY_LABEL[priority]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View className="mt-3 flex-row gap-2">
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-slate-500">Start (YYYY-MM-DD)</Text>
                  <TextInput
                    value={taskStartDate}
                    onChangeText={setTaskStartDate}
                    placeholder="2026-06-01"
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-slate-500">Due (YYYY-MM-DD)</Text>
                  <TextInput
                    value={taskDueDate}
                    onChangeText={setTaskDueDate}
                    placeholder="2026-06-10"
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View className="mt-4 flex-row justify-end gap-2">
                <Pressable className="rounded-lg bg-slate-200 px-3 py-2" onPress={() => setIsCreateTaskOpen(false)}>
                  <Text className="text-sm font-medium text-slate-700">Hủy</Text>
                </Pressable>
                <Pressable
                  className={`rounded-lg px-3 py-2 ${creatingTask ? 'bg-blue-300' : 'bg-blue-600'}`}
                  disabled={creatingTask}
                  onPress={() => void handleCreateTask()}>
                  <Text className="text-sm font-semibold text-white">
                    {creatingTask ? 'Đang tạo...' : 'Tạo task'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={selectedTask != null}
        animationType="slide"
        onRequestClose={() => setSelectedTask(null)}>
        <View className="flex-1 bg-[#f3f4f6]">
          <SafeAreaView edges={['top']} className="bg-white" />
          <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-2.5">
            <Pressable className="mr-2 h-9 w-9 items-center justify-center rounded-full" onPress={() => setSelectedTask(null)}>
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900">Chi tiết task</Text>
              <Text className="text-xs text-slate-500">{selectedTask ? formatDateTime(selectedTask.createdAt) : ''}</Text>
            </View>
            {selectedTask ? (
              <Pressable
                className={`rounded-full px-3 py-1.5 ${selectedTask.completed ? 'bg-emerald-600' : 'bg-blue-600'}`}
                disabled={updatingTaskId === selectedTask.id}
                onPress={() => void handleToggleTaskComplete(selectedTask)}>
                <Text className="text-xs font-semibold text-white">
                  {updatingTaskId === selectedTask.id
                    ? '...'
                    : selectedTask.completed
                    ? 'Đã hoàn thành'
                    : 'Đánh dấu xong'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {selectedTask ? (
            <ScrollView className="flex-1 px-3 py-3" contentContainerClassName="pb-4">
              <View className="rounded-xl border border-slate-200 bg-white p-4">
                <Text className={`text-lg font-semibold ${selectedTask.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {selectedTask.title}
                </Text>
                <Text className="mt-1 text-xs text-slate-500">
                  Nhóm: {groupNameMap.get(selectedTask.groupId) || selectedTask.groupId}
                </Text>
                <Text className="mt-1 text-xs text-slate-500">
                  Bắt đầu: {formatDateVi(selectedTask.startDate || selectedTask.createdAt)}
                </Text>
                <Text className={`mt-1 text-xs ${isOverdue(selectedTask) ? 'text-rose-600' : 'text-slate-500'}`}>
                  Hạn: {formatDateVi(selectedTask.dueDate)}
                </Text>
                <View className={`mt-2 self-start rounded-full px-2 py-1 ${PRIORITY_CLASS[selectedTask.priority]}`}>
                  <Text className="text-[10px] font-semibold">{PRIORITY_LABEL[selectedTask.priority]}</Text>
                </View>
                <Text className="mt-3 text-sm text-slate-700">
                  {selectedTask.description?.trim() || 'Chưa có mô tả task.'}
                </Text>
              </View>

              <View className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-sm font-semibold text-slate-900">Bình luận</Text>
                {loadingComments ? (
                  <Text className="mt-2 text-xs text-slate-500">Đang tải bình luận...</Text>
                ) : taskComments.length === 0 ? (
                  <Text className="mt-2 text-xs text-slate-500">Chưa có bình luận.</Text>
                ) : (
                  taskComments.map((comment) => (
                    <View key={comment.id || buildLocalId()} className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <Text className="text-[11px] text-slate-500">{comment.authorId}</Text>
                      <Text className="mt-1 text-sm text-slate-700">{comment.content || '(trống)'}</Text>
                      <Text className="mt-1 text-[10px] text-slate-400">{formatDateTime(comment.createdAt)}</Text>
                    </View>
                  ))
                )}

                <TextInput
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  placeholder="Nhập bình luận..."
                  multiline
                  className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
                <Pressable
                  className={`mt-2 self-end rounded-lg px-3 py-2 ${sendingComment ? 'bg-blue-300' : 'bg-blue-600'}`}
                  onPress={() => void handleAddComment()}
                  disabled={sendingComment || !commentDraft.trim()}>
                  <Text className="text-xs font-semibold text-white">
                    {sendingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
