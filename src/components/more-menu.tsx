import type { ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { AppIcon } from '@/components/app-icon'

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingTop: 8,
        paddingBottom: 28,
        paddingHorizontal: 12,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    itemText: {
        fontSize: 16,
        color: '#222',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#eee',
        marginHorizontal: 10,
    },
    cancel: {
        alignItems: 'center',
        paddingVertical: 13,
        marginTop: 6,
        borderRadius: 12,
    },
    cancelText: {
        fontSize: 16,
        color: '#888',
    },
})

export interface MoreMenuItem {
    key: string
    label: string
    icon: string
    onPress: () => void
}

/**
 * 底部弹出"更多"菜单：从页面右上 ⋯ 点开，列出功能直达入口。
 */
export function MoreMenu({
    visible,
    items,
    onClose,
}: {
    visible: boolean
    items: MoreMenuItem[]
    onClose: () => void
}) {
    const children: ReactNode[] = []
    items.forEach((item, i) => {
        if (i > 0) {
            children.push(<View key={`d${i}`} style={styles.divider} />)
        }
        children.push(
            <Pressable
                key={item.key}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: '#f2f2f2' }]}
                onPress={() => {
                    onClose()
                    item.onPress()
                }}
            >
                <AppIcon name={item.icon} size={20} color="#555" />
                <Text style={styles.itemText}>{item.label}</Text>
            </Pressable>,
        )
    })

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                {/* 内容区：阻止点击冒泡关闭 */}
                <View
                    style={styles.sheet}
                    onStartShouldSetResponder={() => true}
                >
                    {children}
                    <View style={styles.divider} />
                    <Pressable style={styles.cancel} onPress={onClose}>
                        <Text style={styles.cancelText}>取消</Text>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    )
}
