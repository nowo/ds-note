import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
    useEmptyTrash,
    usePurgeNote,
    useRestoreNote,
    useTrashNotes,
} from '@/features/notes/hooks'
import { goBackOr } from '@/utils/navigation'
import { formatDateTime } from '@/utils/time'

const WS_RE = /\s+/g

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
    backText: {
        fontSize: 20,
        color: '#333',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    emptyButton: {
        padding: 8,
        minWidth: 44,
        alignItems: 'flex-end',
    },
    emptyText: {
        color: '#c0392b',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyDisabled: {
        color: '#bbb',
        fontSize: 15,
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
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e3e3e3',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    time: {
        fontSize: 11,
        color: '#aaa',
    },
    snippet: {
        marginTop: 4,
        fontSize: 13,
        color: '#888',
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    restoreButton: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2f6fed',
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    restoreText: {
        color: '#2f6fed',
        fontSize: 13,
        fontWeight: '600',
    },
    purgeButton: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0a3a3',
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    purgeText: {
        color: '#c0392b',
        fontSize: 13,
        fontWeight: '600',
    },
})

export default function TrashScreen() {
    const { data: notes, isLoading, isError } = useTrashNotes()
    const restore = useRestoreNote()
    const purge = usePurgeNote()
    const empty = useEmptyTrash()

    const handleRestore = (id: string) => {
        restore.mutate(id)
    }

    const handlePurge = (id: string) => {
        Alert.alert('彻底删除', '删除后无法恢复，确定删除吗？', [
            { text: '取消', style: 'cancel' },
            {
                text: '删除',
                style: 'destructive',
                onPress: () => purge.mutate(id),
            },
        ])
    }

    const handleEmpty = () => {
        const count = notes?.length ?? 0
        if (count === 0) return
        Alert.alert('清空回收站', `将彻底删除 ${count} 条笔记，无法恢复。确定吗？`, [
            { text: '取消', style: 'cancel' },
            {
                text: '清空',
                style: 'destructive',
                onPress: () => empty.mutate(),
            },
        ])
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => goBackOr('/')} hitSlop={8} style={styles.backButton}>
                    <Text style={styles.backText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>回收站</Text>
                <Pressable
                    onPress={handleEmpty}
                    hitSlop={8}
                    style={styles.emptyButton}
                    disabled={(notes?.length ?? 0) === 0}
                >
                    <Text style={[(notes?.length ?? 0) === 0 ? styles.emptyDisabled : styles.emptyText]}>
                        清空
                    </Text>
                </Pressable>
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
                                    <View style={styles.card}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.title} numberOfLines={1}>
                                                {item.title.trim() || '无标题'}
                                            </Text>
                                            <Text style={styles.time}>
                                                {item.deletedAt ? `删除于 ${formatDateTime(item.deletedAt)}` : ''}
                                            </Text>
                                        </View>
                                        {item.content.trim().length > 0 && (
                                            <Text style={styles.snippet} numberOfLines={2}>
                                                {item.content.replace(WS_RE, ' ').trim()}
                                            </Text>
                                        )}
                                        <View style={styles.actions}>
                                            <Pressable
                                                style={styles.restoreButton}
                                                onPress={() => handleRestore(item.id)}
                                            >
                                                <Text style={styles.restoreText}>↩ 恢复</Text>
                                            </Pressable>
                                            <Pressable
                                                style={styles.purgeButton}
                                                onPress={() => handlePurge(item.id)}
                                            >
                                                <Text style={styles.purgeText}>🗑 彻底删除</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                )}
                                contentContainerStyle={
                                    (notes?.length ?? 0) === 0 ? styles.emptyContainer : styles.listContent
                                }
                                ListEmptyComponent={(
                                    <View style={styles.center}>
                                        <Text style={styles.emptyTitle}>回收站是空的</Text>
                                        <Text style={styles.hint}>删除的笔记会出现在这里，可恢复或彻底删除</Text>
                                    </View>
                                )}
                            />
                        )}
        </SafeAreaView>
    )
}
