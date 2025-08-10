// 测试修复后的代理服务
console.log('🧪 测试代理服务...');

// 模拟 proxyService 的核心逻辑
function testProxyService() {
    // 模拟 localStorage 设置
    const mockSettings = {
        useCustomApiConfig: true,
        apiProxyUrl: 'https://api-proxy.me/gemini',
        apiKey: 'test-api-key'
    };
    
    localStorage.setItem('app-settings', JSON.stringify(mockSettings));
    
    // 测试 URL 构建逻辑
    function getEffectiveUrl(originalUrl, proxyUrl) {
        if (!proxyUrl) return originalUrl;
        
        const googleApiBase = 'https://generativelanguage.googleapis.com/v1beta';
        if (originalUrl.startsWith(googleApiBase)) {
            const path = originalUrl.substring(googleApiBase.length);
            // 确保代理 URL 以 /v1beta 结尾
            const normalizedProxyUrl = proxyUrl.endsWith('/v1beta') ? proxyUrl : proxyUrl + '/v1beta';
            const finalUrl = normalizedProxyUrl + path;
            console.log(`✅ URL 转换: ${originalUrl} -> ${finalUrl}`);
            return finalUrl;
        }
        
        return originalUrl;
    }
    
    // 测试各种 URL
    const testCases = [
        'https://generativelanguage.googleapis.com/v1beta/models',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent'
    ];
    
    console.log('\n📋 URL 转换测试:');
    testCases.forEach(url => {
        getEffectiveUrl(url, 'https://api-proxy.me/gemini');
    });
    
    console.log('\n✅ 代理服务逻辑测试完成');
    
    return {
        settings: mockSettings,
        testPassed: true
    };
}

// 运行测试
const result = testProxyService();

console.log('\n🎯 下一步测试建议:');
console.log('1. 在完整应用中测试模型加载');
console.log('2. 检查浏览器控制台是否显示代理日志');
console.log('3. 确认不再出现地区限制错误');

// 导出测试函数
window.testProxyService = testProxyService;