// Shared type definitions used across layers.
// ActionState is the uniform shape returned by Server Actions so client
// components can check `state.success` and route errors into toasts.
/**
 * 这是 TS 的"可辨识联合（Discriminated Union）" ——一种非常重要的类型设计模式。
拆解 ：
1. 联合类型 | ： ActionState 是两种形状之一
2. 形状 1（成功） ： { success: true; data: T; message?: string }
3. 形状 2（失败） ： { success: false; error: {...} }
什么是"可辨识"？ 两种形状都有 success 字段，但值不同（ true vs false ）。
TS 能根据 success 的值 自动判断 是哪种形状：
 */
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

//为什么需要这个类型？ 分页查询不只返回数据，还要返回元信息（总数、页数）
// 前端才能渲染分页器（上一页/下一页按钮）。统一格式让所有分页接口行为一致。
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
