import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SetupFlow } from '@/features/vault/components/setup-flow'
import { UnlockScreen } from '@/features/vault/components/unlock-screen'
import { VaultNoteCard } from '@/features/vault/components/vault-note-card'
import { VaultSettings } from '@/features/vault/components/vault-settings'
import { useVaultNotes } from '@/features/vault/hooks'
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
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 4,
    },
    iconButton: {
        padding: 8,
        minWidth: 40,
        alignItems: 'center',
    },
    iconText: {
        fontSize: 18,
    },
    listContent: {
        paddingTop: 4,
        paddingBottom: 96,
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
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2f6fed',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
    },
    fabText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '600',
        lineHeight: 30,
    },
})

export default function VaultScreen() {
    const vault = useVault()
    const [settingsVisible, setSettingsVisible] = useState(false)

    if (vault.status === 'uninitialized') {
        return <SetupFlow />
    }

    if (vault.status === 'locked' || vault.status === 'unlocking') {
        return <UnlockScreen />
    }

    // ----- 已解锁：加密笔记列表 -----
    return (
        <>
            <VaultList onOpenSettings={() => setSettingsVisible(true)} />
            <VaultSettings
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
            />
        </>
    )
}

function VaultList({ onOpenSettings }: { onOpenSettings: () => void }) {
    const router = useRouter()
    const vault = useVault()
    const { data: notes, isLoading, isError } = useVaultNotes()
    const handleCreate = () => {
    // 惰性新建：进入编辑页，首次输入内容保存时才加密落库
        router.push('/vault-note/new')
    }

    const handleLock = () => {
        vault.lock()
        router.back()
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconButton}>
                    <Text style={styles.iconText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>🔒 加密笔记</Text>
                <View style={styles.headerActions}>
                    <Pressable onPress={handleLock} hitSlop={8} style={styles.iconButton}>
                        <Text style={styles.iconText}>🔓</Text>
                    </Pressable>
                    <Pressable onPress={onOpenSettings} hitSlop={8} style={styles.iconButton}>
                        <Text style={styles.iconText}>⚙️</Text>
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
                                    <VaultNoteCard
                                        title={item.title}
                                        content={item.content}
                                        updatedAt={item.updatedAt}
                                        onPress={() => router.push(`/vault-note/${item.id}`)}
                                    />
                                )}
                                contentContainerStyle={(notes?.length ?? 0) === 0 ? styles.emptyContainer : styles.listContent}
                                ListEmptyComponent={(
                                    <View style={styles.center}>
                                        <Text style={styles.emptyTitle}>加密区还是空的</Text>
                                        <Text style={styles.hint}>点右上角「＋」新建加密笔记</Text>
                                    </View>
                                )}
                            />
                        )}

            <Pressable style={styles.fab} onPress={handleCreate}>
                <Text style={styles.fabText}>＋</Text>
            </Pressable>
        </SafeAreaView>
    )
}
