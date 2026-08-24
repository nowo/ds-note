import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

export type ExportFormat = 'md' | 'txt'

const ILLEGAL_FILENAME_RE = /[\\/:*?"<>|]/g
const WS_RE = /\s+/g
const TEXT_EXT_RE = /\.(txt|text|md)$/i

/** 清理文件名中的非法字符，空标题兜底，限制长度 */
export function sanitizeFileName(name: string): string {
    let cleaned = name.replace(ILLEGAL_FILENAME_RE, '').replace(WS_RE, ' ').trim()
    // 移除控制字符（码点 < 32）
    cleaned = [...cleaned].filter(c => c.charCodeAt(0) >= 32).join('')
    return (cleaned || '无标题').slice(0, 50)
}

/**
 * 导出文本为 .md / .txt 文件并拉起系统分享面板。
 * @param title 笔记标题（仅用于文件名）
 * @param content 导出内容（加密笔记需传解密后的明文）
 */
export async function exportTextFile(
    title: string,
    content: string,
    format: ExportFormat,
): Promise<void> {
    const fileName = `${sanitizeFileName(title)}.${format}`
    if (!(await Sharing.isAvailableAsync())) {
        throw new Error('当前设备不支持分享导出')
    }
    const file = new File(Paths.cache, fileName)
    if (file.exists) {
        file.delete()
    }
    file.create()
    file.write(content)
    await Sharing.shareAsync(file.uri, {
        mimeType: format === 'md' ? 'text/markdown' : 'text/plain',
        dialogTitle: `导出 ${fileName}`,
    })
}

export interface ImportedNote {
    title: string
    content: string
}

/**
 * 弹出系统文件选择器，读取 .txt / .text / .md 文件内容。
 * 其他扩展名会被跳过并计入 skipped。
 */
export async function pickTextFiles(): Promise<{ notes: ImportedNote[], skipped: number }> {
    const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
    })
    if (result.canceled) {
        return { notes: [], skipped: 0 }
    }
    const notes: ImportedNote[] = []
    let skipped = 0
    for (const asset of result.assets) {
        const ext = (asset.name.split('.').pop() ?? '').toLowerCase()
        if (!['txt', 'text', 'md'].includes(ext)) {
            skipped++
            continue
        }
        const title = asset.name.replace(TEXT_EXT_RE, '')
        const content = new File(asset.uri).textSync()
        notes.push({ title: title || '导入的笔记', content })
    }
    return { notes, skipped }
}
