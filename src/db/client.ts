import type { SQLiteDatabase } from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseAsync } from 'expo-sqlite'
import * as schema from './schema'

export type Db = ReturnType<typeof drizzle>

let dbPromise: Promise<SQLiteDatabase> | null = null

/**
 * 全局唯一数据库连接：只打开一次、绝不主动关闭。
 * 不用 SQLiteProvider（其模块级单例在 dev 热更新重挂载时会 close 旧连接，
 * 导致 "Access to closed resource"），由我们自己管理生命周期。
 */
export function getDatabase(): Promise<SQLiteDatabase> {
    if (!dbPromise) {
        dbPromise = (async () => {
            const db = await openDatabaseAsync('notes.db')
            await db.execAsync('PRAGMA journal_mode = WAL;')
            await db.execAsync('PRAGMA foreign_keys = ON;')
            return db
        })()
    }
    return dbPromise
}

export function createDb(db: SQLiteDatabase): Db {
    return drizzle(db, { schema })
}
