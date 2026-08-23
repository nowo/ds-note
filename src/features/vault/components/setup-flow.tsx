import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useVault } from '../store'

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        gap: 12,
        backgroundColor: '#f6f7f9',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#f6f7f9',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111',
        marginTop: 24,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    primaryButton: {
        backgroundColor: '#2f6fed',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.4,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ddd',
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111',
    },
    warn: {
        fontSize: 12,
        color: '#c0392b',
        lineHeight: 17,
    },
    hint: {
        fontSize: 14,
        color: '#666',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#ccc',
    },
    dividerText: {
        fontSize: 12,
        color: '#999',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    switchLabel: {
        flex: 1,
        fontSize: 13,
        color: '#555',
    },
})

/**
 * 首次进入加密区的设置向导：
 * 选择「设备锁」或「自定义密码」，自定义密码可同时开启锁屏找回。
 */
export function SetupFlow() {
    const vault = useVault()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [recovery, setRecovery] = useState(true)
    const [busy, setBusy] = useState(false)
    const [initError, setInitError] = useState<string | null>(null)

    const canPasswordSubmit
        = password.length >= 6 && password === confirm

    const handleDevice = async () => {
        setBusy(true)
        try {
            await vault.setupDeviceOnly()
        } catch (e) {
            vault.clearError()
            setInitError(`初始化失败：${String(e instanceof Error ? e.message : e)}`)
        } finally {
            setBusy(false)
        }
    }

    const handlePassword = async () => {
        if (!canPasswordSubmit) return
        setBusy(true)
        try {
            await vault.setupPassword(password, recovery && vault.canUseDevice)
        } catch (e) {
            setInitError(`初始化失败：${String(e instanceof Error ? e.message : e)}`)
        } finally {
            setBusy(false)
        }
    }

    if (busy) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={styles.hint}>正在初始化加密区…</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>初始化加密区</Text>
            <Text style={styles.subtitle}>加密笔记会以 AES-256 加密后存于本地，只有解锁后才能查看。</Text>

            {initError && <Text style={styles.warn}>{initError}</Text>}

            {vault.canUseDevice && (
                <>
                    <Pressable style={styles.primaryButton} onPress={handleDevice}>
                        <Text style={styles.primaryButtonText}>使用设备锁（指纹/面容/系统密码）</Text>
                    </Pressable>
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>或设置独立密码</Text>
                        <View style={styles.dividerLine} />
                    </View>
                </>
            )}

            <TextInput
                style={styles.input}
                placeholder="设置密码（至少 6 位）"
                placeholderTextColor="#bbb"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="确认密码"
                placeholderTextColor="#bbb"
                secureTextEntry
                autoCapitalize="none"
                value={confirm}
                onChangeText={setConfirm}
            />
            {password.length > 0 && !canPasswordSubmit && (
                <Text style={styles.warn}>密码不一致或少于 6 位</Text>
            )}

            {vault.canUseDevice && (
                <View style={styles.switchRow}>
                    <Switch value={recovery} onValueChange={setRecovery} />
                    <Text style={styles.switchLabel}>同时开启「锁屏密码找回」（忘记密码时可用设备锁重置）</Text>
                </View>
            )}

            <Pressable
                style={[styles.primaryButton, !canPasswordSubmit && styles.disabled]}
                disabled={!canPasswordSubmit}
                onPress={handlePassword}
            >
                <Text style={styles.primaryButtonText}>完成初始化</Text>
            </Pressable>

            <Text style={styles.warn}>
                重要：忘记密码且未开启找回通道，加密数据将永久无法恢复。建议定期导出备份。
            </Text>
        </View>
    )
}
