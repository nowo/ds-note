import type { Db } from '@/db/client'
import type { NewNote } from '@/db/schema'
import { and, desc, eq, isNotNull, isNull, like, or } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import { notes } from '@/db/schema'

/** 普通笔记列表（按更新时间倒序，排除软删除） */
export async function listActiveNotes(db: Db) {
    return db.select().from(notes).where(isNull(notes.deletedAt)).orderBy(desc(notes.updatedAt)).all()
}

export async function getNote(db: Db, id: string) {
    const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1).all()
    return rows[0] ?? null
}

export async function createNote(db: Db, input: { title?: string, content?: string }) {
    const now = new Date()
    const row: NewNote = {
        id: randomUUID(),
        title: input.title ?? '',
        content: input.content ?? '',
        pinned: false,
        createdAt: now,
        updatedAt: now,
    }
    await db.insert(notes).values(row).run()
    return row
}

export async function updateNote(
    db: Db,
    id: string,
    patch: { title?: string, content?: string, pinned?: boolean },
) {
    await db
        .update(notes)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(notes.id, id))
        .run()
}

/** 软删除：写入 deletedAt，进回收站 */
export async function softDeleteNote(db: Db, id: string) {
    await db
        .update(notes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(notes.id, id))
        .run()
}

// ---------- 回收站 ----------

/** 回收站列表（按删除时间倒序） */
export async function listTrashNotes(db: Db) {
    return db
        .select()
        .from(notes)
        .where(isNotNull(notes.deletedAt))
        .orderBy(desc(notes.deletedAt))
        .all()
}

/** 恢复笔记：清除软删除标记 */
export async function restoreNote(db: Db, id: string) {
    await db
        .update(notes)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(notes.id, id))
        .run()
}

/** 彻底删除单条笔记 */
export async function purgeNote(db: Db, id: string) {
    await db.delete(notes).where(eq(notes.id, id)).run()
}

/** 清空回收站（全部彻底删除） */
export async function emptyTrash(db: Db) {
    await db.delete(notes).where(isNotNull(notes.deletedAt)).run()
}

// ---------- 搜索 ----------

/** 标题或内容 LIKE 搜索（排除回收站），按更新时间倒序 */
export async function searchNotes(db: Db, q: string) {
    const pattern = `%${q}%`
    return db
        .select()
        .from(notes)
        .where(and(
            isNull(notes.deletedAt),
            or(like(notes.title, pattern), like(notes.content, pattern)),
        ))
        .orderBy(desc(notes.updatedAt))
        .all()
}
