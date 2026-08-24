import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppIcon } from '@/components/app-icon'
import { checkForUpdate, getCurrentVersion, openReleasePage } from '@/features/update/check'
import { goBackOr } from '@/utils/navigation'

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f6f7f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    backButton: {
        padding: 8,
        minWidth: 44,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    headerRight: {
        width: 44,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowText: {
        fontSize: 15,
        color: '#111',
    },
    rowValue: {
        fontSize: 14,
        color: '#888',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#e3e3e3',
        marginVertical: 12,
    },
    checkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2f6fed',
        borderRadius: 12,
        paddingVertical: 13,
    },
    checkButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginTop: 10,
        textAlign: 'center',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
})

export default function SettingsScreen() {
    const [checking, setChecking] = useState(false)

    const handleCheck = async () => {
        if (checking) return
        setChecking(true)
        try {
            const result = await checkForUpdate()
            if (!result) {
                Alert.alert('检查更新', '暂时无法连接更新服务，请稍后再试')
                return
            }
            if (result.hasUpdate) {
                Alert.alert(
                    '发现新版本',
                    `当前版本 ${result.currentVersion}，最新版本 ${result.latestVersion}。是否前往下载？`,
                    [
                        { text: '取消', style: 'cancel' },
                        {
                            text: '去下载',
                            onPress: () => {
                                void openReleasePage(result.releaseUrl)
                            },
                        },
                    ],
                )
            } else {
                Alert.alert('检查更新', `已是最新版本（${result.currentVersion}）`)
            }
        } finally {
            setChecking(false)
        }
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => goBackOr('/')} hitSlop={8} style={styles.backButton}>
                    <AppIcon name="mdi:arrow-left" size={20} color="#333" />
                </Pressable>
                <Text style={styles.headerTitle}>设置</Text>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.rowText}>当前版本</Text>
                    <Text style={styles.rowValue}>
                        v
                        {getCurrentVersion()}
                    </Text>
                </View>
                <View style={styles.divider} />
                {checking
                    ? (
                            <View style={styles.center}>
                                <ActivityIndicator size="small" color="#2f6fed" />
                                <Text style={styles.hint}>正在检查更新…</Text>
                            </View>
                        )
                    : (
                            <>
                                <Pressable style={styles.checkButton} onPress={() => void handleCheck()}>
                                    <AppIcon name="mdi:update" size={18} color="#fff" />
                                    <Text style={styles.checkButtonText}>检查更新</Text>
                                </Pressable>
                                <Text style={styles.hint}>从 GitHub Releases 检查并下载新版本</Text>
                            </>
                        )}
            </View>
        </SafeAreaView>
    )
}
