import process from 'node:process'
import { getDefaultConfig } from 'expo/metro-config.js'

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(import.meta.dirname ?? process.cwd())

// 让 Metro 解析 .sql 导入（drizzle 迁移包需要，配合 babel inline-import 插件内联为字符串）
config.resolver.sourceExts.push('sql')

// expo-sqlite 的 web 实现（wa-sqlite）需要把 .wasm 作为资源导入
config.resolver.assetExts.push('wasm')

export default config
