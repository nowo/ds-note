import type { ReactNode } from 'react'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { useDbContext } from '@/db/db-provider'
import migrations from '@/db/drizzle/migrations'

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
        fontSize: 13,
        color: '#888',
        paddingHorizontal: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
})

/**
 * 数据库迁移门：应用启动时执行 drizzle 迁移，
 * 迁移完成前阻塞整个应用，避免在表未建好时访问。
 */
export function MigrationsGate({ children }: { children: ReactNode }) {
    const db = useDbContext()
    const { success, error } = useMigrations(db, migrations)

    // Web 端（wa-sqlite 同步 API 依赖 SharedArrayBuffer/COOP-COEP，且无设备认证能力）
    // 本应用目标是手机端，浏览器里给出明确提示而不是报错。
    if (Platform.OS === 'web') {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>Web 端暂不支持</Text>
                <Text style={styles.errorDetail}>
                    本应用的本地 SQLite 与加密区面向手机端。请用 Expo Go 扫码（或 exp://局域网IP:8081）在手机上打开。
                </Text>
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>数据库初始化失败</Text>
                <Text style={styles.errorDetail}>{String(error)}</Text>
            </View>
        )
    }

    if (!success) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return <>{children}</>
}
