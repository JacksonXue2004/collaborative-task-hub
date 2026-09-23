// Centralized auth helper. Clerk handles sign-in / sign-up (see middleware.ts),
// but we still need a local User row because project membership, task
// assignment, and RBAC all reference our local `user.id` foreign key.
//
// Rule: sync clerkUserId into the local User table on first access. This
// function is idempotent — safe to call on every request.

//- Clerk 管登录注册，但我们 还需要本地 User 表 ——因为项目成员、任务分配、RBAC 都引用我们本地的 user.id 外键
// 规则：首次访问时把 clerkUserId 同步到本地 User 表
// 这个函数是幂等的 ——每次请求调用都安全
/**currentUser() 是什么？

Clerk 提供的服务端函数。调用它会：
1. 从请求的 Cookie/Header 里提取 session token
2. 验证 token 有效性
3. 返回当前登录用户的 Clerk 对象（含 id、email、name 等）
4. 如果没登录，返回 null
注意 ：这是 服务端函数 ，只能在 Server Component、Server Action、Route Handler 里用，
不能在客户端组件里用。
 */
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';
import { UnauthorizedError, DatabaseError } from './errors';

export async function getCurrentUser() {
  const user = await currentUser();
  if (!user || !user.id) {
    throw new UnauthorizedError('Not authenticated');
  }

  try {
    // Fast path: if local row exists, just return it.
    let local = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });
    //如果本地查到了记录， 直接返回 ，不走后面的创建逻辑。
    if (local) return local;

    // Sync path: first-time login. Clerk's currentUser() gives us email/name/avatar
    // so we can seed the local row without forcing the user to re-type anything.
    /**
     * - 取 user.emailAddresses[0]?.emailAddress
     * - 如果有值 → 用它
     * - 如果是 undefined → 用 '' （空字符串）
     */
    const email = user.emailAddresses[0]?.emailAddress ?? '';
    /**
     * - 取 user.firstName && user.lastName
     * - 如果都有值 → 合并成 `${user.firstName} ${user.lastName}`
     * - 如果只有一个值 → 取它
     * - 如果都为 undefined → 用 undefined
     */
    const name =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName ?? undefined;

        //字段不允许空字符串（唯一键、必填标识）→ 使用 ||
        //允许空字符串、0、false 合法值，仅缺失时兜底 → 使用 ??
    local = await prisma.user.create({
      data: {
        clerkUserId: user.id,
        email: email || user.id, // fallback to clerk id to satisfy unique constraint
        name: name ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      },
    });
    return local;
  } catch (err) {
    console.error('[getCurrentUser]', err);
    throw new DatabaseError('Failed to sync user');
  }
}
