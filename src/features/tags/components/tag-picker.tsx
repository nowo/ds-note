import { useEffect, useState } from 'react'
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { useCreateTag, useNoteTagIds, useSetNoteTags, useTags } from '../hooks'

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
        maxHeight: '70%',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    list: {
        flexGrow: 0,
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
    tagName: {
        flex: 1,
        fontSize: 15,
        color: '#222',
    },
    tagCount: {
        fontSize: 12,
        color: '#999',
    },
    empty: {
        fontSize: 13,
        color: '#999',
        paddingVertical: 12,
        textAlign: 'center',
    },
    createRow: {
        flexDirection: 'row',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#f6f7f9',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 15,
        color: '#111',
    },
    smallButton: {
        backgroundColor: '#2f6fed',
        borderRadius: 10,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    smallButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.4,
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
        paddingHorizontal: 24,
    },
    confirmText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
})

/**
 * 笔记标签选择弹窗：勾选已有标签 + 输入框新建标签。
 * 确认后覆盖保存该笔记的标签集合。
 */
export function TagPicker({ visible, noteId, onClose }: { visible: boolean, noteId: string, onClose: () => void }) {
    const { data: allTags } = useTags()
    const { data: currentIds } = useNoteTagIds(noteId)
    const createTag = useCreateTag()
    const setNoteTags = useSetNoteTags()

    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [newName, setNewName] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 打开时同步当前已选标签
    useEffect(() => {
        if (visible && currentIds) {
            setSelected(new Set(currentIds))
            setNewName('')
            setError(null)
        }
    }, [visible, currentIds])

    const toggle = (tagId: string) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(tagId)) {
                next.delete(tagId)
            } else {
                next.add(tagId)
            }
            return next
        })
    }

    const handleCreate = async () => {
        if (newName.trim().length === 0) return
        try {
            const tag = await createTag.mutateAsync(newName)
            setSelected(prev => new Set(prev).add(tag.id))
            setNewName('')
            setError(null)
        } catch (e) {
            setError(String(e instanceof Error ? e.message : e))
        }
    }

    const handleConfirm = async () => {
        setBusy(true)
        try {
            await setNoteTags.mutateAsync(noteId, [...selected])
            onClose()
        } catch (e) {
            setError(String(e instanceof Error ? e.message : e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <Text style={styles.title}>标签</Text>

                    <ScrollView style={styles.list}>
                        {(allTags ?? []).map((tag) => {
                            const on = selected.has(tag.id)
                            return (
                                <Pressable key={tag.id} style={styles.row} onPress={() => toggle(tag.id)}>
                                    <Text style={[styles.check, on && styles.checkOn]}>{on ? '☑' : '☐'}</Text>
                                    <Text style={styles.tagName} numberOfLines={1}>
                                        {tag.name}
                                        <Text style={styles.tagCount}>
                                            {' '}
                                            (
                                            {tag.count}
                                            )
                                        </Text>
                                    </Text>
                                </Pressable>
                            )
                        })}
                        {(allTags?.length ?? 0) === 0 && (
                            <Text style={styles.empty}>还没有标签，在下方输入新建</Text>
                        )}
                    </ScrollView>

                    <View style={styles.createRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="新标签名"
                            placeholderTextColor="#aaa"
                            value={newName}
                            onChangeText={setNewName}
                            onSubmitEditing={() => void handleCreate()}
                            autoCapitalize="none"
                        />
                        <Pressable
                            style={[styles.smallButton, newName.trim().length === 0 && styles.disabled]}
                            disabled={newName.trim().length === 0}
                            onPress={() => void handleCreate()}
                        >
                            <Text style={styles.smallButtonText}>添加</Text>
                        </Pressable>
                    </View>

                    {error && <Text style={styles.error}>{error}</Text>}

                    <View style={styles.actions}>
                        <Pressable style={styles.ghostButton} onPress={onClose}>
                            <Text style={styles.ghostText}>取消</Text>
                        </Pressable>
                        <Pressable style={styles.confirmButton} disabled={busy} onPress={() => void handleConfirm()}>
                            <Text style={styles.confirmText}>{busy ? '保存中…' : '保存'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    )
}
