import type { Db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import { notes, vaultNotes } from '@/db/schema'
import { decryptText, encryptText } from './crypto'

/**
 * 普通笔记 → 加密区（移动语义：普通笔记被删除，内容加密后进入 vault_notes）
 * 需要已解锁（主密钥 mk 在内存中）才能加密。
 */
export async function moveNoteToVault(db: Db, mk: Uint8Array, noteId: string): Promise<void> {
    const rows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1).all()
    const note = rows[0]
    if (!note) throw new Error('笔记不存在')
    await db
        .insert(vaultNotes)
        .values({
            id: randomUUID(),
            titleEnc: encryptText(mk, note.title),
            contentEnc: encryptText(mk, note.content),
            createdAt: note.createdAt,
            updatedAt: new Date(),
        })
        .run()
    await db.delete(notes).where(eq(notes.id, noteId)).run()
}

/**
 * 加密笔记 → 普通笔记（移动语义：解密后写入 notes，删除 vault_notes 记录）
 * @param db 数据库实例
 * @param mk 主密钥（已解锁）
 * @param vaultNoteId 加密笔记 id
 * @param plaintext 可选：编辑器最新内容（避免丢失未落盘的修改）；缺省时从密文解密
 * @param plaintext.title 最新标题
 * @param plaintext.content 最新内容
 */
export async function moveVaultNoteToNormal(
    db: Db,
    mk: Uint8Array,
    vaultNoteId: string,
    plaintext?: { title: string, content: string },
): Promise<void> {
    const rows = await db.select().from(vaultNotes).where(eq(vaultNotes.id, vaultNoteId)).limit(1).all()
    const vn = rows[0]
    if (!vn) throw new Error('加密笔记不存在')
    await db
        .insert(notes)
        .values({
            id: randomUUID(),
            title: plaintext?.title ?? decryptText(mk, vn.titleEnc),
            content: plaintext?.content ?? decryptText(mk, vn.contentEnc),
            pinned: false,
            createdAt: vn.createdAt,
            updatedAt: new Date(),
        })
        .run()
    await db.delete(vaultNotes).where(eq(vaultNotes.id, vaultNoteId)).run()
}
