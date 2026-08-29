import { getRandomBytes } from 'expo-crypto'
/**
 * 设备密钥与设备认证：
 * - KEK设备 存放在 expo-secure-store（iOS Keychain / Android Keystore），
 *   Android 读取时强制设备认证（requireAuthentication）
 * - 解锁流程先过 LocalAuthentication（指纹/面容/系统PIN），再取 KEK
 */
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { fromBase64, KEY_LEN, toBase64 } from './crypto'

const KEK_DEVICE_KEY = 'dsnote.vault.kek_device'

// 会话内 KEK 缓存：避免每次解锁都读 SecureStore。
// （Android 上 requireAuthentication 的值读取时会再次弹系统认证，
//  与 unlockWithDevice 里的 LocalAuthentication 形成"双指纹"，故移除该标志并用缓存替代。）
let cachedKek: Uint8Array | null = null

/** 设备是否已启用锁屏/生物识别（无锁屏时强制走自定义密码） */
export async function canUseDeviceAuth(): Promise<boolean> {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync()
        const enrolled = await LocalAuthentication.isEnrolledAsync()
        return hasHardware && enrolled
    } catch {
        return false
    }
}

/** 弹出系统验证（指纹/面容/锁屏密码），返回是否通过 */
export async function authenticateDevice(prompt: string): Promise<boolean> {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: prompt,
            cancelLabel: '取消',
            disableDeviceFallback: false, // 允许回退到系统 PIN/密码
        })
        return result.success
    } catch {
        return false
    }
}

/**
 * 读取设备 KEK；不存在则生成并存入安全存储（会话内缓存，避免重复触发认证）。
 *
 * 兼容旧数据：旧版本以 requireAuthentication 写入，Android 上该标志固化在
 * KeyStore entry，读取时每次都会强制系统认证（无自定义文字），与解锁流程的
 * LocalAuthentication 形成"双弹窗"。这里首次读到旧值后用无认证标志重写迁移。
 * 注意：迁移那一次读取仍会弹一次系统认证（须验证身份才能读出旧值），迁移后不再弹。
 */
export async function getOrCreateDeviceKek(): Promise<Uint8Array> {
    if (cachedKek) {
        return cachedKek
    }
    const existing = await SecureStore.getItemAsync(KEK_DEVICE_KEY)
    if (existing) {
        const kek = fromBase64(existing)
        // 无认证标志重写，去掉 KeyStore 的认证要求（身份验证统一由 authenticateDevice 负责）
        try {
            await SecureStore.setItemAsync(KEK_DEVICE_KEY, existing)
        } catch {
            // 重写失败不阻塞解锁：下次读取仍走迁移，功能不受影响
        }
        cachedKek = kek
        return kek
    }
    const kek = getRandomBytes(KEY_LEN)
    await SecureStore.setItemAsync(KEK_DEVICE_KEY, toBase64(kek))
    cachedKek = kek
    return kek
}

/** 仅供测试/调试：删除设备 KEK（会同时使"锁屏找回"失效） */
export async function deleteDeviceKek(): Promise<void> {
    cachedKek = null
    await SecureStore.deleteItemAsync(KEK_DEVICE_KEY)
}
