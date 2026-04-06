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
};

export type UpdateMyProfileRequest = {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
};
