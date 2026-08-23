import type { Db } from '@/db/db-provider'
import type { NewNote } from '@/db/schema'
import { useCallback } from 'react'
import { notifyNotesChanged, useLoad, useNotesVersion } from '@/data-layer'
import { useDbContext } from '@/db/db-provider'
import { createNote, getNote, listActiveNotes, softDeleteNote, updateNote } from './api'

export function useDb(): Db {
    return useDbContext()
}

export function useNotes() {
    const db = useDb()
    const version = useNotesVersion()
    return useLoad(() => listActiveNotes(db), [db, version])
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
