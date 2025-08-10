// 最终调试脚本 - 确保代理服务正确工作
console.log('🔧 最终代理调试工具');

// 1. 检查和设置配置
function setupAndVerifyConfig(apiKey) {
    console.log('\n⚙️ 设置和验证配置:');
    
    const settings = {
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
    
    localStorage.setItem('app-settings', JSON.stringify(settings));
    
    // 验证设置
    const stored = JSON.parse(localStorage.getItem('app-settings'));
    console.log('✅ 配置已设置:');
    console.log('  - useCustomApiConfig:', stored.useCustomApiConfig);
    console.log('  - apiProxyUrl:', stored.apiProxyUrl);
    console.log('  - apiKey:', stored.apiKey ? '已设置' : '未设置');
    
    return stored;
}

// 2. 测试代理服务逻辑
async function testProxyServiceLogic(apiKey) {
    console.log('\n🧪 测试代理服务逻辑:');
    
    try {
        // 模拟 proxyService.getModels 的逻辑
        const proxyUrl = 'https://api-proxy.me/gemini';
        const url = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        // 构建代理 URL
        const googleApiBase = 'https://generativelanguage.googleapis.com/v1beta';
        const path = url.substring(googleApiBase.length);
        const normalizedProxyUrl = proxyUrl.endsWith('/v1beta') ? proxyUrl : proxyUrl + '/v1beta';
        const finalUrl = normalizedProxyUrl + path;
        
        console.log('📡 URL 转换:');
        console.log('  原始:', url);
        console.log('  代理:', finalUrl);
        
        // 添加 API Key
        const urlWithKey = finalUrl + '?key=' + encodeURIComponent(apiKey);
        console.log('  最终:', urlWithKey);
        
        // 发送请求
        console.log('\n📤 发送代理请求...');
        const response = await fetch(urlWithKey, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit'
        });
        
        console.log('📥 响应状态:', response.status);
        console.log('📥 响应 URL:', response.url);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 代理服务测试成功!');
            console.log('📊 模型数量:', data.models ? data.models.length : 0);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.log('❌ 代理服务测试失败:', response.status);
            console.log('📄 错误详情:', errorText);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.log('❌ 代理服务测试异常:', error.message);
        return { success: false, error: error.message };
    }
}

// 3. 强制刷新应用配置
function forceRefreshApp() {
    console.log('\n🔄 强制刷新应用配置:');
    
    // 触发存储事件
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'app-settings',
        newValue: localStorage.getItem('app-settings')
    }));
    
    console.log('✅ 已触发配置刷新事件');
    console.log('💡 建议刷新页面以确保配置生效');
}

// 4. 完整测试流程
async function runCompleteTest(apiKey) {
    console.log('🚀 开始完整测试流程...\n');
    
    if (!apiKey) {
        console.log('❌ 请提供 API Key');
        return;
    }
    
    // 步骤 1: 设置配置
    const config = setupAndVerifyConfig(apiKey);
    
    // 步骤 2: 测试代理服务
    const proxyResult = await testProxyServiceLogic(apiKey);
    
    // 步骤 3: 刷新配置
    forceRefreshApp();
    
    // 总结
    console.log('\n📊 测试结果总结:');
    console.log('================');
    console.log('- 配置设置:', config.useCustomApiConfig ? '✅' : '❌');
    console.log('- 代理测试:', proxyResult.success ? '✅' : '❌');
    console.log('- 配置刷新:', '✅');
    
    if (proxyResult.success) {
        console.log('\n🎉 代理服务工作正常!');
        console.log('💡 现在请刷新页面并检查模型加载');
    } else {
        console.log('\n⚠️ 代理服务测试失败');
        console.log('🔍 错误:', proxyResult.error);
    }
    
    return {
        config,
        proxyResult
    };
}

// 导出函数
window.FinalDebugger = {
    setupAndVerifyConfig,
    testProxyServiceLogic,
    forceRefreshApp,
    runCompleteTest
};

console.log('\n📖 使用说明:');
console.log('运行完整测试: FinalDebugger.runCompleteTest("your-api-key")');
console.log('\n🔧 快速开始:');
console.log('FinalDebugger.runCompleteTest("AIzaSyCUduSy8NLnF0hKWjgial1Qtm8YQ6-LKr0");');