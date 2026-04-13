export const apiSettings = {
    settingsApiConfig: { en: 'API Configuration', zh: 'API 配置' },
    settingsUseCustomApi: { en: 'Use Custom API Configuration', zh: '使用自定义 API 配置' },
    settingsApiKey: { en: 'Gemini API Key(s)', zh: 'Gemini API 密钥' },
    settingsApiKeyHelpText: { en: 'You can enter multiple keys, one per line. A key will be used in rotation for each new chat session.', zh: '您可以输入多个密钥，每行一个。每个新聊天会话将轮流使用一个密钥。' },
    apiConfig_default_info: { en: 'Using default API setup from environment. Enable for custom settings.', zh: '正在使用环境中的默认 API 配置。启用以进行自定义设置。' },
    apiConfig_key_placeholder: { en: 'Enter your Gemini API Key(s)', zh: '输入您的 Gemini API 密钥' },
    apiConfig_key_placeholder_disabled: { en: 'Using default', zh: '使用默认值' },
    apiConfig_testConnection: { en: 'Test Connection', zh: '测试连通性' },
    apiConfig_testing: { en: 'Testing...', zh: '测试中...' },
    apiConfig_testSuccess: { en: 'Connection Successful', zh: '连接成功' },
    apiConfig_testFailed: { en: 'Connection Failed', zh: '连接失败' },
    settingsLiveTokenEndpoint: { en: 'Live API Token Endpoint', zh: 'Live API Token 端点' },
    settingsLiveTokenEndpointHelp: {
        en: 'Required for Live API in the browser. Point this to a backend endpoint that returns JSON containing an ephemeral token `name` or `token`.',
        zh: '浏览器中的 Live API 必须配置该项。请填写一个后端端点，它需要返回包含临时令牌 `name` 或 `token` 的 JSON。',
    },
    settingsLiveTokenEndpointPlaceholder: {
        en: 'e.g., https://example.com/api/live-token',
        zh: '例如：https://example.com/api/live-token',
    },
};
