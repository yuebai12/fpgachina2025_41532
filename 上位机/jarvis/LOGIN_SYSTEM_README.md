# 激光成图助手 - 登录系统使用说明

## 功能概述

激光成图助手现在包含完整的登录系统，具有以下特性：

- 🔐 **安全登录**: 固定账户验证（admin/123456）
- 🎨 **现代化界面**: 与主应用一致的设计风格
- 🎤 **语音识别**: 支持语音输入
- 🔊 **自动播报**: 登录后AI自动欢迎
- 💾 **会话管理**: 安全的会话状态管理
- 📱 **响应式设计**: 适配各种设备

## 使用方法

### 1. 启动应用
```bash
python app.py
```

### 2. 访问登录页面
打开浏览器访问：`http://localhost:5000/login`

### 3. 登录信息
- **用户名**: `admin`
- **密码**: `123456`

### 4. 登录后功能
- 自动跳转到主应用
- AI自动播报欢迎语："主人你好，我是你的激光成图助手，请问今天有什么事需要吗？"
- 可以使用所有图片生成功能

## 文件结构

```
jarvis/
├── app.py                    # 后端主文件（已更新）
├── templates/
│   ├── login.html           # 登录页面
│   └── index.html          # 主应用页面（已更新）
└── static/
    ├── index.html          # 独立的主应用页面
    ├── style.css           # 主应用样式
    ├── script.js           # 主应用功能
    ├── login.css           # 登录页面样式
    ├── login.js            # 登录页面功能
    ├── README.md           # 使用说明
    └── API_INTEGRATION.md  # API集成指南
```

## 主要功能

### 登录页面特性
- ✅ 美观的渐变背景
- ✅ 浮动装饰动画
- ✅ 密码显示/隐藏切换
- ✅ 记住我功能
- ✅ 错误提示和成功反馈
- ✅ 加载动画
- ✅ 响应式设计
- ✅ 深色模式支持

### 主应用更新
- ✅ 登录状态检查
- ✅ 用户信息显示
- ✅ 登出功能
- ✅ AI自动欢迎播报
- ✅ 会话管理

### 后端功能
- ✅ 会话管理
- ✅ 登录验证
- ✅ 路由保护
- ✅ API端点更新

## API端点

### 登录相关
- `GET /login` - 登录页面
- `POST /api/login` - 登录验证
- `POST /api/logout` - 登出

### 应用功能（需要登录）
- `GET /` - 主应用页面
- `POST /chat` - 聊天功能
- `POST /tts` - 语音播报
- `POST /api/generate-image` - 图片生成

## 安全特性

1. **会话管理**: 使用Flask session管理登录状态
2. **路由保护**: 所有功能路由都需要登录验证
3. **CSRF保护**: 使用Flask内置的CSRF保护
4. **安全密钥**: 自动生成的会话密钥

## 自定义配置

### 修改登录凭据
在 `app.py` 中修改：
```python
if username == 'your_username' and password == 'your_password':
```

### 修改欢迎语音
在 `templates/index.html` 中修改：
```javascript
text: '你的自定义欢迎语'
```

### 修改样式
- 登录页面样式：`static/login.css`
- 主应用样式：`static/style.css`

## 故障排除

### 常见问题

1. **无法访问登录页面**
   - 检查Flask应用是否正常运行
   - 确认端口5000未被占用

2. **登录失败**
   - 确认用户名：admin
   - 确认密码：123456
   - 检查浏览器控制台错误

3. **语音播报不工作**
   - 检查TTS API配置
   - 确认浏览器支持音频播放

4. **会话过期**
   - 重新登录
   - 检查浏览器Cookie设置

### 调试模式
在浏览器控制台中检查：
```javascript
// 检查登录状态
console.log(sessionStorage.getItem('isLoggedIn'));

// 检查用户名
console.log(sessionStorage.getItem('username'));
```

## 部署建议

### 生产环境
1. 修改默认密码
2. 使用HTTPS
3. 配置环境变量
4. 使用生产级WSGI服务器

### 环境变量
```bash
export FLASK_ENV=production
export SECRET_KEY=your_secret_key
```

## 更新日志

### v1.0.0
- ✅ 添加登录系统
- ✅ 创建登录页面
- ✅ 实现会话管理
- ✅ 添加AI自动播报
- ✅ 更新主应用界面
- ✅ 添加登出功能

---

**注意**: 这是一个演示版本，生产环境请修改默认密码并加强安全措施。
