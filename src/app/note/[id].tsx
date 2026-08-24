import type { ExportFormat } from '@/features/transfer/transfer'
import { useLocalSearchParams } from 'expo-router'
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
import { AppIcon } from '@/components/app-icon'
import {
    useCreateNote,
    useDeleteNote,
    useNote,
    useUpdateNote,
} from '@/features/notes/hooks'
import { TagPicker } from '@/features/tags/components/tag-picker'
import { useNoteTagIds, useTags } from '@/features/tags/hooks'
import { exportTextFile } from '@/features/transfer/transfer'
import { goBackOr } from '@/utils/navigation'
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
    toolbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toolbarActions: {
        flexDirection: 'row',
        alignItems: 'center',
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
    tagRow: {
        // 普通 View 内容自适应：标签少时一行紧凑，多时换行，不会撑出多余高度
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
        alignItems: 'center',
    },
    tagChip: {
        backgroundColor: '#eef3ff',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#c9d6f2',
    },
    tagChipText: {
        fontSize: 12,
        color: '#2f6fed',
    },
    tagAddChip: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#bbb',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagAddText: {
        fontSize: 12,
        color: '#888',
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
    const isNew = id === NEW_ID

    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const [tagPickerVisible, setTagPickerVisible] = useState(false)
    // 新建笔记首次保存后拿到真实 id：
    // - createdIdRef 同步记录（卸载/防抖闭包立即读到，避免重复创建）
    // - createdId 为 state，驱动数据加载（useNote 按真实 id 重载）
    const [createdId, setCreatedId] = useState<string | null>(null)
    const createdIdRef = useRef<string | null>(null)
    const creatingRef = useRef(false)

    // 数据 id：新建未落库时为占位符；已创建或已有笔记用真实 id
    const dataId = createdId ?? (isNew ? '__none__' : id)

    const { data: note, isLoading } = useNote(dataId)
    const create = useCreateNote()
    const update = useUpdateNote()
    const remove = useDeleteNote()
    const { data: allTags } = useTags()
    const { data: noteTagIds } = useNoteTagIds(dataId)

    // 始终持有最新编辑内容的 ref，供防抖与卸载前保存读取
    const latestRef = useRef({ title: '', content: '' })
    latestRef.current = { title, content }

    const saveNow = useCallback(async () => {
        const { title, content } = latestRef.current
        if (isNew) {
            // 全新笔记：标题内容都为空 → 不创建、不保存
            if (title.trim().length === 0 && content.trim().length === 0) return
            if (!createdIdRef.current) {
                // 创建中防并发：防抖保存与卸载保存可能同时触发
                if (creatingRef.current) return
                creatingRef.current = true
                try {
                    const created = await create.mutateAsync({ title, content })
                    createdIdRef.current = created.id
                    // 不换路由：只记录真实 id，编辑器内容原地保留，避免重挂载闪烁
                    setCreatedId(created.id)
                } finally {
                    creatingRef.current = false
                }
                return
            }
            await update.mutateAsync({ id: createdIdRef.current, title, content })
            return
        }
        await update.mutateAsync({ id, title, content })
    }, [isNew, create, update, id])

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
            goBackOr('/')
            return
        }
        Alert.alert('删除笔记', '删除后可在回收站中找回（后续版本支持），确定删除吗？', [
            { text: '取消', style: 'cancel' },
            {
                text: '删除',
                style: 'destructive',
                onPress: () => {
                    remove.mutate(createdIdRef.current ?? id, {
                        onSuccess: () => goBackOr('/'),
                    })
                },
            },
        ])
    }

    const doExport = async (format: ExportFormat) => {
        const { title, content } = latestRef.current
        try {
            await exportTextFile(title, content, format)
        } catch (e) {
            Alert.alert('导出失败', String(e instanceof Error ? e.message : e))
        }
    }

    const handleExport = () => {
        Alert.alert('导出笔记', '选择导出格式：', [
            { text: '取消', style: 'cancel' },
            { text: 'Markdown (.md)', onPress: () => void doExport('md') },
            { text: '纯文本 (.txt)', onPress: () => void doExport('txt') },
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
                <Pressable onPress={() => goBackOr('/')} style={styles.backButton}>
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
                <View style={styles.toolbarLeft}>
                    <Pressable onPress={() => goBackOr('/')} hitSlop={8} style={styles.toolbarButton}>
                        <AppIcon name="mdi:arrow-left" size={20} color="#333" />
                    </Pressable>
                    <Text style={styles.saveStatus}>{saveLabel}</Text>
                </View>
                <View style={styles.toolbarActions}>
                    <Pressable onPress={handleExport} hitSlop={8} style={styles.toolbarButton}>
                        <AppIcon name="mdi:export" size={20} color="#333" />
                    </Pressable>
                    <Pressable onPress={handleDelete} hitSlop={8} style={styles.toolbarButton}>
                        <AppIcon name="mdi:delete-outline" size={20} color="#c0392b" />
                    </Pressable>
                </View>
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
                {note && (!isNew || createdId) && (
                    <Text style={styles.meta}>
                        创建于
                        {' '}
                        {formatDateTime(note.createdAt)}
                        {' '}
                        · 更新于
                        {formatDateTime(note.updatedAt)}
                    </Text>
                )}
                {(!isNew || createdId) && (
                    <View style={styles.tagRow}>
                        {(allTags ?? [])
                            .filter(t => noteTagIds?.includes(t.id))
                            .map(tag => (
                                <View key={tag.id} style={styles.tagChip}>
                                    <Text style={styles.tagChipText}>{tag.name}</Text>
                                </View>
                            ))}
                        <Pressable style={styles.tagAddChip} onPress={() => setTagPickerVisible(true)}>
                            <AppIcon name="mdi:plus" size={14} color="#2f6fed" />
                            <Text style={styles.tagAddText}> 标签</Text>
                        </Pressable>
                    </View>
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

            {(!isNew || createdId) && (
                <TagPicker
                    visible={tagPickerVisible}
                    noteId={createdId ?? id}
                    onClose={() => setTagPickerVisible(false)}
                />
            )}
        </SafeAreaView>
    )
}
