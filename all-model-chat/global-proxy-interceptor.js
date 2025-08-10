// 全局代理拦截器 - 强制拦截所有对 Google API 的请求
console.log('🔧 全局代理拦截器已加载');

// 保存原始的 fetch 函数
const originalFetch = window.fetch;

// 创建代理拦截器
function createProxyInterceptor() {
    // 获取代理配置
    function getProxyConfig() {
        try {
            const settings = localStorage.getItem('app-settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                return {
                    useCustomApiConfig: parsed.useCustomApiConfig,
                    apiProxyUrl: parsed.apiProxyUrl,
                    apiKey: parsed.apiKey
                };
            }
        } catch (error) {
            console.error('Failed to get proxy config:', error);
        }
        return { useCustomApiConfig: false, apiProxyUrl: null, apiKey: null };
    }

    // URL 转换函数
    function transformUrl(originalUrl, proxyUrl) {
        const googleApiBase = 'https://generativelanguage.googleapis.com/v1beta';
        if (originalUrl.startsWith(googleApiBase)) {
            const path = originalUrl.substring(googleApiBase.length);
            const normalizedProxyUrl = proxyUrl.endsWith('/v1beta') ? proxyUrl : proxyUrl + '/v1beta';
            const finalUrl = normalizedProxyUrl + path;
            console.log(`🔄 [GlobalInterceptor] URL 转换: ${originalUrl} -> ${finalUrl}`);
            return finalUrl;
        }
        return originalUrl;
    }

    // 替换全局 fetch 函数
    window.fetch = function(input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;
        
        // 检查是否是 Google API 请求
        if (url.includes('generativelanguage.googleapis.com')) {
            const config = getProxyConfig();
            
            console.log('🚨 [GlobalInterceptor] 拦截到 Google API 请求:', {
                originalUrl: url,
                useCustomApiConfig: config.useCustomApiConfig,
                apiProxyUrl: config.apiProxyUrl
            });
            
            // 如果启用了代理配置
            if (config.useCustomApiConfig && config.apiProxyUrl) {
                const proxyUrl = transformUrl(url, config.apiProxyUrl);
                
                // 创建新的请求
                const newInput = typeof input === 'string' ? proxyUrl : new Request(proxyUrl, input);
                const newInit = {
                    ...init,
                    mode: 'cors',
                    credentials: 'omit'
                };
                
                console.log('✅ [GlobalInterceptor] 使用代理发送请求:', proxyUrl);
                return originalFetch(newInput, newInit);
            } else {
                console.log('⚠️ [GlobalInterceptor] 代理未启用，使用原始请求');
            }
        }
        
        // 对于非 Google API 请求，使用原始 fetch
        return originalFetch(input, init);
    };
    
    console.log('✅ 全局 fetch 拦截器已激活');
}

// 恢复原始 fetch 函数
function restoreOriginalFetch() {
    window.fetch = originalFetch;
    console.log('🔄 已恢复原始 fetch 函数');
}

// 测试拦截器
async function testInterceptor(apiKey) {
    console.log('🧪 测试全局拦截器...');
    
    // 设置测试配置
    const testConfig = {
        useCustomApiConfig: true,
        apiProxyUrl: 'https://api-proxy.me/gemini',
        apiKey: apiKey
    };
    localStorage.setItem('app-settings', JSON.stringify(testConfig));
    
    try {
        // 发送测试请求
        const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey);
        console.log('📤 发送测试请求:', testUrl);
        
        const response = await fetch(testUrl);
        console.log('📥 响应状态:', response.status);
        console.log('📥 响应 URL:', response.url);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ 拦截器测试成功!');
            console.log('📊 模型数量:', data.models ? data.models.length : 0);
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.log('❌ 拦截器测试失败:', response.status);
            console.log('📄 错误详情:', errorText);
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.log('❌ 拦截器测试异常:', error);
        return { success: false, error: error.message };
    }
}

// 完整的拦截器设置和测试
async function setupAndTest(apiKey) {
    console.log('🚀 设置全局拦截器并测试...\n');
    
    if (!apiKey) {
        console.log('❌ 请提供 API Key');
        return;
    }
    
    // 1. 创建拦截器
    createProxyInterceptor();
    
    // 2. 测试拦截器
    const testResult = await testInterceptor(apiKey);
    
    console.log('\n📊 拦截器测试结果:');
    console.log('====================');
    console.log('- 拦截器激活:', '✅');
    console.log('- 测试结果:', testResult.success ? '✅' : '❌');
    
    if (testResult.success) {
        console.log('\n🎉 全局拦截器工作正常!');
        console.log('💡 现在所有 Google API 请求都会被自动代理');
        console.log('🔄 请刷新页面或重新加载模型列表');
    } else {
        console.log('\n⚠️ 拦截器测试失败');
        console.log('🔍 错误:', testResult.error);
    }
    
    return testResult;
}

// 导出函数
window.GlobalProxyInterceptor = {
    createProxyInterceptor,
    restoreOriginalFetch,
    testInterceptor,
    setupAndTest
};

console.log('\n📖 使用说明:');
console.log('1. 设置并测试: GlobalProxyInterceptor.setupAndTest("your-api-key")');
console.log('2. 仅激活拦截器: GlobalProxyInterceptor.createProxyInterceptor()');
console.log('3. 恢复原始 fetch: GlobalProxyInterceptor.restoreOriginalFetch()');
console.log('\n🔧 快速开始:');
console.log('GlobalProxyInterceptor.setupAndTest("AIzaSyCUduSy8NLnF0hKWjgial1Qtm8YQ6-LKr0");');