export default function (api) {
    api.cache(true)
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ['inline-import', { extensions: ['.sql'] }],
            [
                'react-native-iconify/babel',
                {
                    icons: [
                        // 界面通用
                        'mdi:arrow-left',
                        'mdi:plus',
                        'mdi:delete',
                        'mdi:delete-outline',
                        'mdi:cog',
                        'mdi:check-circle',
                        // 首页
                        'mdi:tag',
                        'mdi:trash-can-outline',
                        'mdi:import',
                        'mdi:upload-outline',
                        // 加密区
                        'mdi:lock',
                        'mdi:lock-open-variant',
                        'mdi:lock-outline',
                        'mdi:fingerprint',
                        'mdi:eye-off-outline',
                        // 编辑页
                        'mdi:export',
                        'mdi:share-variant-outline',
                        'mdi:restore',
                        'mdi:arrow-u-left-top',
                        'mdi:pencil',
                        'mdi:tray-arrow-down',
                    ],
                },
            ],
        ],
    }
}
