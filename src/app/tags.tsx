import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppIcon } from '@/components/app-icon'
import { useCreateTag, useDeleteTag, useRenameTag, useTags } from '@/features/tags/hooks'
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
    createRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ddd',
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 15,
        color: '#111',
    },
    // 弹窗内输入框：纵向布局下不能带 flex:1，否则高度被撑变形
    modalInput: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ddd',
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 15,
        color: '#111',
    },
    addButton: {
        backgroundColor: '#2f6fed',
        borderRadius: 10,
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    addButtonText: {
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
        paddingHorizontal: 16,
        paddingBottom: 6,
    },
    listContent: {
        paddingTop: 4,
        paddingBottom: 24,
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
    },
    hint: {
        fontSize: 13,
        color: '#999',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e3e3e3',
    },
    rowMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    rowName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#111',
    },
    rowCount: {
        fontSize: 12,
        color: '#999',
    },
    rowAction: {
        padding: 6,
        marginLeft: 6,
    },
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
        gap: 12,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111',
    },
    sheetActions: {
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

export default function TagsScreen() {
    const router = useRouter()
    const { data: tags, isLoading, isError } = useTags()
    const createTag = useCreateTag()
    const renameTag = useRenameTag()
    const deleteTag = useDeleteTag()

    const [newName, setNewName] = useState('')
    const [createError, setCreateError] = useState<string | null>(null)
    // 重命名弹窗
    const [editing, setEditing] = useState<{ id: string, name: string } | null>(null)
    const [editName, setEditName] = useState('')

    const handleCreate = async () => {
        if (newName.trim().length === 0) return
        try {
            await createTag.mutateAsync(newName)
            setNewName('')
            setCreateError(null)
        } catch (e) {
            setCreateError(String(e instanceof Error ? e.message : e))
        }
    }

    const openRename = (id: string, name: string) => {
        setEditing({ id, name })
        setEditName(name)
    }

    const handleRename = async () => {
        if (!editing) return
        try {
            await renameTag.mutateAsync(editing.id, editName)
            setEditing(null)
        } catch (e) {
            Alert.alert('重命名失败', String(e instanceof Error ? e.message : e))
        }
    }

    const handleDelete = (id: string, name: string) => {
        Alert.alert('删除标签', `将删除标签「${name}」，仅解除笔记关联，不影响笔记内容。确定吗？`, [
            { text: '取消', style: 'cancel' },
            {
                text: '删除',
                style: 'destructive',
                onPress: () => deleteTag.mutate(id),
            },
        ])
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => goBackOr('/')} hitSlop={8} style={styles.backButton}>
                    <AppIcon name="mdi:arrow-left" size={20} color="#333" />
                </Pressable>
                <Text style={styles.headerTitle}>标签</Text>
                <View style={styles.headerRight} />
            </View>

            <View style={styles.createRow}>
                <TextInput
                    style={styles.input}
                    placeholder="新标签名，回车添加"
                    placeholderTextColor="#aaa"
                    value={newName}
                    onChangeText={setNewName}
                    onSubmitEditing={() => void handleCreate()}
                    autoCapitalize="none"
                />
                <Pressable
                    style={[styles.addButton, newName.trim().length === 0 && styles.disabled]}
                    disabled={newName.trim().length === 0}
                    onPress={() => void handleCreate()}
                >
                    <Text style={styles.addButtonText}>添加</Text>
                </Pressable>
            </View>
            {createError && <Text style={styles.error}>{createError}</Text>}

            {isLoading
                ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" />
                        </View>
                    )
                : isError
                    ? (
                            <View style={styles.center}>
                                <Text style={styles.hint}>加载失败，请重试</Text>
                            </View>
                        )
                    : (
                            <FlatList
                                data={tags}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <View style={styles.row}>
                                        <Pressable style={styles.rowMain} onPress={() => router.push(`/tag/${item.id}`)}>
                                            <Text style={styles.rowName} numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text style={styles.rowCount}>
                                                {item.count}
                                                {' '}
                                                条
                                            </Text>
                                        </Pressable>
                                        <Pressable onPress={() => openRename(item.id, item.name)} hitSlop={8} style={styles.rowAction}>
                                            <AppIcon name="mdi:pencil" size={18} color="#555" />
                                        </Pressable>
                                        <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={8} style={styles.rowAction}>
                                            <AppIcon name="mdi:delete-outline" size={18} color="#c0392b" />
                                        </Pressable>
                                    </View>
                                )}
                                contentContainerStyle={(tags?.length ?? 0) === 0 ? styles.emptyContainer : styles.listContent}
                                ListEmptyComponent={(
                                    <View style={styles.center}>
                                        <Text style={styles.emptyTitle}>还没有标签</Text>
                                        <Text style={styles.hint}>在上方输入名称创建，或在笔记编辑页打标签</Text>
                                    </View>
                                )}
                            />
                        )}

            <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
                <View style={styles.backdrop}>
                    <View style={styles.sheet}>
                        <Text style={styles.sheetTitle}>重命名标签</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editName}
                            onChangeText={setEditName}
                            autoCapitalize="none"
                            autoFocus
                        />
                        <View style={styles.sheetActions}>
                            <Pressable style={styles.ghostButton} onPress={() => setEditing(null)}>
                                <Text style={styles.ghostText}>取消</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.confirmButton, editName.trim().length === 0 && styles.disabled]}
                                disabled={editName.trim().length === 0}
                                onPress={() => void handleRename()}
                            >
                                <Text style={styles.confirmText}>保存</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}
