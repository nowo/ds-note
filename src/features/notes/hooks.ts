import type { Db } from '@/db/db-provider'
import type { NewNote } from '@/db/schema'
import { useCallback } from 'react'
import { notifyNotesChanged, useLoad, useNotesVersion } from '@/data-layer'
import { useDbContext } from '@/db/db-provider'
import {
    createNote,
    emptyTrash,
    getNote,
    listActiveNotes,
    listTrashNotes,
    purgeNote,
    restoreNote,
    searchNotes,
    softDeleteNote,
    updateNote,
} from './api'

export function useDb(): Db {
    return useDbContext()
}

export function useNotes() {
    const db = useDb()
    const version = useNotesVersion()
    return useLoad(() => listActiveNotes(db), [db, version])
}

export function useSearchNotes(q: string) {
    const db = useDb()
    const version = useNotesVersion()
    const trimmed = q.trim()
    return useLoad(
        () => (trimmed.length === 0 ? Promise.resolve([]) : searchNotes(db, trimmed)),
        [db, trimmed, version],
    )
}

export function useTrashNotes() {
    const db = useDb()
    const version = useNotesVersion()
    return useLoad(() => listTrashNotes(db), [db, version])
}

export function useRestoreNote() {
    const db = useDb()
    const mutate = useCallback((id: string, opts?: { onSuccess?: () => void }) => {
        return restoreNote(db, id).then(() => {
            notifyNotesChanged()
            opts?.onSuccess?.()
        })
    }, [db])
    return { mutate, mutateAsync: mutate }
}

export function usePurgeNote() {
    const db = useDb()
    const mutate = useCallback((id: string, opts?: { onSuccess?: () => void }) => {
        return purgeNote(db, id).then(() => {
            notifyNotesChanged()
            opts?.onSuccess?.()
        })
    }, [db])
    return { mutate, mutateAsync: mutate }
}

export function useEmptyTrash() {
    const db = useDb()
    const mutate = useCallback((opts?: { onSuccess?: () => void }) => {
        return emptyTrash(db).then(() => {
            notifyNotesChanged()
            opts?.onSuccess?.()
        })
    }, [db])
    return { mutate, mutateAsync: mutate }
}

export function useNote(id: string) {
    const db = useDb()
    return useLoad(() => getNote(db, id), [db, id])
}

export function useCreateNote() {
    const db = useDb()
    const mutate = useCallback(
        (input: { title?: string, content?: string }, opts?: { onSuccess?: (note: NewNote) => void }) => {
            return createNote(db, input).then((note) => {
                notifyNotesChanged()
                opts?.onSuccess?.(note)
                return note
            })
        },
        [db],
    )
    return {
        mutate,
        mutateAsync: mutate,
    }
}

export function useUpdateNote() {
    const db = useDb()
    const mutate = useCallback(
        (vars: { id: string, title?: string, content?: string, pinned?: boolean }) => {
            return updateNote(db, vars.id, vars).then(() => {
                notifyNotesChanged()
                return vars.id
            })
        },
        [db],
    )
    return {
        mutate,
        mutateAsync: mutate,
    }
}

export function useDeleteNote() {
    const db = useDb()
    const mutate = useCallback(
        (id: string, opts?: { onSuccess?: () => void }) => {
            return softDeleteNote(db, id).then(() => {
                notifyNotesChanged()
                opts?.onSuccess?.()
            })
        },
        [db],
    )
    return {
        mutate,
        mutateAsync: mutate,
    }
}
