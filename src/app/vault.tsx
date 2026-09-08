import type { MoreMenuItem } from '@/components/more-menu'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppHeader } from '@/components/app-header'
import { AppIcon } from '@/components/app-icon'
import { MoreMenu } from '@/components/more-menu'
import { NormalNotesPicker } from '@/features/vault/components/normal-notes-picker'
import { SetupFlow } from '@/features/vault/components/setup-flow'
import { UnlockScreen } from '@/features/vault/components/unlock-screen'
import { VaultNoteCard } from '@/features/vault/components/vault-note-card'
import { useVaultNotes } from '@/features/vault/hooks'
import { useVault } from '@/features/vault/store'
import { goBackOr } from '@/utils/navigation'

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f6f7f9',
    },
    headerLock: {
        marginLeft: 4,
        opacity: 0.55,
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
})

export default function VaultScreen() {
    const vault = useVault()

    if (vault.status === 'uninitialized') {
        return <SetupFlow />
    }

    if (vault.status === 'locked' || vault.status === 'unlocking') {
        return <UnlockScreen />
    }

    // ----- 已解锁：加密笔记列表 -----
    return <VaultList />
}

function VaultList() {
    const router = useRouter()
    const vault = useVault()
    const { data: notes, isLoading, isError } = useVaultNotes()
    const [importVisible, setImportVisible] = useState(false)
    const [moreVisible, setMoreVisible] = useState(false)
    const handleCreate = () => {
    // 惰性新建：进入编辑页，首次输入内容保存时才加密落库
        router.push('/vault-note/new')
    }

    const handleLock = () => {
        // 先回首页再锁定：避免 vault 页面以 locked 态重渲染出解锁页时
        // 自动唤起系统验证（与回首页同时弹出验证窗口的体验问题）
        goBackOr('/')
        vault.lock()
    }

    const menuItems: MoreMenuItem[] = [
        { key: 'import', label: '移入笔记', icon: 'mdi:import', onPress: () => setImportVisible(true) },
        { key: 'lock', label: '锁定', icon: 'mdi:lock-open-variant', onPress: handleLock },
        { key: 'settings', label: '设置', icon: 'mdi:cog', onPress: () => router.push('/vault-settings') },
    ]

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <AppHeader
                onBack={() => goBackOr('/')}
                backExtra={<AppIcon name="mdi:lock" size={16} color="#111" style={styles.headerLock} />}
                right={(
                    <Pressable onPress={() => setMoreVisible(true)} hitSlop={8} style={{ padding: 4 }}>
                        <AppIcon name="mdi:dots-horizontal" size={24} color="#333" />
                    </Pressable>
                )}
            />

            <NormalNotesPicker
                visible={importVisible}
                onClose={() => setImportVisible(false)}
            />

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
                                        <Text style={styles.emptyTitle}>这里还没有笔记</Text>
                                        <Text style={styles.hint}>点右下角 ＋ 新建</Text>
                                    </View>
                                )}
                            />
                        )}

            <Pressable style={styles.fab} onPress={handleCreate}>
                <AppIcon name="mdi:plus" size={28} color="#fff" />
            </Pressable>

            <MoreMenu
                visible={moreVisible}
                items={menuItems}
                onClose={() => setMoreVisible(false)}
            />
        </SafeAreaView>
    )
}
