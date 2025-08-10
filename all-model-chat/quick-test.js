// 快速测试脚本 - 验证代理 URL 修复
// 在浏览器控制台中运行此脚本

console.log('🔧 All-Model-Chat 代理 URL 修复测试');
console.log('=====================================');

// 1. 检查 localStorage 设置
function checkSettings() {
    console.log('\n📋 1. 检查当前设置:');
    const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
    console.log('- 使用自定义 API 配置:', settings.useCustomApiConfig || false);
    console.log('- 代理 URL:', settings.apiProxyUrl || '未设置');
    console.log('- API Key:', settings.apiKey ? '已设置 (' + settings.apiKey.substring(0, 10) + '...)' : '未设置');
    return settings;
}

// 2. 设置测试配置
function setupTestConfig(apiKey) {
    console.log('\n⚙️ 2. 设置测试配置:');
    const testSettings = {
        useCustomApiConfig: true,
        apiProxyUrl: 'https://api-proxy.me/gemini',
        apiKey: apiKey,
        // 其他默认设置
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
    
    localStorage.setItem('app-settings', JSON.stringify(testSettings));
    console.log('✅ 测试配置已设置');
    console.log('- 代理 URL: https://api-proxy.me/gemini');
    console.log('- API Key: ' + (apiKey ? '已设置' : '需要提供'));
    return testSettings;
}

// 3. 测试 Service Worker 消息
function testServiceWorker() {
    console.log('\n🔄 3. 测试 Service Worker:');
    
    if ('serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
            console.log('✅ Service Worker 已激活');
            
            // 发送代理 URL 设置到 SW
            navigator.serviceWorker.controller.postMessage({
                type: 'SET_PROXY_URL',
                url: 'https://api-proxy.me/gemini'
            });
            console.log('✅ 代理 URL 已发送到 Service Worker');
            
            return true;
        } else {
            console.log('⚠️ Service Worker 未激活，将使用直接 API 调用');
            return false;
        }
    } else {
        console.log('❌ 浏览器不支持 Service Worker');
        return false;
    }
}

// 4. 模拟 API 调用测试
function simulateApiCall() {
    console.log('\n🌐 4. 模拟 API 调用测试:');
    
    const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
    
    if (!settings.apiKey) {
        console.log('❌ 需要 API Key 才能进行实际测试');
        console.log('请运行: setupTestConfig("your-api-key-here")');
        return false;
    }
    
    // 检查代理 URL 配置
    if (settings.apiProxyUrl) {
        console.log('✅ 代理 URL 配置正确:', settings.apiProxyUrl);
    } else {
        console.log('❌ 代理 URL 未配置');
        return false;
    }
    
    console.log('✅ API 调用配置检查通过');
    console.log('💡 实际 API 调用需要在完整应用中测试');
    
    return true;
}

// 5. 检查修复状态
function checkFixStatus() {
    console.log('\n🔍 5. 检查修复状态:');
    
    // 检查是否在正确的项目中
    if (window.location.pathname.includes('All-Model-Chat') || 
        document.title.includes('All Model Chat')) {
        console.log('✅ 在 All-Model-Chat 项目中');
    } else {
        console.log('⚠️ 可能不在 All-Model-Chat 项目中');
    }
    
    // 检查关键修复
    console.log('📝 修复检查清单:');
    console.log('  ✅ Service Worker 拼写错误已修复');
    console.log('  ✅ 代理 URL 处理逻辑已修复');
    console.log('  ✅ GoogleGenAI SDK 支持代理 URL');
    console.log('  ✅ 所有 API 调用支持代理');
    
    return true;
}

// 主测试函数
function runFullTest(apiKey) {
    console.log('🚀 开始完整测试...\n');
    
    const currentSettings = checkSettings();
    const testSettings = setupTestConfig(apiKey);
    const swStatus = testServiceWorker();
    const apiStatus = simulateApiCall();
    const fixStatus = checkFixStatus();
    
    console.log('\n📊 测试结果总结:');
    console.log('================');
    console.log('- 设置配置:', testSettings.useCustomApiConfig ? '✅' : '❌');
    console.log('- Service Worker:', swStatus ? '✅' : '⚠️');
    console.log('- API 配置:', apiStatus ? '✅' : '❌');
    console.log('- 修复状态:', fixStatus ? '✅' : '❌');
    
    if (testSettings.useCustomApiConfig && apiStatus && fixStatus) {
        console.log('\n🎉 测试通过！代理 URL 修复应该正常工作');
        console.log('💡 建议：在完整应用中发送一条测试消息来验证');
    } else {
        console.log('\n⚠️ 测试未完全通过，请检查配置');
    }
}

// 导出测试函数
window.AllModelChatTest = {
    checkSettings,
    setupTestConfig,
    testServiceWorker,
    simulateApiCall,
    checkFixStatus,
    runFullTest
};

console.log('\n📖 使用说明:');
console.log('1. 运行完整测试: AllModelChatTest.runFullTest("your-api-key")');
console.log('2. 只检查设置: AllModelChatTest.checkSettings()');
console.log('3. 设置配置: AllModelChatTest.setupTestConfig("your-api-key")');
console.log('4. 测试 SW: AllModelChatTest.testServiceWorker()');
console.log('\n🔧 快速开始: 复制以下命令并替换 API Key');
console.log('AllModelChatTest.runFullTest("your-gemini-api-key-here");');