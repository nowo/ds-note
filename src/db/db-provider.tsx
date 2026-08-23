import type { ReactNode } from 'react'
import type { Db } from './client'
import { createContext, useContext, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { createDb, getDatabase } from './client'

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 24,
    },
    error: {
        fontSize: 16,
        fontWeight: '600',
        color: '#c0392b',
    },
    errorDetail: {
        fontSize: 12,
        color: '#888',
        paddingHorizontal: 24,
        textAlign: 'center',
    },
})

export type { Db } from './client'

const DbContext = createContext<Db | null>(null)

/**
 * 打开数据库并注入 drizzle 实例。
 * 数据库由 client.ts 的模块级单例管理（打开一次、永不关闭），
 * 本 Provider 重挂载时复用同一连接，不会出现 "Access to closed resource"。
 */
export function DbProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<Db | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getDatabase()
            .then((sqlite) => {
                if (!cancelled) setDb(createDb(sqlite))
            })
            .catch((e) => {
                if (!cancelled) setError(String(e))
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>数据库打开失败</Text>
                <Text style={styles.errorDetail}>{error}</Text>
            </View>
        )
    }

    if (!db) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return <DbContext.Provider value={db}>{children}</DbContext.Provider>
}

export function useDbContext(): Db {
    const db = useContext(DbContext)
    if (!db) {
        throw new Error('useDbContext 必须在 <DbProvider> 内使用')
    }
    return db
}
