import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NoteCard } from '@/features/notes/components/note-card'
import { useCreateNote, useNotes } from '@/features/notes/hooks'
import { pickTextFiles } from '@/features/transfer/transfer'
import { useVault } from '@/features/vault/store'

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f6f7f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        padding: 6,
    },
    iconText: {
        fontSize: 20,
    },
    addButton: {
        backgroundColor: '#2f6fed',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    pressed: {
        opacity: 0.7,
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
})

export default function NotesListScreen() {
    const router = useRouter()
    const vault = useVault()
    const { data: notes, isLoading, isError } = useNotes()
    const createNote = useCreateNote()

    // 回到主页时自动锁定加密区（"返回主页即重新锁定"）
    useFocusEffect(
        useCallback(() => {
            vault.lock()
        }, [vault.lock]),
    )

    // 整个列表页下拉 → 松开直接进入加密区（透明 RefreshControl，无任何可见提示）
    // 防抖：Android 的 RefreshControl.onRefresh 偶发双触发，避免重复 push 出两个 vault 页面
    const pushingRef = useRef(false)
    const enterVault = useCallback(() => {
        if (pushingRef.current) return
        pushingRef.current = true
        router.push('/vault')
        setTimeout(() => {
            pushingRef.current = false
        }, 600)
    }, [router])

    const handleCreate = () => {
    // 惰性新建：不立即落库，进入编辑页，首次输入内容保存时才创建
        router.push('/note/new')
    }

    const handleImport = async () => {
        try {
            const { notes: imported, skipped } = await pickTextFiles()
            if (imported.length === 0) {
                if (skipped > 0) {
                    Alert.alert('导入', `没有可导入的 .txt/.text/.md 文件（跳过了 ${skipped} 个）`)
                }
                return
            }
            for (const n of imported) {
                await createNote.mutateAsync(n)
            }
            Alert.alert(
                '导入完成',
                `已导入 ${imported.length} 条笔记${skipped > 0 ? `，跳过 ${skipped} 个不支持的文件` : ''}`,
            )
        } catch (e) {
            Alert.alert('导入失败', String(e instanceof Error ? e.message : e))
        }
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>我的笔记</Text>
                <View style={styles.headerActions}>
                    <Pressable
                        onPress={() => void handleImport()}
                        hitSlop={8}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <Text style={styles.iconText}>📥</Text>
                    </Pressable>
                    <Pressable onPress={handleCreate} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                        <Text style={styles.addButtonText}>＋ 新建</Text>
                    </Pressable>
                </View>
            </View>

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
                                data={notes}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <NoteCard note={item} onPress={() => router.push(`/note/${item.id}`)} />
                                )}
                                contentContainerStyle={(notes?.length ?? 0) === 0 ? styles.emptyContainer : styles.listContent}
                                refreshControl={(
                                    <RefreshControl
                                        refreshing={false}
                                        onRefresh={enterVault}
                                        tintColor="transparent"
                                        colors={['transparent']}
                                        progressBackgroundColor="transparent"
                                    />
                                )}
                                ListEmptyComponent={(
                                    <View style={styles.center}>
                                        <Text style={styles.emptyTitle}>还没有笔记</Text>
                                        <Text style={styles.hint}>点击右上角「＋ 新建」开始记录</Text>
                                    </View>
                                )}
                            />
                        )}
        </SafeAreaView>
    )
}
