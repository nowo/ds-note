import { Stack } from 'expo-router'
import { DbProvider } from '@/db/db-provider'
import { MigrationsGate } from '@/db/migrations-gate'
import { VaultProvider } from '@/features/vault/store'

/** 模块级常量，引用稳定，避免导航器因 options 引用变化反复重渲染 */
const screenOptions = { headerShown: false } as const

export default function RootLayout() {
    return (
        <DbProvider>
            <MigrationsGate>
                <VaultProvider>
                    <Stack screenOptions={screenOptions}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="note/[id]" />
                        <Stack.Screen name="vault" />
                        <Stack.Screen name="vault-note/[id]" />
                    </Stack>
                </VaultProvider>
            </MigrationsGate>
        </DbProvider>
    )
}
