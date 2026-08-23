import type { Db } from '@/db/client'
import type { NewVaultNote } from '@/db/schema'
import { desc, eq, isNull } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import { vaultMeta, vaultNotes } from '@/db/schema'

// ---------- vault_meta KV ----------

export async function getMeta(db: Db, key: string): Promise<string | null> {
    const rows = await db.select().from(vaultMeta).where(eq(vaultMeta.key, key)).limit(1).all()
    return rows[0]?.value ?? null
}

export async function setMeta(db: Db, key: string, value: string): Promise<void> {
    await db
        .insert(vaultMeta)
        .values({ key, value })
        .onConflictDoUpdate({ target: vaultMeta.key, set: { value } })
        .run()
}

export async function deleteMeta(db: Db, key: string): Promise<void> {
    await db.delete(vaultMeta).where(eq(vaultMeta.key, key)).run()
}

// ---------- vault_notes（密文由调用方用主密钥加密后传入） ----------

export async function listVaultNotes(db: Db) {
    return db
        .select()
        .from(vaultNotes)
        .where(isNull(vaultNotes.deletedAt))
        .orderBy(desc(vaultNotes.updatedAt))
        .all()
}

export async function getVaultNote(db: Db, id: string) {
    const rows = await db.select().from(vaultNotes).where(eq(vaultNotes.id, id)).limit(1).all()
    return rows[0] ?? null
}

export async function createVaultNote(
    db: Db,
    input: { titleEnc: string, contentEnc: string },
) {
    const now = new Date()
    const row: NewVaultNote = {
        id: randomUUID(),
        titleEnc: input.titleEnc,
        contentEnc: input.contentEnc,
        createdAt: now,
        updatedAt: now,
    }
    await db.insert(vaultNotes).values(row).run()
    return row
}

export async function updateVaultNote(
    db: Db,
    id: string,
    patch: { titleEnc?: string, contentEnc?: string },
) {
    await db
        .update(vaultNotes)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(vaultNotes.id, id))
        .run()
}

export async function softDeleteVaultNote(db: Db, id: string) {
    await db
        .update(vaultNotes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(vaultNotes.id, id))
        .run()
}
