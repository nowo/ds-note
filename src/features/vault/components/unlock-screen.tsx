import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
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
    error: {
        fontSize: 13,
        color: '#c0392b',
    },
    link: {
        fontSize: 14,
        color: '#2f6fed',
        textAlign: 'center',
        paddingVertical: 6,
    },
    hint: {
        fontSize: 14,
        color: '#666',
    },
    fingerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#c9d6f2',
        backgroundColor: '#eef3ff',
        paddingVertical: 12,
    },
    fingerIcon: {
        fontSize: 18,
    },
    fingerText: {
        fontSize: 15,
        color: '#2f6fed',
        fontWeight: '600',
    },
    resetBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },
    resetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    resetHint: {
        fontSize: 12,
        color: '#888',
    },
    resetActions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    resetConfirm: {
        flex: 1,
        paddingVertical: 12,
    },
    ghostButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    ghostButtonText: {
        color: '#555',
        fontSize: 15,
    },
})

/**
 * 解锁界面：
 * - 纯设备锁模式（mode=device）：进入即自动唤起系统验证（指纹/面容/锁屏密码），
 *   取消后显示重试按钮
 * - 有自定义密码（mode=password/both）：密码输入 + 指纹图标按钮（走设备验证）+ 忘记密码重置
 */
export function UnlockScreen() {
    const vault = useVault()
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [resetting, setResetting] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [newConfirm, setNewConfirm] = useState('')
    const autoDeviceRef = useRef(false)

    const hasDevice = vault.mode === 'device' || vault.mode === 'both'
    const canReset = hasDevice

    // 系统验证被取消/返回 → 回到首页，不显示"验证未通过"；
    // 若加密区已在导航栈根（无页面可返回），直接 replace 到首页
    const backHomeOnCancel = useCallback(
        (ok: boolean) => {
            if (ok) return
            if (router.canGoBack()) {
                router.back()
            } else {
                router.replace('/')
            }
        },
        [router],
    )

    // 纯设备锁模式：进入页面自动唤起系统验证（只触发一次）；取消则回首页
    useEffect(() => {
        if (vault.mode === 'device' && vault.status === 'locked' && !autoDeviceRef.current) {
            autoDeviceRef.current = true
            void vault.unlockWithDevice().then(backHomeOnCancel)
        }
    }, [backHomeOnCancel])

    const handleDevice = async () => {
        const ok = await vault.unlockWithDevice()
        backHomeOnCancel(ok)
    }

    const handlePassword = async () => {
        if (password.length === 0) return
        const ok = await vault.unlockWithPassword(password)
        if (ok) setPassword('')
    }

    const handleReset = async () => {
        if (newPassword.length < 6 || newPassword !== newConfirm) return
        const ok = await vault.resetForgottenPassword(newPassword)
        if (ok) {
            setResetting(false)
            setNewPassword('')
            setNewConfirm('')
        }
    }

    if (vault.status === 'unlocking') {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
                <Text style={styles.hint}>
                    {vault.mode === 'device' ? '正在请求系统验证…' : '正在解锁（派生密钥可能需要几秒）…'}
                </Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔒 加密区</Text>
            <Text style={styles.subtitle}>
                {vault.mode === 'device'
                    ? '请通过系统验证（指纹 / 面容 / 锁屏密码）解锁'
                    : '请输入密码，或使用指纹 / 面容解锁'}
            </Text>

            {vault.error && <Text style={styles.error}>{vault.error}</Text>}

            {vault.mode === 'device'
                ? (
                    // 纯设备锁：系统验证被取消后显示重试按钮
                        <Pressable style={styles.primaryButton} onPress={handleDevice}>
                            <Text style={styles.primaryButtonText}>使用指纹 / 面容 / 锁屏密码解锁</Text>
                        </Pressable>
                    )
                : (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="自定义密码"
                                placeholderTextColor="#bbb"
                                secureTextEntry
                                autoCapitalize="none"
                                value={password}
                                onChangeText={setPassword}
                                onSubmitEditing={handlePassword}
                            />
                            <Pressable style={styles.primaryButton} onPress={handlePassword}>
                                <Text style={styles.primaryButtonText}>解锁</Text>
                            </Pressable>

                            {hasDevice && (
                                <Pressable style={styles.fingerButton} onPress={handleDevice}>
                                    <Text style={styles.fingerIcon}>🔐</Text>
                                    <Text style={styles.fingerText}>指纹 / 面容 / 锁屏密码</Text>
                                </Pressable>
                            )}

                            {canReset && !resetting && (
                                <Pressable onPress={() => setResetting(true)} hitSlop={8}>
                                    <Text style={styles.link}>忘记密码？用设备验证重置</Text>
                                </Pressable>
                            )}
                        </>
                    )}

            {resetting && (
                <View style={styles.resetBox}>
                    <Text style={styles.resetTitle}>设置新密码</Text>
                    <Text style={styles.resetHint}>将通过设备验证（指纹/面容/锁屏密码）确认身份</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="新密码（至少 6 位）"
                        placeholderTextColor="#bbb"
                        secureTextEntry
                        autoCapitalize="none"
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="确认新密码"
                        placeholderTextColor="#bbb"
                        secureTextEntry
                        autoCapitalize="none"
                        value={newConfirm}
                        onChangeText={setNewConfirm}
                    />
                    {newPassword.length > 0 && newPassword !== newConfirm && (
                        <Text style={styles.error}>两次输入不一致</Text>
                    )}
                    <View style={styles.resetActions}>
                        <Pressable style={styles.ghostButton} onPress={() => setResetting(false)}>
                            <Text style={styles.ghostButtonText}>取消</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.primaryButton,
                                styles.resetConfirm,
                                (newPassword.length < 6 || newPassword !== newConfirm) && styles.disabled,
                            ]}
                            disabled={newPassword.length < 6 || newPassword !== newConfirm}
                            onPress={handleReset}
                        >
                            <Text style={styles.primaryButtonText}>验证并重置</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    )
}
