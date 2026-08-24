import type { NewVaultNote } from '@/db/schema'
import { useCallback, useMemo } from 'react'
import { notifyNotesChanged, notifyVaultNotesChanged, useLoad, useVaultNotesVersion } from '@/data-layer'
import { useDbContext } from '@/db/db-provider'
import { useDb } from '@/features/notes/hooks'
import {
    createVaultNote,
    getVaultNote,
    listVaultNotes,
    softDeleteVaultNote,
    updateVaultNote,
} from './api'
import { decryptText, encryptText } from './crypto'
import { useVault } from './store'
import { moveNoteToVault, moveVaultNoteToNormal } from './transfer'

interface DecryptedVaultNote {
    id: string
    title: string
    content: string
    createdAt: Date
    updatedAt: Date
}

/** 加密笔记列表（已解密标题 + 内容预览） */
export function useVaultNotes() {
    const db = useDb()
    const { mk } = useVault()
    const version = useVaultNotesVersion()
    return useLoad(async () => {
        const rows = await listVaultNotes(db)
        if (!mk) return []
        return rows.map(row => ({
            id: row.id,
            title: decryptText(mk, row.titleEnc),
            content: decryptText(mk, row.contentEnc),
            updatedAt: row.updatedAt,
        }))
    }, [db, mk, version])
}

/** 加密笔记详情（解密后的明文） */
export function useVaultNote(id: string) {
    const db = useDb()
    const { mk } = useVault()
    return useLoad(async (): Promise<DecryptedVaultNote | null> => {
        const row = await getVaultNote(db, id)
        if (!row || !mk) return null
        return {
            id: row.id,
            title: decryptText(mk, row.titleEnc),
            content: decryptText(mk, row.contentEnc),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }
    }, [db, id, mk])
}

export function useCreateVaultNote() {
    const db = useDbContext()
    const { mk } = useVault()
    const mutate = useCallback(
        (input: { title: string, content: string }, opts?: { onSuccess?: (note: NewVaultNote) => void }) => {
            if (!mk) return Promise.reject(new Error('加密区未解锁'))
            return createVaultNote(db, {
                titleEnc: encryptText(mk, input.title),
                contentEnc: encryptText(mk, input.content),
            }).then((note) => {
                notifyVaultNotesChanged()
                opts?.onSuccess?.(note)
                return note
            })
        },
        [db, mk],
    )
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}

export function useUpdateVaultNote() {
    const db = useDbContext()
    const { mk } = useVault()
    const mutate = useCallback(
        (vars: { id: string, title: string, content: string }) => {
            if (!mk) return Promise.reject(new Error('加密区未解锁'))
            return updateVaultNote(db, vars.id, {
                titleEnc: encryptText(mk, vars.title),
                contentEnc: encryptText(mk, vars.content),
            }).then(() => {
                notifyVaultNotesChanged()
                return vars.id
            })
        },
        [db, mk],
    )
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}

export function useDeleteVaultNote() {
    const db = useDbContext()
    const mutate = useCallback((id: string, opts?: { onSuccess?: () => void }) => {
        return softDeleteVaultNote(db, id).then(() => {
            notifyVaultNotesChanged()
            opts?.onSuccess?.()
        })
    }, [db])
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}

/** 普通笔记 → 加密区（需已解锁） */
export function useMoveNoteToVault() {
    const db = useDbContext()
    const { mk } = useVault()
    const mutate = useCallback((noteId: string, opts?: { onSuccess?: () => void }) => {
        if (!mk) return Promise.reject(new Error('加密区未解锁'))
        return moveNoteToVault(db, mk, noteId).then(() => {
            notifyNotesChanged()
            notifyVaultNotesChanged()
            opts?.onSuccess?.()
        })
    }, [db, mk])
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}

/** 加密笔记 → 普通笔记（可传编辑器最新明文，避免丢失未落盘修改） */
export function useMoveVaultNoteToNormal() {
    const db = useDbContext()
    const { mk } = useVault()
    const mutate = useCallback(
        (vaultNoteId: string, plaintext?: { title: string, content: string }, opts?: { onSuccess?: () => void }) => {
            if (!mk) return Promise.reject(new Error('加密区未解锁'))
            return moveVaultNoteToNormal(db, mk, vaultNoteId, plaintext).then(() => {
                notifyNotesChanged()
                notifyVaultNotesChanged()
                opts?.onSuccess?.()
            })
        },
        [db, mk],
    )
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}
