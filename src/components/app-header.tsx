import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AppIcon } from '@/components/app-icon'

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        minHeight: 52,
    },
    side: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    sideRight: {
        justifyContent: 'flex-end',
    },
    center: {
        maxWidth: '60%',
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#111',
        textAlign: 'center',
    },
    backButton: {
        padding: 8,
        minWidth: 44,
    },
})

interface AppHeaderProps {
    /** 左侧返回回调；不传则不显示返回箭头 */
    onBack?: () => void
    /** 返回箭头左侧是否追加额外元素（如加密区的低调锁图标） */
    backExtra?: ReactNode
    /** 中间标题 */
    title?: string
    /** 自定义中间内容（优先于 title） */
    center?: ReactNode
    /** 右侧操作区（图标/按钮；不传则留空占位保证标题居中） */
    right?: ReactNode
}

/** 统一顶栏：左返回（可选追加元素）｜中间内容（标题或自定义）｜右操作，左右等宽使中间严格居中 */
export function AppHeader({ onBack, backExtra, title, center, right }: AppHeaderProps) {
    return (
        <View style={styles.row}>
            <View style={styles.side}>
                {onBack && (
                    <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
                        <AppIcon name="mdi:arrow-left" size={22} color="#333" />
                    </Pressable>
                )}
                {backExtra}
            </View>
            <View style={styles.center}>
                {center ?? (title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null)}
            </View>
            <View style={[styles.side, styles.sideRight]}>{right}</View>
        </View>
    )
}
