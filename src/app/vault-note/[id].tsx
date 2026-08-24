import type { ExportFormat } from '@/features/transfer/transfer'
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
import { exportTextFile } from '@/features/transfer/transfer'
import {
    useCreateVaultNote,
    useDeleteVaultNote,
    useUpdateVaultNote,
    useVaultNote,
} from '@/features/vault/hooks'
import { useVault } from '@/features/vault/store'
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
/** 新建占位路由 id（不落库，首次有内容保存时才创建） */
const NEW_ID = 'new'

type SaveState = 'saved' | 'saving' | 'error'

export default function VaultNoteEditorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const vault = useVault()
    const isNew = id === NEW_ID

    const { data: note, isLoading } = useVaultNote(isNew ? '__none__' : id)
    const create = useCreateVaultNote()
    const update = useUpdateVaultNote()
    const remove = useDeleteVaultNote()

    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const createdIdRef = useRef<string | null>(null)

    const latestRef = useRef({ title: '', content: '' })
    latestRef.current = { title, content }

    const saveNow = useCallback(async () => {
        const { title, content } = latestRef.current
        if (isNew) {
            // 全新加密笔记：标题内容都为空 → 不创建、不保存
            if (title.trim().length === 0 && content.trim().length === 0) return
            if (!createdIdRef.current) {
                const created = await create.mutateAsync({ title, content })
                createdIdRef.current = created.id
                router.replace(`/vault-note/${created.id}`)
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
        Alert.alert('删除加密笔记', '确定删除吗？', [
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

    const doExport = async (format: ExportFormat) => {
        const { title, content } = latestRef.current
        try {
            await exportTextFile(title, content, format)
        } catch (e) {
            Alert.alert('导出失败', String(e instanceof Error ? e.message : e))
        }
    }

    const handleExport = () => {
        Alert.alert('导出加密笔记', '导出内容为解密后的明文，选择格式：', [
            { text: '取消', style: 'cancel' },
            { text: 'Markdown (.md)', onPress: () => void doExport('md') },
            { text: '纯文本 (.txt)', onPress: () => void doExport('txt') },
        ])
    }

    // 未解锁：提示先去解锁
    if (!vault.mk) {
        return (
            <View style={styles.center}>
                <Text style={styles.missing}>加密区已锁定</Text>
                <Pressable style={styles.backButton} onPress={() => router.replace('/vault')}>
                    <Text style={styles.backButtonText}>去解锁</Text>
                </Pressable>
            </View>
        )
    }

    if (!isNew && isLoading) {
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
                    <Text style={styles.backButtonText}>返回</Text>
                </Pressable>
            </View>
        )
    }

    const saveLabel
        = saveState === 'saving' ? '加密保存中…' : saveState === 'error' ? '保存失败' : '已加密保存'

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.toolbar}>
                <View style={styles.toolbarLeft}>
                    <Pressable onPress={() => router.back()} hitSlop={8} style={styles.toolbarButton}>
                        <Text style={styles.toolbarText}>←</Text>
                    </Pressable>
                    <Text style={styles.saveStatus}>{saveLabel}</Text>
                </View>
                <View style={styles.toolbarActions}>
                    <Pressable onPress={handleExport} hitSlop={8} style={styles.toolbarButton}>
                        <Text style={styles.toolbarText}>📤</Text>
                    </Pressable>
                    <Pressable onPress={handleDelete} hitSlop={8} style={styles.toolbarButton}>
                        <Text style={styles.deleteText}>🗑</Text>
                    </Pressable>
                </View>
            </View>

            <KeyboardAvoidingView style={styles.editor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                        {' '}
                        · 内容以 AES-256-GCM 加密存储
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
