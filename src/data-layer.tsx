import { useEffect, useState } from 'react'

/**
 * 极简数据层：模块级变更通知总线。
 * 任何写操作完成后 notify 对应主题，订阅该主题的列表 hook 重新拉取。
 * 替代 @tanstack/react-query（其 useSyncExternalStore 在本项目触发
 * "Maximum update depth exceeded" 循环）。
 */

/** 通用数据加载：deps 变化时重新拉取 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        Promise.resolve()
            .then(load)
            .then((result) => {
                if (!cancelled) {
                    setData(result)
                    setError(null)
                }
            })
            .catch((e) => {
                if (!cancelled) setError(String(e instanceof Error ? e.message : e))
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, deps)

    return { data, error, isLoading: loading, isError: !!error }
}

type Listener = () => void

function createBus() {
    const listeners = new Set<Listener>()
    return {
        subscribe(l: Listener) {
            listeners.add(l)
            return () => {
                listeners.delete(l)
            }
        },
        notify() {
            listeners.forEach(l => l())
        },
    }
}

const notesBus = createBus()
const vaultNotesBus = createBus()
const tagsBus = createBus()

export function notifyNotesChanged() {
    notesBus.notify()
}

export function notifyVaultNotesChanged() {
    vaultNotesBus.notify()
}

export function notifyTagsChanged() {
    tagsBus.notify()
}

/** 订阅版本号：bus.notify() 时 +1，作为数据拉取 effect 的依赖 */
export function useBusVersion(bus: ReturnType<typeof createBus>): number {
    const [version, setVersion] = useState(0)
    useEffect(() => bus.subscribe(() => setVersion(v => v + 1)), [bus])
    return version
}

export function useNotesVersion(): number {
    return useBusVersion(notesBus)
}

export function useVaultNotesVersion(): number {
    return useBusVersion(vaultNotesBus)
}

export function useTagsVersion(): number {
    return useBusVersion(tagsBus)
}
