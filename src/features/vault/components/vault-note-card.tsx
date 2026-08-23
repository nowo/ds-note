import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatRelativeTime } from '@/utils/time'

const WS_RE = /\s+/g

const styles = StyleSheet.create({
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
    pressed: {
        opacity: 0.7,
    },
    header: {
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
        fontSize: 12,
        color: '#999',
    },
    snippet: {
        marginTop: 4,
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
})

interface Props {
    title: string
    content: string
    updatedAt: Date
    onPress: () => void
}

export function VaultNoteCard({ title, content, updatedAt, onPress }: Props) {
    const snippet = content.replace(WS_RE, ' ').trim()
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                    {title.trim() || '无标题'}
                </Text>
                <Text style={styles.time}>{formatRelativeTime(updatedAt)}</Text>
            </View>
            {snippet.length > 0 && (
                <Text style={styles.snippet} numberOfLines={2}>
                    {snippet}
                </Text>
            )}
        </Pressable>
    )
}
