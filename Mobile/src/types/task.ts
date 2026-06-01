export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskAttachment = {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt: string;
  uploadedBy?: string;
};

export type TaskComment = {
  id: string;
  groupId: string;
  taskId: string;
  authorId: string;
  content?: string | null;
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type TaskColumn = {
  id: string;
  name: string;
  orderIndex: number;
};

export type TaskGroup = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  memberIds: string[];
  columns: TaskColumn[];
  createdAt: string;
  updatedAt: string;
};

export type TaskItem = {
  id: string;
  groupId: string;
  columnId: string;
  title: string;
  description?: string | null;
  assigneeIds: string[];
  reporterId: string;
  startDate?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  completed: boolean;
  completedAt?: string | null;
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
};

export type TaskDashboardSummary = {
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  overdueTasks: number;
  tasksByAssignee: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByColumn: Record<string, number>;
};

export type CreateTaskGroupPayload = {
  name: string;
  description?: string;
};

export type CreateTaskItemPayload = {
  title: string;
  description?: string;
  columnId: string;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  priority?: TaskPriority;
};

export type UpdateTaskItemPayload = Partial<CreateTaskItemPayload> & {
  completed?: boolean;
  attachments?: TaskAttachment[];
};

export type CreateTaskColumnPayload = {
  name: string;
};

export type ReorderTaskColumnsPayload = {
  columnIds: string[];
};

export type CreateTaskCommentPayload = {
  content?: string;
  attachments?: TaskAttachment[];
};
