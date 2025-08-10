// 强制代理测试 - 确保配置正确并测试代理
console.log('🔧 强制代理测试工具');

// 强制设置正确的配置
function forceSetProxyConfig(apiKey) {
    console.log('⚙️ 强制设置代理配置...');
    
    const config = {
        useCustomApiConfig: true,
        apiProxyUrl: 'https://api-proxy.me/gemini',
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
    
    // 强制设置
    localStorage.setItem('app-settings', JSON.stringify(config));
    
    // 验证设置
    const stored = JSON.parse(localStorage.getItem('app-settings'));
    console.log('✅ 配置验证:', {
        useCustomApiConfig: stored.useCustomApiConfig,
        apiProxyUrl: stored.apiProxyUrl,
        hasApiKey: !!stored.apiKey
    });
    
    return stored;
}

// 直接测试代理服务
async function testProxyDirectly(apiKey) {
    console.log('🧪 直接测试代理服务...');
    
    try {
        // 构建代理 URL
        const proxyUrl = 'https://api-proxy.me/gemini';
        const originalUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        // URL 转换逻辑
        const googleApiBase = 'https://generativelanguage.googleapis.com/v1beta';
        const path = originalUrl.substring(googleApiBase.length);
        const normalizedProxyUrl = proxyUrl.endsWith('/v1beta') ? proxyUrl : proxyUrl + '/v1beta';
        const finalUrl = normalizedProxyUrl + path + '?key=' + encodeURIComponent(apiKey);
        
        console.log('📡 URL 转换:', {
            original: originalUrl,
            proxy: finalUrl
        });
        
        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        });
        
        console.log('📥 响应:', {
            status: response.status,
            url: response.url
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 代理测试成功!', {
                modelCount: data.models ? data.models.length : 0
            });
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.log('❌ 代理测试失败:', {
                status: response.status,
                error: errorText
            });
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.log('❌ 代理测试异常:', error);
        return { success: false, error: error.message };
    }
}

// 强制刷新页面配置
function forceRefreshPage() {
    console.log('🔄 强制刷新页面配置...');
    
    // 触发多种事件
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'app-settings',
        newValue: localStorage.getItem('app-settings')
    }));
    
    // 如果有 React 开发工具，尝试触发重新渲染
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('🔧 检测到 React DevTools，尝试触发重新渲染');
    }
    
    console.log('✅ 配置刷新事件已触发');
    console.log('💡 建议：手动刷新页面 (F5) 以确保配置完全生效');
}

// 完整的强制测试流程
async function runForceTest(apiKey) {
    console.log('🚀 开始强制代理测试...\n');
    
    if (!apiKey) {
        console.log('❌ 请提供 API Key');
        return;
    }
    
    // 1. 强制设置配置
    const config = forceSetProxyConfig(apiKey);
    
    // 2. 直接测试代理
    const proxyResult = await testProxyDirectly(apiKey);
    
    // 3. 强制刷新配置
    forceRefreshPage();
    
    console.log('\n📊 强制测试结果:');
    console.log('==================');
    console.log('- 配置强制设置:', config.useCustomApiConfig ? '✅' : '❌');
    console.log('- 直接代理测试:', proxyResult.success ? '✅' : '❌');
    console.log('- 配置刷新:', '✅');
    
    if (proxyResult.success) {
        console.log('\n🎉 代理服务工作正常!');
        console.log('📝 下一步: 刷新页面并观察控制台日志');
        console.log('🔍 查找: "[ModelAPI]" 和 "[ProxyService]" 标记的日志');
    } else {
        console.log('\n⚠️ 代理服务仍然失败');
        console.log('🔍 错误:', proxyResult.error);
    }
    
    return { config, proxyResult };
}

// 导出函数
window.ForceProxyTest = {
    forceSetProxyConfig,
    testProxyDirectly,
    forceRefreshPage,
    runForceTest
};

console.log('\n📖 使用说明:');
console.log('运行强制测试: ForceProxyTest.runForceTest("your-api-key")');
console.log('\n🔧 快速开始:');
console.log('ForceProxyTest.runForceTest("AIzaSyCUduSy8NLnF0hKWjgial1Qtm8YQ6-LKr0");');