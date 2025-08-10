// 终极代理修复 - 拦截所有可能的网络 API
console.log('🔧 终极代理修复工具');

// 保存原始函数
const originalFetch = window.fetch;
const originalXMLHttpRequest = window.XMLHttpRequest;

// 代理配置
let proxyConfig = null;

// 获取代理配置
function getProxyConfig() {
    if (proxyConfig) return proxyConfig;
    
    try {
        const settings = localStorage.getItem('app-settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            proxyConfig = {
                useCustomApiConfig: parsed.useCustomApiConfig,
                apiProxyUrl: parsed.apiProxyUrl,
                apiKey: parsed.apiKey
            };
            return proxyConfig;
        }
    } catch (error) {
        console.error('Failed to get proxy config:', error);
    }
    return { useCustomApiConfig: false, apiProxyUrl: null, apiKey: null };
}

// URL 转换函数
function transformUrl(originalUrl, proxyUrl) {
    const googleApiBase = 'https://generativelanguage.googleapis.com/v1beta';
    if (originalUrl.includes('generativelanguage.googleapis.com')) {
        const path = originalUrl.substring(originalUrl.indexOf('/v1beta'));
        const normalizedProxyUrl = proxyUrl.endsWith('/v1beta') ? proxyUrl : proxyUrl + '/v1beta';
        const finalUrl = normalizedProxyUrl + path;
        console.log(`🔄 [UltimateProxy] URL 转换: ${originalUrl} -> ${finalUrl}`);
        return finalUrl;
    }
    return originalUrl;
}

// 拦截 fetch
function interceptFetch() {
    window.fetch = function(input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;
        
        if (url && url.includes('generativelanguage.googleapis.com')) {
            const config = getProxyConfig();
            console.log('🚨 [UltimateProxy] Fetch 拦截:', { url, config });
            
            if (config.useCustomApiConfig && config.apiProxyUrl) {
                const proxyUrl = transformUrl(url, config.apiProxyUrl);
                const newInput = typeof input === 'string' ? proxyUrl : new Request(proxyUrl, input);
                
                console.log('✅ [UltimateProxy] Fetch 代理:', proxyUrl);
                return originalFetch(newInput, init);
            }
        }
        
        return originalFetch(input, init);
    };
}

// 拦截 XMLHttpRequest
function interceptXHR() {
    window.XMLHttpRequest = function() {
        const xhr = new originalXMLHttpRequest();
        const originalOpen = xhr.open;
        
        xhr.open = function(method, url, ...args) {
            if (url && url.includes('generativelanguage.googleapis.com')) {
                const config = getProxyConfig();
                console.log('🚨 [UltimateProxy] XHR 拦截:', { method, url, config });
                
                if (config.useCustomApiConfig && config.apiProxyUrl) {
                    const proxyUrl = transformUrl(url, config.apiProxyUrl);
                    console.log('✅ [UltimateProxy] XHR 代理:', proxyUrl);
                    return originalOpen.call(this, method, proxyUrl, ...args);
                }
            }
            
            return originalOpen.call(this, method, url, ...args);
        };
        
        return xhr;
    };
    
    // 复制原始构造函数的属性
    Object.setPrototypeOf(window.XMLHttpRequest.prototype, originalXMLHttpRequest.prototype);
    Object.setPrototypeOf(window.XMLHttpRequest, originalXMLHttpRequest);
}

// 拦截可能的其他网络 API
function interceptOtherAPIs() {
    // 拦截 navigator.sendBeacon
    if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function(url, data) {
            if (url && url.includes('generativelanguage.googleapis.com')) {
                const config = getProxyConfig();
                console.log('🚨 [UltimateProxy] SendBeacon 拦截:', { url, config });
                
                if (config.useCustomApiConfig && config.apiProxyUrl) {
                    const proxyUrl = transformUrl(url, config.apiProxyUrl);
                    console.log('✅ [UltimateProxy] SendBeacon 代理:', proxyUrl);
                    return originalSendBeacon.call(this, proxyUrl, data);
                }
            }
            
            return originalSendBeacon.call(this, url, data);
        };
    }
    
    // 拦截 WebSocket（如果有的话）
    if (window.WebSocket) {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            if (url && url.includes('generativelanguage.googleapis.com')) {
                const config = getProxyConfig();
                console.log('🚨 [UltimateProxy] WebSocket 拦截:', { url, config });
                
                if (config.useCustomApiConfig && config.apiProxyUrl) {
                    const proxyUrl = transformUrl(url, config.apiProxyUrl);
                    console.log('✅ [UltimateProxy] WebSocket 代理:', proxyUrl);
                    return new originalWebSocket(proxyUrl, protocols);
                }
            }
            
            return new originalWebSocket(url, protocols);
        };
        
        Object.setPrototypeOf(window.WebSocket.prototype, originalWebSocket.prototype);
        Object.setPrototypeOf(window.WebSocket, originalWebSocket);
    }
}

// 强制设置代理配置
function forceSetProxyConfig(apiKey, proxyUrl = 'https://api-proxy.me/gemini') {
    console.log('⚙️ [UltimateProxy] 强制设置代理配置...');
    
    const config = {
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
    
    localStorage.setItem('app-settings', JSON.stringify(config));
    proxyConfig = null; // 重置缓存
    
    console.log('✅ [UltimateProxy] 配置已强制设置');
    return config;
}

// 激活所有拦截器
function activateAllInterceptors() {
    console.log('🚀 [UltimateProxy] 激活所有拦截器...');
    
    interceptFetch();
    interceptXHR();
    interceptOtherAPIs();
    
    console.log('✅ [UltimateProxy] 所有拦截器已激活');
}

// 恢复所有原始函数
function restoreAllOriginals() {
    console.log('🔄 [UltimateProxy] 恢复所有原始函数...');
    
    window.fetch = originalFetch;
    window.XMLHttpRequest = originalXMLHttpRequest;
    
    console.log('✅ [UltimateProxy] 所有原始函数已恢复');
}

// 测试终极代理
async function testUltimateProxy(apiKey) {
    console.log('🧪 [UltimateProxy] 测试终极代理...');
    
    try {
        const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey);
        console.log('📤 [UltimateProxy] 发送测试请求:', testUrl);
        
        const response = await fetch(testUrl);
        console.log('📥 [UltimateProxy] 响应:', {
            status: response.status,
            url: response.url,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ [UltimateProxy] 测试成功!', {
                modelCount: data.models ? data.models.length : 0
            });
            return { success: true, data };
        } else {
            const errorText = await response.text();
            console.log('❌ [UltimateProxy] 测试失败:', {
                status: response.status,
                error: errorText
            });
            return { success: false, error: errorText };
        }
    } catch (error) {
        console.log('❌ [UltimateProxy] 测试异常:', error);
        return { success: false, error: error.message };
    }
}

// 完整的终极修复流程
async function ultimateFix(apiKey) {
    console.log('🚀 [UltimateProxy] 开始终极修复...\n');
    
    if (!apiKey) {
        console.log('❌ 请提供 API Key');
        return;
    }
    
    // 1. 强制设置配置
    const config = forceSetProxyConfig(apiKey);
    
    // 2. 激活所有拦截器
    activateAllInterceptors();
    
    // 3. 测试代理
    const testResult = await testUltimateProxy(apiKey);
    
    console.log('\n📊 [UltimateProxy] 终极修复结果:');
    console.log('================================');
    console.log('- 配置强制设置:', '✅');
    console.log('- 拦截器激活:', '✅');
    console.log('- 代理测试:', testResult.success ? '✅' : '❌');
    
    if (testResult.success) {
        console.log('\n🎉 [UltimateProxy] 终极修复成功!');
        console.log('💡 现在所有网络请求都会被强制代理');
        console.log('🔄 请刷新页面测试应用');
    } else {
        console.log('\n⚠️ [UltimateProxy] 终极修复失败');
        console.log('🔍 错误:', testResult.error);
    }
    
    return { config, testResult };
}

// 导出函数
window.UltimateProxyFix = {
    forceSetProxyConfig,
    activateAllInterceptors,
    restoreAllOriginals,
    testUltimateProxy,
    ultimateFix
};

console.log('\n📖 [UltimateProxy] 使用说明:');
console.log('运行终极修复: UltimateProxyFix.ultimateFix("your-api-key")');
console.log('\n🔧 快速开始:');
console.log('UltimateProxyFix.ultimateFix("AIzaSyCUduSy8NLnF0hKWjgial1Qtm8YQ6-LKr0");');