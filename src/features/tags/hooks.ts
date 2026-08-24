import { useCallback, useMemo } from 'react'
import { notifyTagsChanged, useLoad, useNotesVersion, useTagsVersion } from '@/data-layer'
import { useDb } from '@/features/notes/hooks'
import {
    createTag,
    deleteTag,
    getNoteTagIds,
    listNotesByTag,
    listTagsWithCount,
    renameTag,
    setNoteTags,
} from './api'

/** 标签列表（含计数） */
export function useTags() {
    const db = useDb()
    const version = useTagsVersion()
    return useLoad(() => listTagsWithCount(db), [db, version])
}

/** 某笔记的标签 id 集合 */
export function useNoteTagIds(noteId: string) {
    const db = useDb()
    const tagsVersion = useTagsVersion()
    const notesVersion = useNotesVersion()
    return useLoad(() => getNoteTagIds(db, noteId), [db, noteId, tagsVersion, notesVersion])
}

/** 某标签下的笔记列表 */
export function useNotesByTag(tagId: string) {
    const db = useDb()
    const notesVersion = useNotesVersion()
    return useLoad(() => listNotesByTag(db, tagId), [db, tagId, notesVersion])
}

export function useCreateTag() {
    const db = useDb()
    const mutate = useCallback((name: string) => {
        return createTag(db, name).then((tag) => {
            notifyTagsChanged()
            return tag
        })
    }, [db])
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}

export function useRenameTag() {
    const db = useDb()
    const mutate = useCallback((id: string, name: string) => {
        return renameTag(db, id, name).then(() => {
            notifyTagsChanged()
        })
    }, [db])
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}

export function useDeleteTag() {
    const db = useDb()
    const mutate = useCallback((id: string, opts?: { onSuccess?: () => void }) => {
        return deleteTag(db, id).then(() => {
            notifyTagsChanged()
            opts?.onSuccess?.()
        })
    }, [db])
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}

export function useSetNoteTags() {
    const db = useDb()
    const mutate = useCallback((noteId: string, tagIds: string[]) => {
        return setNoteTags(db, noteId, tagIds).then(() => {
            notifyTagsChanged()
        })
    }, [db])
    return useMemo(() => ({ mutate, mutateAsync: mutate }), [mutate])
}
