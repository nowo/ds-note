import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppIcon } from '@/components/app-icon'
import { notifyNotesChanged } from '@/data-layer'
import { NoteCard } from '@/features/notes/components/note-card'
import { useCreateNote, useNotes, useSearchNotes } from '@/features/notes/hooks'
import { pickTextFiles } from '@/features/transfer/transfer'
import { checkForUpdate, openReleasePage } from '@/features/update/check'

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
    addButton: {
        backgroundColor: '#2f6fed',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
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
    listArea: {
        flex: 1,
    },
    pullIndicatorWrap: {
        position: 'absolute',
        top: 2,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingVertical: 10,
        zIndex: 10,
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
    const createNote = useCreateNote()

    // 启动静默检查更新：仅首次挂载一次；失败静默跳过（GitHub 不可达/离线不打扰用户）
    const silentCheckDoneRef = useRef(false)
    useEffect(() => {
        if (silentCheckDoneRef.current) return
        silentCheckDoneRef.current = true
        void (async () => {
            const result = await checkForUpdate()
            if (!result?.hasUpdate) return
            Alert.alert(
                '发现新版本',
                `最新版本 ${result.latestVersion}，当前 ${result.currentVersion}。是否前往下载？`,
                [
                    { text: '稍后', style: 'cancel' },
                    {
                        text: '去下载',
                        onPress: () => {
                            void openReleasePage(result.releaseUrl)
                        },
                    },
                ],
            )
        })()
    }, [])

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

    // 下拉交互（按距离判定，替代"按住 3 秒"）：
    // - 下拉距离 ≥ 屏幕高度的 1/3 → 进入加密区
    // - 小于该距离松手 → 刷新列表
    // 标准 RefreshControl 在 Android 上不暴露下拉距离，改用自定义 PanResponder 手势，
    // 跨平台一致：整页跟随下拉移动 + 顶部刷新图标，松手按距离决定去向。
    const { height: screenHeight } = useWindowDimensions()
    // 用 ref 保存阈值，避免 PanResponder 闭包捕获旧值（横竖屏切换时仍正确）
    const vaultDistanceRef = useRef(screenHeight / 3)
    vaultDistanceRef.current = screenHeight / 3
    const pushingRef = useRef(false)
    const scrollOffsetRef = useRef(0)
    const [pulling, setPulling] = useState(false)
    const pullAnim = useRef(new Animated.Value(0)).current

    // 回到主页：复位下拉状态（不再自动锁定加密区——会话内解锁一次后保持解锁，
    // 仅 app 进程被杀重开时内存主密钥清空、才需重新验证）
    useFocusEffect(
        useCallback(() => {
            setPulling(false)
            pullAnim.setValue(0)
        }, [pullAnim]),
    )

    const enterVault = useCallback(() => {
        if (pushingRef.current) return
        pushingRef.current = true
        router.push('/vault')
        setTimeout(() => {
            pushingRef.current = false
        }, 600)
    }, [router])

    const refreshNotes = useCallback(() => {
        notifyNotesChanged()
    }, [])

    // 仿原生下拉手感：橡皮筋阻尼（越拉越费力），松手回弹
    const dampPull = (raw: number) => (raw < 200 ? raw * 0.65 : 130 + (raw - 200) * 0.25)

    const panResponder = useRef(
        PanResponder.create({
            // 顶部区域（标题/搜索框，y < 100）随时可下拉；列表区需已在顶部（正常滚动不受影响）
            onMoveShouldSetPanResponderCapture: (_, g) =>
                (g.y0 < 100 || scrollOffsetRef.current <= 0)
                && g.dy > 8
                && Math.abs(g.dy) > Math.abs(g.dx),
            onPanResponderMove: (_, g) => {
                const dy = Math.max(0, g.dy)
                // 显示用阻尼值（仿原生回弹阻力），判定用真实距离
                pullAnim.setValue(dampPull(dy))
                setPulling(true)
            },
            onPanResponderRelease: (_, g) => {
                const dy = Math.max(0, g.dy)
                if (dy >= vaultDistanceRef.current) {
                    // 进入加密区：直接回弹并跳转
                    setPulling(false)
                    Animated.spring(pullAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start()
                    enterVault()
                } else {
                    // 刷新：转圈保持 ~700ms 再回弹（模拟原生刷新动画）
                    refreshNotes()
                    setTimeout(() => {
                        setPulling(false)
                        Animated.spring(pullAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start()
                    }, 700)
                }
            },
            onPanResponderTerminate: () => {
                setPulling(false)
                pullAnim.setValue(0)
            },
        }),
    ).current

    const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
        scrollOffsetRef.current = e.nativeEvent.contentOffset.y
    }, [])

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
        <SafeAreaView style={styles.safe} edges={['top']} {...panResponder.panHandlers}>
            {/* 下拉转圈：固定在页面最顶部，跟随下拉距离下移 */}
            {pulling && (
                <Animated.View
                    style={[styles.pullIndicatorWrap, { transform: [{ translateY: pullAnim }] }]}
                >
                    <ActivityIndicator size="large" color="#2f6fed" />
                </Animated.View>
            )}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>我的笔记</Text>
                <View style={styles.headerActions}>
                    <Pressable
                        onPress={() => router.push('/tags')}
                        hitSlop={8}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <AppIcon name="mdi:tag" size={20} color="#333" />
                    </Pressable>
                    <Pressable
                        onPress={() => router.push('/trash')}
                        hitSlop={8}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <AppIcon name="mdi:trash-can-outline" size={20} color="#333" />
                    </Pressable>
                    <Pressable
                        onPress={() => router.push('/settings')}
                        hitSlop={8}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <AppIcon name="mdi:cog" size={20} color="#333" />
                    </Pressable>
                    <Pressable
                        onPress={() => void handleImport()}
                        hitSlop={8}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <AppIcon name="mdi:upload-outline" size={20} color="#333" />
                    </Pressable>
                    <Pressable onPress={handleCreate} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                        <AppIcon name="mdi:plus" size={16} color="#fff" />
                        <Text style={styles.addButtonText}> 新建</Text>
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

            {/* 列表区域：页面静态不动，转圈跟随下拉距离下移（Android 原生下拉刷新的样子） */}
            <View style={styles.listArea}>
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
                                    onScroll={handleScroll}
                                    scrollEventThrottle={16}
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
            </View>
        </SafeAreaView>
    )
}
