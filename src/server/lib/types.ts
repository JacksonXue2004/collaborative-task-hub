// Shared type definitions used across layers.
// ActionState is the uniform shape returned by Server Actions so client
// components can check `state.success` and route errors into toasts.

export type ActionState<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

export const initialActionState: ActionState = {
  success: false,
  error: { code: 'IDLE', message: '' },
};


export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Role = 'OWNER' | 'MEMBER';
