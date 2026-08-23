import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
    useCreateNote,
    useDeleteNote,
    useNote,
    useUpdateNote,
} from '@/features/notes/hooks'
import { formatDateTime } from '@/utils/time'

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#fff',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e3e3e3',
    },
    toolbarButton: {
        padding: 8,
        minWidth: 44,
        alignItems: 'center',
    },
    toolbarText: {
        fontSize: 20,
        color: '#333',
    },
    deleteText: {
        fontSize: 18,
        color: '#c0392b',
    },
    saveStatus: {
        fontSize: 12,
        color: '#999',
    },
    editor: {
        flex: 1,
        paddingHorizontal: 16,
    },
    titleInput: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111',
        paddingVertical: 12,
    },
    meta: {
        fontSize: 12,
        color: '#aaa',
        marginBottom: 8,
    },
    contentInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        color: '#222',
        paddingVertical: 4,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    missing: {
        fontSize: 15,
        color: '#666',
    },
    backButton: {
        backgroundColor: '#2f6fed',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 14,
    },
})

const AUTOSAVE_DELAY = 800
/** 新建占位路由 id（不落库，首次有内容保存时才创建真实笔记） */
const NEW_ID = 'new'

type SaveState = 'saved' | 'saving' | 'error'

export default function NoteEditorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const isNew = id === NEW_ID

    const { data: note, isLoading } = useNote(isNew ? '__none__' : id)
    const create = useCreateNote()
    const update = useUpdateNote()
    const remove = useDeleteNote()

    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [saveState, setSaveState] = useState<SaveState>('saved')
    // 新建笔记首次保存后拿到真实 id；之后所有保存都更新这条
    const createdIdRef = useRef<string | null>(null)

    // 始终持有最新编辑内容的 ref，供防抖与卸载前保存读取
    const latestRef = useRef({ title: '', content: '' })
    latestRef.current = { title, content }

    const saveNow = useCallback(async () => {
        const { title, content } = latestRef.current
        if (isNew) {
            // 全新笔记：标题内容都为空 → 不创建、不保存
            if (title.trim().length === 0 && content.trim().length === 0) return
            if (!createdIdRef.current) {
                const created = await create.mutateAsync({ title, content })
                createdIdRef.current = created.id
                // 路由换成真实 id，避免重载后重复新建
                router.replace(`/note/${created.id}`)
                return
            }
            await update.mutateAsync({ id: createdIdRef.current, title, content })
            return
        }
        await update.mutateAsync({ id, title, content })
    }, [isNew, create, update, id, router])

    const saveNowWithState = useCallback(async () => {
        setSaveState('saving')
        try {
            await saveNow()
            setSaveState('saved')
        } catch {
            setSaveState('error')
        }
    }, [saveNow])

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const scheduleSave = useCallback(() => {
        setSaveState('saving')
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            timerRef.current = null
            void saveNowWithState()
        }, AUTOSAVE_DELAY)
    }, [saveNowWithState])

    // 已有笔记：数据加载后填充编辑器
    useEffect(() => {
        if (note) {
            setTitle(note.title)
            setContent(note.content)
        }
    }, [note])

    // 离开页面/卸载前强制保存未落盘内容（空笔记不会创建）
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            void saveNow()
        }
    }, [saveNow])

    const handleDelete = () => {
    // 新建且尚未落库：直接返回，不产生任何数据
        if (isNew && !createdIdRef.current) {
            router.back()
            return
        }
        Alert.alert('删除笔记', '删除后可在回收站中找回（后续版本支持），确定删除吗？', [
            { text: '取消', style: 'cancel' },
            {
                text: '删除',
                style: 'destructive',
                onPress: () => {
                    remove.mutate(id, {
                        onSuccess: () => router.back(),
                    })
                },
            },
        ])
    }

    const needsLoading = !isNew && isLoading

    if (needsLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    if (!isNew && !note) {
        return (
            <View style={styles.center}>
                <Text style={styles.missing}>笔记不存在或已被删除</Text>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>返回列表</Text>
                </Pressable>
            </View>
        )
    }

    const saveLabel
        = saveState === 'saving' ? '保存中…' : saveState === 'error' ? '保存失败' : '已保存'

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.toolbar}>
                <Pressable onPress={() => router.back()} hitSlop={8} style={styles.toolbarButton}>
                    <Text style={styles.toolbarText}>←</Text>
                </Pressable>
                <Text style={styles.saveStatus}>{saveLabel}</Text>
                <Pressable onPress={handleDelete} hitSlop={8} style={styles.toolbarButton}>
                    <Text style={styles.deleteText}>🗑</Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                style={styles.editor}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TextInput
                    style={styles.titleInput}
                    placeholder="标题"
                    placeholderTextColor="#bbb"
                    value={title}
                    onChangeText={(t) => {
                        setTitle(t)
                        scheduleSave()
                    }}
                />
                {!isNew && note && (
                    <Text style={styles.meta}>
                        创建于
                        {' '}
                        {formatDateTime(note.createdAt)}
                        {' '}
                        · 更新于
                        {formatDateTime(note.updatedAt)}
                    </Text>
                )}
                <TextInput
                    style={styles.contentInput}
                    placeholder="开始输入内容…"
                    placeholderTextColor="#bbb"
                    value={content}
                    onChangeText={(t) => {
                        setContent(t)
                        scheduleSave()
                    }}
                    multiline
                    textAlignVertical="top"
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
