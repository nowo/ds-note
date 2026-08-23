/**
 * 加密区密码学核心：
 * - AES-256-GCM 加密信封：base64(nonce(12B) + ciphertext(含16B tag))
 * - PBKDF2-SHA256 密钥派生（自定义密码 → KEK）
 * - 主密钥（MK）双包装：GCM(KEK密码, MK) 与 GCM(KEK设备, MK)
 *
 * 使用 @noble/ciphers + @noble/hashes（纯 JS，Expo Go 可用），
 * 随机数来自 expo-crypto（RN 无 webcrypto）。
 */
import { gcm } from '@noble/ciphers/aes.js'
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js'
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { getRandomBytes } from 'expo-crypto'

export const KEY_LEN = 32 // 256-bit
export const NONCE_LEN = 12 // GCM 96-bit 推荐长度
export const TAG_LEN = 16
/**
 * PBKDF2 迭代次数：纯 JS 实现（Hermes 比 V8 慢 5-20 倍），
 * 100k 兼顾手机端响应速度；后续换 react-native-quick-crypto（原生 KDF）后可再提高。
 */
export const DEFAULT_PBKDF2_ITERS = 100_000

// ---------- base64（不依赖全局 btoa/atob，兼容 Hermes） ----------

const TRAILING_EQ_RE = /=+$/

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function toBase64(bytes: Uint8Array): string {
    let out = ''
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i]
        const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
        const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
        out += B64_ALPHABET[b0 >> 2]
        out += B64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)]
        out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : '='
        out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 63] : '='
    }
    return out
}

export function fromBase64(input: string): Uint8Array {
    const clean = input.replace(TRAILING_EQ_RE, '')
    const out: number[] = []
    let buffer = 0
    let bits = 0
    for (const ch of clean) {
        const val = B64_ALPHABET.indexOf(ch)
        if (val < 0) continue
        buffer = (buffer << 6) | val
        bits += 6
        if (bits >= 8) {
            bits -= 8
            out.push((buffer >> bits) & 0xFF)
        }
    }
    return new Uint8Array(out)
}

// ---------- AES-256-GCM ----------

function encryptBytes(key: Uint8Array, plain: Uint8Array): string {
    const nonce = getRandomBytes(NONCE_LEN)
    const ct = gcm(key, nonce).encrypt(plain) // 含 16B tag
    const envelope = new Uint8Array(NONCE_LEN + ct.length)
    envelope.set(nonce, 0)
    envelope.set(ct, NONCE_LEN)
    return toBase64(envelope)
}

/** 解密信封；密钥错误或数据被篡改时抛出（GCM 认证失败） */
function decryptBytes(key: Uint8Array, envelopeB64: string): Uint8Array {
    const envelope = fromBase64(envelopeB64)
    if (envelope.length < NONCE_LEN + TAG_LEN) {
        throw new Error('密文格式错误')
    }
    const nonce = envelope.subarray(0, NONCE_LEN)
    const ct = envelope.subarray(NONCE_LEN)
    return gcm(key, nonce).decrypt(ct)
}

export const encryptText = (key: Uint8Array, text: string): string => encryptBytes(key, utf8ToBytes(text))
export const decryptText = (key: Uint8Array, envelopeB64: string): string =>
    bytesToUtf8(decryptBytes(key, envelopeB64))

export const wrapKey = (kek: Uint8Array, mk: Uint8Array): string => encryptBytes(kek, mk)
export const unwrapKey = (kek: Uint8Array, envelopeB64: string): Uint8Array => decryptBytes(kek, envelopeB64)

// ---------- 密钥派生 / 生成 ----------

export function generateMasterKey(): Uint8Array {
    return getRandomBytes(KEY_LEN)
}

export function generateSalt(): Uint8Array {
    return getRandomBytes(16)
}

/**
 * 自定义密码 → KEK（PBKDF2-SHA256，异步版：每 asyncTick 毫秒让出事件循环，
 * 避免手机端纯 JS 派生卡死 UI；派生期间界面应显示"处理中…"）
 */
export async function derivePasswordKey(
    password: string,
    salt: Uint8Array,
    iterations: number,
): Promise<Uint8Array> {
    // 先让出事件循环，确保调用方的"处理中…"状态先绘制出来，再开始计算
    await new Promise(resolve => setTimeout(resolve, 0))
    return pbkdf2Async(sha256, utf8ToBytes(password), salt, {
        c: iterations,
        dkLen: KEY_LEN,
        asyncTick: 10,
    })
}
