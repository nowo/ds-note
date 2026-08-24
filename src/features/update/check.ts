import Constants from 'expo-constants'
import * as WebBrowser from 'expo-web-browser'
import pkg from '../../../package.json'

const GITHUB_REPO_RE = /github\.com[/:]([^/]+)\/([^/.]+)/
const VERSION_PART_RE = /^v/
const SEMVER_PART_RE = /[.-]/

/** 从 package.json 的 repository 字段解析 GitHub 仓库 owner/repo */
export function getGitHubRepo(): string | null {
    const url = pkg.repository?.url ?? ''
    const m = url.match(GITHUB_REPO_RE)
    return m ? `${m[1]}/${m[2]}` : null
}

/** 本地版本号（app.json version，构建时由 tag 注入，如 "1.2.0"） */
export function getCurrentVersion(): string {
    return Constants.expoConfig?.version ?? '0.0.0'
}

/** 语义化版本比较：a > b 返回 1，相等 0，小于 -1（支持 1.2.0 / 1.10.0） */
export function compareVersions(a: string, b: string): number {
    const pa = a.replace(VERSION_PART_RE, '').split(SEMVER_PART_RE).map(Number)
    const pb = b.replace(VERSION_PART_RE, '').split(SEMVER_PART_RE).map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] ?? 0
        const y = pb[i] ?? 0
        if (x > y) return 1
        if (x < y) return -1
    }
    return 0
}

export interface UpdateCheckResult {
    /** 是否有可用更新 */
    hasUpdate: boolean
    /** 最新版本号（去掉 v 前缀） */
    latestVersion: string
    /** 当前版本号 */
    currentVersion: string
    /** Release 下载页 URL */
    releaseUrl: string
}

/**
 * 检查 GitHub Release 是否有新版本。
 * - 请求公开仓库 releases/latest（无需 token）
 * - 任何失败（离线 / GitHub 不可达 / 无 release）返回 null，调用方静默跳过
 */
export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
    const repo = getGitHubRepo()
    if (!repo) return null
    try {
        const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
            headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'ds-note' },
        })
        if (!res.ok) return null
        const data = (await res.json()) as { tag_name?: string, html_url?: string }
        const latestTag = data.tag_name ?? ''
        const latestVersion = latestTag.replace(VERSION_PART_RE, '')
        const currentVersion = getCurrentVersion()
        if (!latestVersion) return null
        return {
            hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
            latestVersion,
            currentVersion,
            releaseUrl: data.html_url ?? `https://github.com/${repo}/releases/latest`,
        }
    } catch {
        return null
    }
}

/** 打开 GitHub Release 下载页（公开下载，无需登录） */
export async function openReleasePage(url: string): Promise<void> {
    await WebBrowser.openBrowserAsync(url)
}
