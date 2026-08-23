import { useState } from 'react'
import {
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native'
import { useVault } from '../store'

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 24,
    },
    sheet: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
        marginBottom: 4,
    },
    label: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
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
    errorText: {
        color: '#c0392b',
        fontSize: 13,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
    },
    switchLabel: {
        flex: 1,
        fontSize: 13,
        color: '#555',
    },
    switchDisabled: {
        color: '#aaa',
    },
    closeButton: {
        marginTop: 8,
        alignItems: 'center',
        paddingVertical: 10,
    },
    closeText: {
        color: '#2f6fed',
        fontSize: 15,
    },
})

/** 加密区设置：修改密码、开关锁屏找回 */
export function VaultSettings({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    const vault = useVault()
    const [newPassword, setNewPassword] = useState('')
    const [newConfirm, setNewConfirm] = useState('')
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)

    const close = () => {
        setNewPassword('')
        setNewConfirm('')
        setDone(false)
        setActionError(null)
        onClose()
    }

    const handleChangePassword = async () => {
        if (newPassword.length < 6 || newPassword !== newConfirm) return
        setBusy(true)
        setActionError(null)
        try {
            await vault.changePassword(newPassword)
            setDone(true)
        } catch (e) {
            setActionError(`修改失败：${String(e instanceof Error ? e.message : e)}`)
        } finally {
            setBusy(false)
        }
    }

    const handleToggleRecovery = async (enabled: boolean) => {
        setActionError(null)
        try {
            await vault.setDeviceRecovery(enabled)
        } catch (e) {
            setActionError(`操作失败：${String(e instanceof Error ? e.message : e)}`)
        }
    }

    const recoveryOn = vault.mode === 'both' || vault.mode === 'device'

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <Text style={styles.title}>加密区设置</Text>

                    {done && <Text style={styles.done}>✅ 密码已更新</Text>}
                    {actionError && <Text style={styles.errorText}>{actionError}</Text>}

                    <Text style={styles.label}>修改自定义密码</Text>
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
                    <Pressable
                        style={[styles.button, (newPassword.length < 6 || newPassword !== newConfirm || busy) && styles.disabled]}
                        disabled={newPassword.length < 6 || newPassword !== newConfirm || busy}
                        onPress={handleChangePassword}
                    >
                        <Text style={styles.buttonText}>{busy ? '更新中…' : '更新密码'}</Text>
                    </Pressable>

                    {vault.canUseDevice && (
                        <View style={styles.switchRow}>
                            <Switch
                                value={recoveryOn}
                                onValueChange={handleToggleRecovery}
                                disabled={vault.mode === 'device'}
                            />
                            <Text style={[styles.switchLabel, vault.mode === 'device' && styles.switchDisabled]}>
                                允许用锁屏密码找回（忘记密码时可用设备验证重置）
                                {vault.mode === 'device' ? '（设备锁模式下固定开启）' : ''}
                            </Text>
                        </View>
                    )}

                    <Pressable style={styles.closeButton} onPress={close}>
                        <Text style={styles.closeText}>关闭</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    )
}
