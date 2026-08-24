import { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { useNotes } from '@/features/notes/hooks'
import { useMoveNoteToVault } from '../hooks'

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
        maxHeight: '75%',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    subtitle: {
        fontSize: 12,
        color: '#888',
    },
    list: {
        flexGrow: 0,
    },
    center: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    check: {
        fontSize: 18,
        color: '#bbb',
    },
    checkOn: {
        color: '#2f6fed',
    },
    rowTitle: {
        flex: 1,
        fontSize: 15,
        color: '#222',
    },
    empty: {
        fontSize: 13,
        color: '#999',
        paddingVertical: 20,
        textAlign: 'center',
    },
    error: {
        fontSize: 12,
        color: '#c0392b',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'flex-end',
    },
    ghostButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    ghostText: {
        color: '#555',
        fontSize: 15,
    },
    confirmButton: {
        backgroundColor: '#2f6fed',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    confirmText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.4,
    },
})

/**
 * 从普通笔记中多选，移入加密区（移动语义：普通笔记被删除）。
 * 仅在加密区已解锁时使用（主密钥可用）。
 */
export function NormalNotesPicker({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    const { data: notes, isLoading } = useNotes()
    const moveToVault = useMoveNoteToVault()

    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (visible) {
            setSelected(new Set())
            setError(null)
        }
    }, [visible])

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleConfirm = async () => {
        if (selected.size === 0) return
        setBusy(true)
        setError(null)
        try {
            for (const id of selected) {
                await moveToVault.mutateAsync(id)
            }
            onClose()
        } catch (e) {
            setError(String(e instanceof Error ? e.message : e))
        } finally {
            setBusy(false)
        }
    }

    const available = (notes ?? []).filter(n => n.content.trim().length > 0 || n.title.trim().length > 0)

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <Text style={styles.title}>移入加密区</Text>
                    <Text style={styles.subtitle}>选择普通笔记（移动后将从普通列表移除，内容加密存储）</Text>

                    {isLoading
                        ? (
                                <View style={styles.center}>
                                    <ActivityIndicator size="large" />
                                </View>
                            )
                        : (
                                <ScrollView style={styles.list}>
                                    {available.map((note) => {
                                        const on = selected.has(note.id)
                                        return (
                                            <Pressable key={note.id} style={styles.row} onPress={() => toggle(note.id)}>
                                                <Text style={[styles.check, on && styles.checkOn]}>{on ? '☑' : '☐'}</Text>
                                                <Text style={styles.rowTitle} numberOfLines={1}>
                                                    {note.title.trim() || '无标题'}
                                                </Text>
                                            </Pressable>
                                        )
                                    })}
                                    {available.length === 0 && (
                                        <Text style={styles.empty}>没有可移入的普通笔记</Text>
                                    )}
                                </ScrollView>
                            )}

                    {error && <Text style={styles.error}>{error}</Text>}

                    <View style={styles.actions}>
                        <Pressable style={styles.ghostButton} onPress={onClose} disabled={busy}>
                            <Text style={styles.ghostText}>取消</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.confirmButton, (selected.size === 0 || busy) && styles.disabled]}
                            disabled={selected.size === 0 || busy}
                            onPress={() => void handleConfirm()}
                        >
                            <Text style={styles.confirmText}>{busy ? '移入中…' : `移入 ${selected.size} 条`}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    )
}
