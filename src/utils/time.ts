/** 相对时间格式化（中文） */
export function formatRelativeTime(ts: Date | number): string {
    const time = typeof ts === 'number' ? ts : ts.getTime()
    const diff = Date.now() - time
    const m = Math.floor(diff / 60_000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m} 分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} 小时前`
    const d = Math.floor(h / 24)
    if (d === 1) return '昨天'
    if (d < 7) return `${d} 天前`
    return new Date(time).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** 完整时间，用于详情页展示 */
export function formatDateTime(ts: Date | number): string {
    const time = typeof ts === 'number' ? ts : ts.getTime()
    return new Date(time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}
