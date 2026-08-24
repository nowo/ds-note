import type { ReactNode } from 'react'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,

} from 'react'
import { useDbContext } from '@/db/db-provider'
import { deleteMeta, getMeta, setMeta } from './api'
import {
    DEFAULT_PBKDF2_ITERS,
    derivePasswordKey,
    fromBase64,
    generateMasterKey,
    generateSalt,
    toBase64,
    unwrapKey,
    wrapKey,
} from './crypto'
import {
    authenticateDevice,
    canUseDeviceAuth,
    getOrCreateDeviceKek,
} from './keychain'

export type VaultMode = 'device' | 'password' | 'both'
export type VaultStatus = 'uninitialized' | 'locked' | 'unlocking' | 'unlocked'

interface VaultContextValue {
    status: VaultStatus
    mode: VaultMode | null
    mk: Uint8Array | null
    error: string | null
    canUseDevice: boolean
    refresh: () => Promise<void>
    setupDeviceOnly: () => Promise<void>
    setupPassword: (password: string, enableDeviceRecovery: boolean) => Promise<void>
    unlockWithDevice: () => Promise<boolean>
    unlockWithPassword: (password: string) => Promise<boolean>
    lock: () => void
    changePassword: (newPassword: string) => Promise<void>
    removePassword: () => Promise<void>
    resetForgottenPassword: (newPassword: string) => Promise<boolean>
    setDeviceRecovery: (enabled: boolean) => Promise<void>
    clearError: () => void
}

const VaultContext = createContext<VaultContextValue | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
    const db = useDbContext()

    const [status, setStatus] = useState<VaultStatus>('uninitialized')
    const [mode, setMode] = useState<VaultMode | null>(null)
    const [mk, setMk] = useState<Uint8Array | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [canUseDevice, setCanUseDevice] = useState(false)

    const clearError = useCallback(() => setError(null), [])
    const fail = useCallback((msg: string) => {
        setError(msg)
        setStatus('locked')
        return false
    }, [])

    const refresh = useCallback(async () => {
        const storedMode = await getMeta(db, 'mode')
        if (!storedMode) {
            setStatus('uninitialized')
            setMode(null)
        } else {
            setMode(storedMode as VaultMode)
            setStatus('locked')
        }
    }, [db])

    // 初始化：读取元信息 + 探测设备锁可用性
    useEffect(() => {
        void refresh()
        void canUseDeviceAuth().then(setCanUseDevice)
    }, [refresh])

    // 手动锁定（加密区列表的 🔓 按钮）。注意：不再在"回主页/切后台"时自动锁定——
    // 会话内解锁一次后保持解锁，直到 app 进程被杀重开（内存中的主密钥随进程消亡而清空）。
    // 锁定同时设置"跳过自动验证"窗口：锁定瞬间 vault 页面会以 locked 态重渲染出解锁页，
    // 若不跳过，其挂载即自动唤起系统验证弹窗（与"回首页"同时发生，体验异常）。
    const skipAutoAuthUntilRef = useRef(0)
    const lock = useCallback(() => {
        // 锁定后 800ms 内不弹系统验证：锁定瞬间解锁页可能瞬时挂载并自动唤起验证，
        // 与"返回首页"同时出现体验异常；用户正常再次进入（下拉手势+导航动画）必然超过该窗口
        skipAutoAuthUntilRef.current = Date.now() + 800
        setMk(null)
        setStatus(s => (s === 'uninitialized' ? s : 'locked'))
    }, [])

    const setupDeviceOnly = useCallback(async () => {
        setError(null)
        const newMk = generateMasterKey()
        const kek = await getOrCreateDeviceKek()
        await setMeta(db, 'mode', 'device')
        await setMeta(db, 'wrapped_mk_device', wrapKey(kek, newMk))
        setMode('device')
        setMk(newMk)
        setStatus('unlocked')
    }, [db])

    const setupPassword = useCallback(
        async (password: string, enableDeviceRecovery: boolean) => {
            setError(null)
            const newMk = generateMasterKey()
            const salt = generateSalt()
            const iters = DEFAULT_PBKDF2_ITERS
            const kek = await derivePasswordKey(password, salt, iters)
            await setMeta(db, 'kdf_salt', toBase64(salt))
            await setMeta(db, 'kdf_iters', String(iters))
            await setMeta(db, 'wrapped_mk_password', wrapKey(kek, newMk))
            if (enableDeviceRecovery) {
                const deviceKek = await getOrCreateDeviceKek()
                await setMeta(db, 'wrapped_mk_device', wrapKey(deviceKek, newMk))
                await setMeta(db, 'mode', 'both')
                setMode('both')
            } else {
                await setMeta(db, 'mode', 'password')
                setMode('password')
            }
            setMk(newMk)
            setStatus('unlocked')
        },
        [db],
    )

    // 解锁并发锁：防止双触发（如 Android 下拉双 push 出两个解锁页）时弹两次系统验证
    const authInFlightRef = useRef(false)

    const unlockWithDevice = useCallback(async () => {
        // 锁定后短暂窗口内不弹系统验证（见 lock()），消费后即失效
        if (Date.now() < skipAutoAuthUntilRef.current) {
            skipAutoAuthUntilRef.current = 0
            setStatus('locked')
            return false
        }
        if (authInFlightRef.current) return false
        authInFlightRef.current = true
        try {
            setError(null)
            setStatus('unlocking')
            const wrapped = await getMeta(db, 'wrapped_mk_device')
            if (!wrapped) {
                return fail('未开启锁屏密码找回，请使用自定义密码')
            }
            const authed = await authenticateDevice('解锁加密区')
            if (!authed) {
                // 用户取消/返回系统验证：不报错、静默回到锁定态，由解锁页决定返回首页
                setStatus('locked')
                return false
            }
            try {
                const kek = await getOrCreateDeviceKek()
                const newMk = unwrapKey(kek, wrapped)
                setMk(newMk)
                setStatus('unlocked')
                return true
            } catch {
                return fail('设备密钥不可用，请尝试自定义密码')
            }
        } finally {
            authInFlightRef.current = false
        }
    }, [db, fail])

    const unlockWithPassword = useCallback(
        async (password: string) => {
            if (authInFlightRef.current) return false
            authInFlightRef.current = true
            try {
                setError(null)
                setStatus('unlocking')
                const saltB64 = await getMeta(db, 'kdf_salt')
                const wrapped = await getMeta(db, 'wrapped_mk_password')
                if (!saltB64 || !wrapped) {
                    return fail('未设置自定义密码')
                }
                const iters = Number((await getMeta(db, 'kdf_iters')) ?? DEFAULT_PBKDF2_ITERS)
                const kek = await derivePasswordKey(password, fromBase64(saltB64), iters)
                try {
                    const newMk = unwrapKey(kek, wrapped)
                    setMk(newMk)
                    setStatus('unlocked')
                    return true
                } catch {
                    return fail('密码错误')
                }
            } finally {
                authInFlightRef.current = false
            }
        },
        [db, fail],
    )

    const changePassword = useCallback(
        async (newPassword: string) => {
            if (!mk) throw new Error('加密区未解锁')
            const salt = generateSalt()
            const iters = DEFAULT_PBKDF2_ITERS
            const kek = await derivePasswordKey(newPassword, salt, iters)
            await setMeta(db, 'kdf_salt', toBase64(salt))
            await setMeta(db, 'kdf_iters', String(iters))
            await setMeta(db, 'wrapped_mk_password', wrapKey(kek, mk))
            // 设备锁模式设置密码后，模式升级为 both（密码 + 设备均可解锁）
            if (mode === 'device') {
                await setMeta(db, 'mode', 'both')
                setMode('both')
            }
        },
        [db, mk, mode],
    )

    /**
     * 删除自定义密码：删除后仅用设备锁（指纹/面容/锁屏密码）解锁。
     * 前置条件：手机已设置锁屏（canUseDevice），且通过系统验证确认身份；
     * 删除时会确保设备包装存在（无则创建），避免留下无法解锁的状态。
     */
    const removePassword = useCallback(async () => {
        if (!mk) throw new Error('加密区未解锁')
        if (mode === 'device') return // 本来就没有密码
        const authed = await authenticateDevice('确认身份以删除自定义密码')
        if (!authed) throw new Error('验证未通过')
        const deviceKek = await getOrCreateDeviceKek()
        await setMeta(db, 'wrapped_mk_device', wrapKey(deviceKek, mk))
        await deleteMeta(db, 'wrapped_mk_password')
        await deleteMeta(db, 'kdf_salt')
        await deleteMeta(db, 'kdf_iters')
        await setMeta(db, 'mode', 'device')
        setMode('device')
    }, [db, mk, mode])

    const resetForgottenPassword = useCallback(
        async (newPassword: string) => {
            setError(null)
            const wrappedDev = await getMeta(db, 'wrapped_mk_device')
            if (!wrappedDev) {
                setError('未开启锁屏找回，无法重置密码')
                return false
            }
            const authed = await authenticateDevice('验证身份以重置密码')
            if (!authed) {
                setError('验证未通过')
                return false
            }
            try {
                const kek = await getOrCreateDeviceKek()
                const newMk = unwrapKey(kek, wrappedDev)
                const salt = generateSalt()
                const iters = DEFAULT_PBKDF2_ITERS
                const pwKek = await derivePasswordKey(newPassword, salt, iters)
                await setMeta(db, 'kdf_salt', toBase64(salt))
                await setMeta(db, 'kdf_iters', String(iters))
                await setMeta(db, 'wrapped_mk_password', wrapKey(pwKek, newMk))
                // 设备包装仍然存在 → 模式变为 both（设备 + 新密码均可解锁）
                await setMeta(db, 'mode', 'both')
                setMode('both')
                setMk(newMk)
                setStatus('unlocked')
                return true
            } catch {
                setError('设备密钥不可用，重置失败')
                return false
            }
        },
        [db],
    )

    const setDeviceRecovery = useCallback(
        async (enabled: boolean) => {
            if (!mk) throw new Error('加密区未解锁')
            if (enabled) {
                const kek = await getOrCreateDeviceKek()
                await setMeta(db, 'wrapped_mk_device', wrapKey(kek, mk))
                const next: VaultMode = mode === 'device' ? 'device' : 'both'
                await setMeta(db, 'mode', next)
                setMode(next)
            } else {
                // 纯设备锁模式依赖设备包装，不允许关闭；仅 both/password 可关闭
                if (mode === 'device') return
                await deleteMeta(db, 'wrapped_mk_device')
                const next: VaultMode = 'password'
                await setMeta(db, 'mode', next)
                setMode(next)
            }
        },
        [db, mk, mode],
    )

    const value = useMemo<VaultContextValue>(
        () => ({
            status,
            mode,
            mk,
            error,
            canUseDevice,
            refresh,
            setupDeviceOnly,
            setupPassword,
            unlockWithDevice,
            unlockWithPassword,
            lock,
            changePassword,
            removePassword,
            resetForgottenPassword,
            setDeviceRecovery,
            clearError,
        }),
        [
            status,
            mode,
            mk,
            error,
            canUseDevice,
            refresh,
            setupDeviceOnly,
            setupPassword,
            unlockWithDevice,
            unlockWithPassword,
            lock,
            changePassword,
            removePassword,
            resetForgottenPassword,
            setDeviceRecovery,
            clearError,
        ],
    )

    return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault(): VaultContextValue {
    const ctx = useContext(VaultContext)
    if (!ctx) {
        throw new Error('useVault 必须在 <VaultProvider> 内使用')
    }
    return ctx
}
