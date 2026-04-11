export type UserProfile = {
  id: number;
  identityUserId: string;
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  avatar?: string | null;
  isActive: boolean;
  deletionPending?: boolean;
  deletionRequestedAt?: string | null;
};

export type UpdateMyProfileRequest = {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
};

export type UserSearchItem = {
  identityUserId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string | null;
};

export type UserSearchQuery = {
  keyword: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  search?: string;
};

export type RequestAccountDeletionRequest = {
  phoneNumber: string;
  reason: string;
  password: string;
};

export type AccountDeletionStatus = {
  deletionPending: boolean;
  deletionRequestedAt?: string | null;
  pendingDays: number;
  remainingDays: number;
  deletionReason?: string | null;
};
