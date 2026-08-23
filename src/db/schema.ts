import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * 普通笔记表（明文存储）。
 * 加密笔记（vault_notes）在 M2 加密区功能中新增，与普通笔记物理隔离。
 */
export const notes = sqliteTable(
    'notes',
    {
        id: text('id').primaryKey(),
        title: text('title').notNull().default(''),
        content: text('content').notNull().default(''),
        pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
        createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
        /** 软删除标记：非空表示已删除（回收站），NULL 表示正常 */
        deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    },
    t => [
        index('idx_notes_updated_at').on(t.updatedAt),
        index('idx_notes_deleted_at').on(t.deletedAt),
    ],
)

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert

/**
 * 加密笔记表：标题与内容均为密文（AES-256-GCM 信封，base64），与普通笔记物理隔离。
 * 只有解锁后（主密钥在内存中）才能解密。
 */
export const vaultNotes = sqliteTable(
    'vault_notes',
    {
        id: text('id').primaryKey(),
        titleEnc: text('title_enc').notNull(),
        contentEnc: text('content_enc').notNull(),
        createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
        deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
    },
    t => [
        index('idx_vault_notes_updated_at').on(t.updatedAt),
        index('idx_vault_notes_deleted_at').on(t.deletedAt),
    ],
)

/**
 * 加密区元信息（KV）：
 * - mode: 'device' | 'password' | 'both'
 * - kdf_salt / kdf_iters: 自定义密码派生参数
 * - wrapped_mk_password: AES-GCM(KEK密码, 主密钥) 的 base64 信封
 * - wrapped_mk_device:  AES-GCM(KEK设备, 主密钥) 的 base64 信封（存在即表示开启锁屏找回）
 */
export const vaultMeta = sqliteTable('vault_meta', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
})

export type VaultNote = typeof vaultNotes.$inferSelect
export type NewVaultNote = typeof vaultNotes.$inferInsert
