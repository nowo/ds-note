import type { Db } from '@/db/client'
import type { NewTag, Tag } from '@/db/schema'
import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import { notes, noteTags, tags } from '@/db/schema'

/** 标签列表 + 使用计数（按名称排序） */
export async function listTagsWithCount(db: Db) {
    return db
        .select({
            id: tags.id,
            name: tags.name,
            count: count(noteTags.tagId),
        })
        .from(tags)
        .leftJoin(noteTags, eq(noteTags.tagId, tags.id))
        .groupBy(tags.id)
        .orderBy(tags.name)
        .all()
}

/** 新建标签；同名标签返回「标签已存在」错误 */
export async function createTag(db: Db, name: string): Promise<Tag> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('标签名不能为空')
    try {
        const row: NewTag = { id: randomUUID(), name: trimmed, createdAt: new Date() }
        await db.insert(tags).values(row).run()
        return row
    } catch (e) {
        if (String(e).includes('UNIQUE')) throw new Error('标签已存在')
        throw e
    }
}

export async function renameTag(db: Db, id: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('标签名不能为空')
    try {
        await db.update(tags).set({ name: trimmed }).where(eq(tags.id, id)).run()
    } catch (e) {
        if (String(e).includes('UNIQUE')) throw new Error('标签已存在')
        throw e
    }
}

/** 删除标签（note_tags 级联删除） */
export async function deleteTag(db: Db, id: string) {
    await db.delete(tags).where(eq(tags.id, id)).run()
}

/** 某笔记已打的标签 id 列表 */
export async function getNoteTagIds(db: Db, noteId: string): Promise<string[]> {
    const rows = await db
        .select({ tagId: noteTags.tagId })
        .from(noteTags)
        .where(eq(noteTags.noteId, noteId))
        .all()
    return rows.map(r => r.tagId)
}

/** 覆盖设置某笔记的标签集合 */
export async function setNoteTags(db: Db, noteId: string, tagIds: string[]) {
    await db.delete(noteTags).where(eq(noteTags.noteId, noteId)).run()
    if (tagIds.length > 0) {
        await db.insert(noteTags).values(tagIds.map(tagId => ({ noteId, tagId }))).run()
    }
}

/** 某标签下的笔记列表（排除回收站，按更新时间倒序） */
export async function listNotesByTag(db: Db, tagId: string) {
    return db
        .select({
            id: notes.id,
            title: notes.title,
            content: notes.content,
            pinned: notes.pinned,
            createdAt: notes.createdAt,
            updatedAt: notes.updatedAt,
            deletedAt: notes.deletedAt,
        })
        .from(noteTags)
        .innerJoin(notes, eq(notes.id, noteTags.noteId))
        .where(and(eq(noteTags.tagId, tagId), isNull(notes.deletedAt)))
        .orderBy(desc(notes.updatedAt))
        .all()
}
