import type { StyleProp, ViewStyle } from 'react-native'
import { Iconify } from 'react-native-iconify'

interface AppIconProps {
    /** Iconify 图标名，如 mdi:lock */
    name: string
    size?: number
    color?: string
    style?: StyleProp<ViewStyle>
}

/** 统一图标组件：默认 20 / 主题色，封装 react-native-iconify */
export function AppIcon({ name, size = 20, color = '#333', style }: AppIconProps) {
    return <Iconify icon={name} size={size} color={color} style={style} />
}
