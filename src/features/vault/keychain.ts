import { getRandomBytes } from 'expo-crypto'
/**
 * 设备密钥与设备认证：
 * - KEK设备 存放在 expo-secure-store（iOS Keychain / Android Keystore），
 *   Android 读取时强制设备认证（requireAuthentication）
 * - 解锁流程先过 LocalAuthentication（指纹/面容/系统PIN），再取 KEK
 */
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { fromBase64, KEY_LEN, toBase64 } from './crypto'

const KEK_DEVICE_KEY = 'dsnote.vault.kek_device'

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

/** 读取设备 KEK；不存在则生成并存入安全存储 */
export async function getOrCreateDeviceKek(): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(KEK_DEVICE_KEY)
    if (existing) {
        return fromBase64(existing)
    }
    const kek = getRandomBytes(KEY_LEN)
    const options: SecureStore.SecureStoreOptions = {}
    if (Platform.OS === 'android') {
    // Android：只有通过设备认证（指纹/PIN）后才能读出该值
        options.requireAuthentication = true
    }
    await SecureStore.setItemAsync(KEK_DEVICE_KEY, toBase64(kek), options)
    return kek
}

/** 仅供测试/调试：删除设备 KEK（会同时使"锁屏找回"失效） */
export async function deleteDeviceKek(): Promise<void> {
    await SecureStore.deleteItemAsync(KEK_DEVICE_KEY)
}
