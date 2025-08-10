# 🔑 API 密钥使用说明

## ✅ 可以随便更换！

**是的，API Key 完全可以随便更换！** 代理拦截器只是负责网络请求的重定向，不会限制或验证 API Key。

## 🔧 如何更换 API Key

### 方法一：通过设置界面（推荐）

1. **打开应用设置**
2. **找到 API Key 输入框**
3. **替换为您自己的 API Key**
4. **保存设置**

### 方法二：直接修改 localStorage

```javascript
// 获取当前设置
const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');

// 更换 API Key
settings.apiKey = '您的新API密钥';

// 保存设置
localStorage.setItem('app-settings', JSON.stringify(settings));

// 刷新页面
location.reload();
```

## 🎯 API Key 来源

您可以使用以下任何来源的 API Key：

### 1. 官方 Google AI Studio
- 访问：https://aistudio.google.com/app/apikey
- 创建免费的 Gemini API Key
- **注意**：某些地区可能无法直接访问

### 2. 第三方代理服务
- 一些代理服务提供自己的 API Key
- 通常有使用限制或付费计划
- 确保服务可靠性和安全性

### 3. 其他兼容的 API Key
- 任何与 Gemini API 兼容的密钥
- 确保格式正确（通常以 `AIza` 开头）

## 🔒 安全注意事项

### ⚠️ 重要提醒

1. **不要在代码中硬编码 API Key**
   - API Key 应该由用户在设置中输入
   - 存储在浏览器的 localStorage 中
   - 不会被提交到 Git 仓库

2. **保护您的 API Key**
   - 不要在公开场合分享
   - 定期更换密钥
   - 监控使用情况

3. **使用限制**
   - 每个 API Key 都有使用配额
   - 超出限制可能会被暂停
   - 合理使用，避免滥用

## 📋 测试不同的 API Key

### 示例 API Key 格式
```
AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # 您的密钥
```

### 验证 API Key 是否有效

1. **设置新的 API Key**
2. **尝试加载模型列表**
3. **发送测试消息**
4. **检查是否有错误**

如果出现错误，可能的原因：
- API Key 无效或过期
- API Key 没有相应权限
- 达到使用限制
- 网络连接问题

## 🚀 部署时的 API Key 管理

### 对于 Cloudflare Pages 部署

1. **不要在代码中包含 API Key**
   ```typescript
   // ❌ 错误做法
   const apiKey = 'AIzaSXXXXXX';
   
   // ✅ 正确做法
   const apiKey = appSettings.apiKey; // 从用户设置中读取
   ```

2. **让用户自己配置**
   - 用户访问部署的网站
   - 在设置中输入自己的 API Key
   - 代理拦截器自动工作

3. **支持多用户**
   - 每个用户使用自己的 API Key
   - 存储在各自的浏览器中
   - 互不干扰

## 💡 最佳实践

1. **提供默认示例**：在设置界面提供示例格式
2. **验证格式**：检查 API Key 格式是否正确
3. **错误提示**：当 API Key 无效时给出清晰的错误信息
4. **使用指南**：为用户提供获取 API Key 的指南

## 🔄 动态切换

用户甚至可以：
- 为不同的对话使用不同的 API Key
- 在运行时切换 API Key
- 测试多个 API Key 的性能

**总结：API Key 完全由用户控制，可以随时更换，代理拦截器会自动使用新的密钥！** 🎉