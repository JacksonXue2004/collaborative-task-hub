// Prisma client singleton for Next.js hot-reload compatibility.
// In development, Next.js reloads modules causing new PrismaClient instances
// to be created and exhausting DB connections. This pattern stores the client
// on the global object so it persists across reloads.
/**
 * Prisma 客户端单例，为了兼容 Next.js 热重载。
 * 开发模式下 Next.js 会重新加载模块，导致创建新的 PrismaClient 实例，
 * 耗尽数据库连接。这个模式把 client 存在全局对象上，让它在重载后依然存在
 * 单例模式（Singleton Pattern）：整个应用里 只有一个实例 ，所有人共用。
 * 第一次创建 PrismaClient 时，把它存到一个"不会被热重载清除"的地方 （全局对象 globalThis ）。
 * 下次再需要时，先去全局对象里找——找到了就直接用，找不到才创建新的。
 */
import { PrismaClient } from '@prisma/client';

//这行的意思是" 把全局对象 globalThis 
// 当作一个可能含有 prisma 属性的对象来用 "。
// TS 不再报错，我们可以安全地访问 globalForPrisma.prisma 。
//需要先转成unknown类型，再断言为有prisma属性的对象
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
