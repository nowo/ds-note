import { useEffect, useState } from 'react'
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from '@/components/app-header'
import { AppIcon } from '@/components/app-icon'
import { useVault } from '@/features/vault/store'
import { goBackOr } from '@/utils/navigation'

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f6f7f9',
    },
    content: {
        paddingBottom: 32,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginTop: 20,
        marginBottom: -4,
        marginHorizontal: 20,
    },
    label: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    input: {
        backgroundColor: '#f6f7f9',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontSize: 15,
        color: '#111',
    },
    button: {
        backgroundColor: '#2f6fed',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.4,
    },
    done: {
        color: '#1e8e3e',
        fontSize: 14,
    },
    doneWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorText: {
        color: '#c0392b',
        fontSize: 13,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 2,
    },
    switchLabel: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    switchHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
    },
    removeButton: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0a3a3',
        backgroundColor: '#fdf0f0',
        paddingVertical: 12,
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#c0392b',
        fontSize: 15,
        fontWeight: '600',
    },
})

/** 加密区设置页：修改自定义密码、锁屏找回开关、删除自定义密码 */
export default function VaultSettingsScreen() {
    const vault = useVault()
    const [newPassword, setNewPassword] = useState('')
    const [newConfirm, setNewConfirm] = useState('')
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [removeBusy, setRemoveBusy] = useState(false)
    const [removeDone, setRemoveDone] = useState(false)
    // 开关乐观更新：点击立即翻转视觉，async 落库完成后由 vault.mode 校准
    const [recoveryPending, setRecoveryPending] = useState(false)
    const [recoveryOptimistic, setRecoveryOptimistic] = useState<boolean | null>(null)

    // 有自定义密码时（both/password）此开关才出现；开启 = both（可设备找回）
    const recoveryOn = vault.mode === 'both'

    // 外部 mode 变化（成功落库）时清除乐观值回到真实值
    useEffect(() => {
        setRecoveryOptimistic(null)
    }, [vault.mode])

    // 开关显示值：乐观值优先（点击即时反馈），无乐观值用真实值
    const switchValue = recoveryOptimistic ?? recoveryOn

    const doToggleRecovery = async (enabled: boolean) => {
        setRecoveryOptimistic(enabled)
        setRecoveryPending(true)
        setActionError(null)
        try {
            await vault.setDeviceRecovery(enabled)
        } catch (e) {
            setRecoveryOptimistic(!enabled)
            setActionError(`操作失败：${String(e instanceof Error ? e.message : e)}`)
        } finally {
            setRecoveryPending(false)
        }
    }

    const handleToggleRecovery = async (enabled: boolean) => {
        // pending 防连点；纯设备锁模式无密码不涉及本开关
        if (recoveryPending || vault.mode === 'device') return
        // 关闭找回 = 放弃忘记密码的恢复通道（此后忘记密码将永久丢失），需明确确认
        if (!enabled) {
            Alert.alert(
                '关闭锁屏密码找回',
                '关闭后，若忘记自定义密码，将无法通过指纹 / 面容 / 锁屏密码重置，加密数据会永久无法访问。确定关闭吗？',
                [
                    { text: '取消', style: 'cancel' },
                    {
                        text: '确定关闭',
                        style: 'destructive',
                        onPress: () => void doToggleRecovery(false),
                    },
                ],
            )
            return
        }
        await doToggleRecovery(true)
    }

    const handleChangePassword = async () => {
        if (newPassword.length < 6 || newPassword !== newConfirm) return
        setBusy(true)
        setActionError(null)
        setDone(false)
        try {
            await vault.changePassword(newPassword)
            setNewPassword('')
            setNewConfirm('')
            setDone(true)
        } catch (e) {
            setActionError(`修改失败：${String(e instanceof Error ? e.message : e)}`)
        } finally {
            setBusy(false)
        }
    }

    const handleRemovePassword = () => {
        Alert.alert(
            '删除自定义密码',
            '删除后本区域将仅使用设备锁（指纹/面容/锁屏密码）解锁。确定删除吗？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: async () => {
                        setRemoveBusy(true)
                        setActionError(null)
                        try {
                            await vault.removePassword()
                            setRemoveDone(true)
                        } catch (e) {
                            setActionError(`删除失败：${String(e instanceof Error ? e.message : e)}`)
                        } finally {
                            setRemoveBusy(false)
                        }
                    },
                },
            ],
        )
    }

    // 未解锁（如从锁屏重置流程进来后失效）→ 回加密区列表
    if (!vault.mk) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <AppHeader onBack={() => goBackOr('/vault')} title="设置" />
                <View style={{ padding: 24 }}>
                    <Text style={styles.errorText}>本区域已锁定，请返回后重新进入</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <AppHeader onBack={() => goBackOr('/vault')} title="设置" />

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {done && (
                    <View style={styles.section}>
                        <View style={styles.doneWrap}>
                            <AppIcon name="mdi:check-circle" size={16} color="#1e8e3e" />
                            <Text style={styles.done}> 密码已更新</Text>
                        </View>
                    </View>
                )}
                {actionError && (
                    <View style={styles.section}>
                        <Text style={styles.errorText}>{actionError}</Text>
                    </View>
                )}

                {/* 密码管理：device 模式为"设置"，有密码为"修改" */}
                <Text style={styles.sectionTitle}>
                    {vault.mode === 'device' ? '设置自定义密码' : '修改自定义密码'}
                </Text>
                <View style={styles.section}>
                    <Text style={styles.label}>新密码（至少 6 位）</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="新密码"
                        placeholderTextColor="#bbb"
                        secureTextEntry
                        autoCapitalize="none"
                        value={newPassword}
                        onChangeText={setNewPassword}
                    />
                    <Text style={styles.label}>确认新密码</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="再次输入新密码"
                        placeholderTextColor="#bbb"
                        secureTextEntry
                        autoCapitalize="none"
                        value={newConfirm}
                        onChangeText={setNewConfirm}
                    />
                    {newPassword.length > 0 && newPassword !== newConfirm && (
                        <Text style={styles.errorText}>两次输入不一致</Text>
                    )}
                    <Pressable
                        style={[styles.button, (newPassword.length < 6 || newPassword !== newConfirm || busy) && styles.disabled]}
                        disabled={newPassword.length < 6 || newPassword !== newConfirm || busy}
                        onPress={() => void handleChangePassword()}
                    >
                        <Text style={styles.buttonText}>{busy ? '更新中…' : '更新密码'}</Text>
                    </Pressable>
                </View>

                {/* 锁屏找回：仅在已设置自定义密码（both/password）且手机支持设备锁时显示；
                    device 模式（未设密码）不显示此开关 */}
                {vault.mode !== 'device' && vault.canUseDevice && (
                    <>
                        <Text style={styles.sectionTitle}>锁屏密码找回</Text>
                        <View style={styles.section}>
                            <View style={styles.switchRow}>
                                <Switch
                                    value={switchValue}
                                    onValueChange={v => void handleToggleRecovery(v)}
                                    disabled={recoveryPending}
                                />
                                <Text style={styles.switchLabel}>
                                    允许用锁屏密码找回
                                </Text>
                            </View>
                            <Text style={styles.switchHint}>
                                {switchValue
                                    ? '开启中：忘记自定义密码时，可用指纹 / 面容 / 锁屏密码验证后重置密码。'
                                    : '已关闭：忘记自定义密码后将无法找回，数据永久无法访问。'}
                            </Text>
                        </View>
                    </>
                )}

                {/* 删除密码（仅存在自定义密码时） */}
                {vault.mode !== 'device' && (
                    <>
                        <Text style={styles.sectionTitle}>删除自定义密码</Text>
                        <View style={styles.section}>
                            <Text style={styles.switchHint}>
                                删除后本区域将仅使用设备锁（指纹 / 面容 / 锁屏密码）解锁。
                                {!vault.canUseDevice ? ' 当前手机未设置锁屏密码，无法删除。' : ''}
                            </Text>
                            <Pressable
                                style={[styles.removeButton, (!vault.canUseDevice || removeBusy) && styles.disabled]}
                                disabled={!vault.canUseDevice || removeBusy}
                                onPress={handleRemovePassword}
                            >
                                <Text style={styles.removeButtonText}>
                                    {removeBusy ? '验证并删除中…' : '删除自定义密码'}
                                </Text>
                            </Pressable>
                            {removeDone && (
                                <View style={styles.doneWrap}>
                                    <AppIcon name="mdi:check-circle" size={16} color="#1e8e3e" />
                                    <Text style={styles.done}> 已删除，现使用设备锁解锁</Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}
