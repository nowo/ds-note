/**
 * CI 版本注入：从 git tag（如 v1.2.0）解析版本号，写入 app.json。
 * - version: "1.2.0"（与 Release tag 统一，供 App 内检查更新对比）
 * - android.versionCode: 10200（major*10000 + minor*100 + patch，保证每次递增）
 * 用法：node scripts/set-app-version.mjs（环境变量 VERSION_TAG=v1.2.0）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { process } from 'node:process'

const tag = process.env.VERSION_TAG ?? ''
const match = tag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
if (!match) {
    console.error(`无法从 VERSION_TAG 解析版本号: "${tag}"，应为 v1.2.0 格式`)
    process.exit(1)
}

const [, major, minor, patch] = match.map(Number)
const version = `${major}.${minor}.${patch}`
const versionCode = major * 10000 + minor * 100 + patch

const appJsonPath = resolve('app.json')
const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'))
appJson.expo.version = version
appJson.expo.android = { ...appJson.expo.android, versionCode }

writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 4)}\n`)
console.log(`app.json -> version=${version}, versionCode=${versionCode}`)
