// 代理调试工具 - 帮助诊断代理 URL 问题
console.log('🔧 代理调试工具已加载');

// 1. 检查 Service Worker 状态
function checkServiceWorker() {
    console.log('\n🔍 检查 Service Worker 状态:');
    
    if ('serviceWorker' in navigator) {
        console.log('✅ 浏览器支持 Service Worker');
        
        if (navigator.serviceWorker.controller) {
            console.log('✅ Service Worker 已激活');
            console.log('- SW 脚本 URL:', navigator.serviceWorker.controller.scriptURL);
            return true;
        } else {
            console.log('❌ Service Worker 未激活');
            
            // 尝试注册 Service Worker
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('✅ Service Worker 注册成功');
                    return navigator.serviceWorker.ready;
                })
                .then(() => {
                    console.log('✅ Service Worker 已就绪');
                    window.location.reload(); // 重新加载页面以激活 SW
                })
                .catch(error => {
                    console.error('❌ Service Worker 注册失败:', error);
                });
            
            return false;
        }
    } else {
        console.log('❌ 浏览器不支持 Service Worker');
        return false;
    }
}

// 2. 设置代理配置并发送到 Service Worker
function setupProxyConfig(apiKey, proxyUrl = 'https://api-proxy.me/gemini') {
    console.log('\n⚙️ 设置代理配置:');
    
    const settings = {
        useCustomApiConfig: true,
        apiProxyUrl: proxyUrl,
        apiKey: apiKey,
        modelId: 'gemini-2.5-flash',
        temperature: 0.7,
        topP: 0.9,
        systemInstruction: '',
        showThoughts: false,
        thinkingBudget: 0,
        language: 'system',
        baseFontSize: 14,
        isStreamingEnabled: true,
        isAutoScrollOnSendEnabled: true,
        isAutoTitleEnabled: true,
        expandCodeBlocksByDefault: false,
        isMermaidRenderingEnabled: true,
        isGraphvizRenderingEnabled: true,
        isAutoSendOnSuggestionClick: true,
        isTranscriptionThinkingEnabled: false,
        transcriptionModelId: 'gemini-2.5-flash',
        ttsVoice: 'Puck',
        themeId: 'system'
    };
    
    localStorage.setItem('app-settings', JSON.stringify(settings));
    console.log('✅ 配置已保存到 localStorage');
    console.log('- 代理 URL:', proxyUrl);
    console.log('- API Key:', apiKey ? '已设置 (' + apiKey.substring(0, 10) + '...)' : '未设置');
    
    // 发送代理 URL 到 Service Worker
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SET_PROXY_URL',
            url: proxyUrl
        });
        console.log('✅ 代理 URL 已发送到 Service Worker');
    } else {
        console.log('⚠️ Service Worker 未激活，无法发送代理 URL');
    }
    
    return settings;
}

// 3. 监听网络请求
function monitorNetworkRequests() {
    console.log('\n🌐 开始监听网络请求:');
    
    // 拦截 fetch 请求
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
            console.log('🔍 检测到 API 请求:', url);
        }
        return originalFetch.apply(this, args);
    };
    
    console.log('✅ 网络请求监听已启用');
}

// 4. 测试 API 调用
async function testApiCall(apiKey) {
    console.log('\n🧪 测试 API 调用:');
    
    if (!apiKey) {
        console.log('❌ 需要 API Key 进行测试');
        return false;
    }
    
    try {
        // 模拟一个简单的模型列表请求
        const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey;
        console.log('📡 发送测试请求到:', testUrl);
        
        const response = await fetch(testUrl);
        console.log('📥 响应状态:', response.status);
        console.log('📥 响应 URL:', response.url);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API 调用成功');
            console.log('📊 返回的模型数量:', data.models ? data.models.length : 0);
            return true;
        } else {
            const errorText = await response.text();
            console.log('❌ API 调用失败:', response.status, errorText);
            
            // 检查是否是地区限制错误
            if (errorText.includes('User location is not supported')) {
                console.log('🚨 检测到地区限制错误 - 代理可能未生效！');
            }
            
            return false;
        }
    } catch (error) {
        console.log('❌ API 调用异常:', error);
        return false;
    }
}

// 5. 完整诊断流程
async function runFullDiagnosis(apiKey) {
    console.log('🚀 开始完整诊断流程...\n');
    
    const swStatus = checkServiceWorker();
    const settings = setupProxyConfig(apiKey);
    monitorNetworkRequests();
    
    // 等待一下让 Service Worker 准备好
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const apiStatus = await testApiCall(apiKey);
    
    console.log('\n📊 诊断结果总结:');
    console.log('================');
    console.log('- Service Worker:', swStatus ? '✅' : '❌');
    console.log('- 代理配置:', settings.apiProxyUrl ? '✅' : '❌');
    console.log('- API 测试:', apiStatus ? '✅' : '❌');
    
    if (!apiStatus && swStatus) {
        console.log('\n🔧 建议的修复步骤:');
        console.log('1. 检查 Service Worker 控制台日志');
        console.log('2. 确认代理服务 https://api-proxy.me/gemini 是否正常');
        console.log('3. 尝试重新加载页面');
        console.log('4. 检查浏览器网络面板中的请求');
    }
    
    return { swStatus, settings, apiStatus };
}

// 6. Service Worker 消息监听
function listenToServiceWorkerMessages() {
    console.log('\n👂 监听 Service Worker 消息:');
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            console.log('📨 收到 SW 消息:', event.data);
        });
        console.log('✅ Service Worker 消息监听已启用');
    }
}

// 导出调试函数
window.ProxyDebugger = {
    checkServiceWorker,
    setupProxyConfig,
    monitorNetworkRequests,
    testApiCall,
    runFullDiagnosis,
    listenToServiceWorkerMessages
};

// 自动启动监听
listenToServiceWorkerMessages();

console.log('\n📖 使用说明:');
console.log('1. 运行完整诊断: ProxyDebugger.runFullDiagnosis("your-api-key")');
console.log('2. 检查 SW 状态: ProxyDebugger.checkServiceWorker()');
console.log('3. 设置代理: ProxyDebugger.setupProxyConfig("your-api-key")');
console.log('4. 测试 API: ProxyDebugger.testApiCall("your-api-key")');
console.log('\n🔧 快速开始: 复制以下命令并替换 API Key');
console.log('ProxyDebugger.runFullDiagnosis("your-gemini-api-key-here");');