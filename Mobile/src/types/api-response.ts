export interface ResponseSuccess<T> {
  status: number;
  message: string;
  data: T;
}

export interface ResponseError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export interface PageResponse<T> {
  page: number;
  limit: number;
  totalPage: number;
  totalItem: number;
  items: T[];
}
