import type { Href } from 'expo-router'
import { router } from 'expo-router'

/**
 * 安全返回上一页：当导航栈为空（例如 App 重载/Fast Refresh 后栈未恢复、
 * 页面直达或成为根路由）时，`router.back()` 会抛出
 * "The action 'GO_BACK' was not handled by any navigator"。
 * 此时回退到指定路由，保证永不报错。
 */
export function goBackOr(fallback: Href) {
    if (router.canGoBack()) {
        router.back()
    } else {
        router.replace(fallback)
    }
}
