import type { Db } from '@/db/client'
import type { NewNote } from '@/db/schema'
import { desc, eq, isNull } from 'drizzle-orm'
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

/** 软删除：写入 deletedAt，供回收站（M4）使用 */
export async function softDeleteNote(db: Db, id: string) {
    await db
        .update(notes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(notes.id, id))
        .run()
}
