import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from '@/components/app-header'
import { NoteCard } from '@/features/notes/components/note-card'
import { useNotesByTag, useTags } from '@/features/tags/hooks'
import { goBackOr } from '@/utils/navigation'

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f6f7f9',
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

export default function TagNotesScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const { data: notes, isLoading, isError } = useNotesByTag(id)
    const { data: tags } = useTags()
    const tagName = tags?.find(t => t.id === id)?.name ?? '标签'

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <AppHeader onBack={() => goBackOr('/')} title={`# ${tagName}`} />

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
                                ListEmptyComponent={(
                                    <View style={styles.center}>
                                        <Text style={styles.emptyTitle}>这个标签下还没有笔记</Text>
                                        <Text style={styles.hint}>去笔记编辑页给它打上这个标签</Text>
                                    </View>
                                )}
                            />
                        )}
        </SafeAreaView>
    )
}
