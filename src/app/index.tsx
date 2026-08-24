import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { notifyNotesChanged } from '@/data-layer'
import { NoteCard } from '@/features/notes/components/note-card'
import { useCreateNote, useNotes, useSearchNotes } from '@/features/notes/hooks'
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
    searchWrap: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ddd',
        paddingHorizontal: 14,
        paddingVertical: 9,
        fontSize: 15,
        color: '#111',
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
    const createNote = useCreateNote()

    // 搜索：输入防抖 300ms
    const [query, setQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onChangeQuery = (text: string) => {
        setQuery(text)
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        searchTimerRef.current = setTimeout(() => {
            setDebouncedQuery(text.trim())
        }, 300)
    }
    const searching = debouncedQuery.length > 0
    const normal = useNotes()
    const search = useSearchNotes(debouncedQuery)
    const { data: notes, isLoading, isError } = searching ? search : normal

    // 下拉交互：
    // - 按住 ≥3 秒 → 进入加密区（计时器触发；Android 事件缺失时由 onRefresh 兜底判定）
    // - 提前松手 → 正常下拉刷新列表（RefreshControl）
    const VAULT_HOLD_MS = 3000
    const pushingRef = useRef(false)
    const vaultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const vaultTriggeredRef = useRef(false)
    const touchStartRef = useRef(0)
    const [refreshing, setRefreshing] = useState(false)

    // 回到主页时自动锁定加密区（"返回主页即重新锁定"），并复位下拉计时状态
    useFocusEffect(
        useCallback(() => {
            vault.lock()
            vaultTriggeredRef.current = false
            touchStartRef.current = 0
        }, [vault.lock]),
    )

    const enterVault = useCallback(() => {
        if (pushingRef.current) return
        pushingRef.current = true
        vaultTriggeredRef.current = true
        router.push('/vault')
        setTimeout(() => {
            pushingRef.current = false
        }, 600)
    }, [router])

    const clearVaultTimer = useCallback(() => {
        if (vaultTimerRef.current) {
            clearTimeout(vaultTimerRef.current)
            vaultTimerRef.current = null
        }
    }, [])

    // 任何触摸开始都记录时间（作为按住时长的起点）
    const handleTouchStart = useCallback(() => {
        touchStartRef.current = Date.now()
    }, [])

    // 列表在顶部开始拖动（下拉）时启动 3 秒计时
    const handleScrollBeginDrag = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
        if (e.nativeEvent.contentOffset.y <= 0 && !vaultTriggeredRef.current) {
            if (touchStartRef.current === 0) touchStartRef.current = Date.now()
            clearVaultTimer()
            vaultTimerRef.current = setTimeout(() => {
                vaultTimerRef.current = null
                enterVault()
            }, VAULT_HOLD_MS)
        }
    }, [clearVaultTimer, enterVault])

    // 松手/滚动结束：取消计时（<3 秒松手走 onRefresh 刷新）
    const handleScrollEndDrag = useCallback(() => {
        clearVaultTimer()
    }, [clearVaultTimer])

    // 松手时必然触发：按"触摸开始到松手"的时长判定
    const handleRefresh = useCallback(() => {
        clearVaultTimer()
        if (vaultTriggeredRef.current) return
        const held = Date.now() - (touchStartRef.current || Date.now())
        if (held >= VAULT_HOLD_MS) {
            enterVault()
            return
        }
        setRefreshing(true)
        notifyNotesChanged()
        setTimeout(setRefreshing, 600, false)
    }, [clearVaultTimer, enterVault])

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
                        onPress={() => router.push('/tags')}
                        hitSlop={8}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <Text style={styles.iconText}>#</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => router.push('/trash')}
                        hitSlop={8}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <Text style={styles.iconText}>🗑</Text>
                    </Pressable>
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

            <View style={styles.searchWrap}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="搜索笔记…"
                    placeholderTextColor="#aaa"
                    value={query}
                    onChangeText={onChangeQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
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
                                onTouchStart={handleTouchStart}
                                onScrollBeginDrag={handleScrollBeginDrag}
                                onScrollEndDrag={handleScrollEndDrag}
                                refreshControl={(
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={handleRefresh}
                                    />
                                )}
                                ListEmptyComponent={(
                                    <View style={styles.center}>
                                        {searching
                                            ? (
                                                    <>
                                                        <Text style={styles.emptyTitle}>无匹配结果</Text>
                                                        <Text style={styles.hint}>换个关键词试试</Text>
                                                    </>
                                                )
                                            : (
                                                    <>
                                                        <Text style={styles.emptyTitle}>还没有笔记</Text>
                                                        <Text style={styles.hint}>点击右上角「＋ 新建」开始记录</Text>
                                                    </>
                                                )}
                                    </View>
                                )}
                            />
                        )}
        </SafeAreaView>
    )
}
