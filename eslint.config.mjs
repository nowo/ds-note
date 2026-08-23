import defineConfig from '@wzo/eslint-config'

// @wzo/eslint-config 已内置本团队风格（4 空格 / 单引号 / 无分号）及规则
export default defineConfig(
    {
        vue: false,
        ignores: [
            '**/dist/**',
            '**/.output/**',
            '**/node_modules/**',
            'demo/**', // 临时杂物，单独处置
        ],
    },
)
