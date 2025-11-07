# 激光成图助手

一个现代化的AI图片生成助手前端应用，具有美观的用户界面和完整的功能。

## 功能特性

- 🎨 **AI图片生成**: 通过文本描述生成高质量图片
- 🎤 **语音输入**: 支持语音识别输入
- 📱 **响应式设计**: 适配各种设备尺寸
- 💾 **历史记录**: 自动保存生成历史，支持快速查看
- 🔍 **图片预览**: 大图预览和操作功能
- 📥 **图片下载**: 一键下载生成的图片
- 🌙 **深色模式**: 自动适配系统主题
- ⚡ **现代化UI**: 基于Tailwind CSS的美观界面

## 文件结构

```
static/
├── index.html          # 主页面
├── style.css          # 自定义样式
├── script.js          # 主要功能实现
└── API_INTEGRATION.md # API集成指南
```

## 快速开始

1. **直接使用**: 在浏览器中打开 `index.html` 即可查看界面
2. **本地服务器**: 使用任何HTTP服务器托管static文件夹
3. **API集成**: 按照 `API_INTEGRATION.md` 的指南实现后端API

## 使用方法

### 基本操作
1. 在输入框中输入图片描述
2. 点击"生成图片"按钮或按回车键
3. 等待AI生成图片
4. 查看生成的图片并进行操作

### 语音输入
1. 点击麦克风按钮
2. 说出你的图片描述
3. 系统会自动识别并填入输入框

### 历史记录
- 左侧边栏显示最近10条生成记录
- 点击任意历史记录可快速查看
- 支持新建对话功能

### 图片操作
- **查看大图**: 点击图片上的放大镜图标
- **下载图片**: 点击下载按钮
- **旋转图片**: 在预览模式下旋转图片
- **确认上传**: 将图片上传到服务器

## 技术栈

- **HTML5**: 语义化标记
- **Tailwind CSS**: 现代化样式框架
- **Vanilla JavaScript**: 原生JS实现，无依赖
- **Font Awesome**: 图标库
- **Web Speech API**: 语音识别
- **LocalStorage**: 本地数据存储

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## API集成

要使用完整的图片生成功能，需要实现后端API。详细说明请参考 `API_INTEGRATION.md` 文件。

### 必需的API端点
- `POST /api/generate-image` - 生成图片

### 可选的API端点
- `POST /api/upload-image` - 上传图片
- `GET /api/history` - 获取历史记录

## 自定义配置

### 修改主题色彩
在 `index.html` 中修改Tailwind配置：
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',    // 主色调
        secondary: '#3B82F6',  // 次要色调
        accent: '#EC4899',     // 强调色
      }
    }
  }
}
```

### 修改API端点
在 `script.js` 中修改API调用：
```javascript
async callGenerateImageAPI(prompt) {
  const response = await fetch('/your-api-endpoint', {
    // API配置
  });
}
```

## 部署建议

### 开发环境
```bash
# 使用Python简单服务器
python -m http.server 8000

# 使用Node.js serve
npx serve static

# 使用Live Server (VS Code扩展)
# 右键index.html -> Open with Live Server
```

### 生产环境
- 使用Nginx或Apache托管静态文件
- 配置HTTPS证书
- 启用Gzip压缩
- 设置适当的缓存策略

## 故障排除

### 常见问题

1. **语音识别不工作**
   - 确保使用HTTPS协议
   - 检查浏览器权限设置
   - 确认浏览器支持Web Speech API

2. **图片无法显示**
   - 检查网络连接
   - 确认图片URL有效
   - 检查CORS设置

3. **历史记录丢失**
   - 检查浏览器LocalStorage是否被禁用
   - 确认没有清理浏览器数据

### 调试模式
在浏览器控制台中运行以下命令进行调试：
```javascript
// 查看当前状态
console.log(assistant);

// 查看历史记录
console.log(assistant.chatHistory);

// 测试API连接
assistant.callGenerateImageAPI('测试图片');
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License - 详见LICENSE文件

---

**注意**: 这是一个前端应用，需要配合后端API使用才能实现完整的图片生成功能。
