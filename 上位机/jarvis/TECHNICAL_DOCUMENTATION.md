# 激光成图助手 - 技术文档

## 项目概述

激光成图助手（Jarvis）是一个全栈AI图片生成与FPGA处理系统，集成多种AI模型和图像处理功能，支持完整的图片生成、处理、传输工作流。系统采用Flask + Tailwind CSS技术栈，具有现代化的用户界面和强大的后端功能。

### 核心特性

- 🤖 **多模型AI对话**: 支持百度文心、OpenRouter、QwQ-32B等多种大语言模型
- 🎨 **AI图片生成**: 基于豆包SeedReam模型的图片生成功能
- 📊 **图片处理**: 灰度转换、数组转换、等比例缩放
- 🔌 **FPGA通信**: 串口/UART通信、工业级帧格式传输
- 🎤 **语音交互**: 讯飞语音合成、SiliconFlow语音识别
- 🔐 **用户认证**: 完整的登录/登出与会话管理
- 📱 **响应式UI**: 现代化设计，支持移动端

## 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    前端层 (Frontend)                      │
├─────────────────────────────────────────────────────────┤
│  • templates/         HTML模板                           │
│  • static/           CSS/JS/资源文件                     │
│  • 测试页面          功能测试工具                         │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                   Flask后端层 (Backend)                   │
├─────────────────────────────────────────────────────────┤
│  • app.py            主应用服务器                         │
│  • 路由处理          路由装饰器、登录验证                 │
│  • 业务逻辑          图片处理、通信管理                   │
└─────────────────────────────────────────────────────────┘
                          ↕ API
┌─────────────────────────────────────────────────────────┐
│                  外部服务层 (External)                    │
├─────────────────────────────────────────────────────────┤
│  • AI模型 API        百度/豆包/讯飞/OpenRouter/QwQ        │
│  • 语音服务          讯飞TTS/SiliconFlow ASR            │
│  • FPGA设备          串口通信/UART协议                   │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

#### 后端技术
- **Flask 2.3.3**: Python Web框架
- **Pillow 10.0.1**: 图像处理库
- **numpy 1.24.3**: 数值计算
- **pyserial 3.5**: 串口通信
- **openai 1.3.0**: OpenAI API客户端
- **requests 2.31.0**: HTTP客户端

#### 前端技术
- **Tailwind CSS**: 现代化CSS框架
- **Font Awesome 4.7.0**: 图标库
- **Vanilla JavaScript**: 原生JS，无依赖
- **Canvas API**: 图像处理
- **Web Speech API**: 语音识别

#### 第三方服务
- **豆包AI**: 图片生成模型
- **百度文心**: 对话模型
- **OpenRouter**: AI模型代理
- **讯飞语音**: TTS/ASR服务
- **SiliconFlow**: TTS/ASR服务

## 目录结构

```
jarvis/
├── app.py                          # Flask主应用文件 (1000行)
├── requirements.txt                # Python依赖
│
├── templates/                      # HTML模板目录
│   ├── index.html                 # 主应用页面
│   └── login.html                 # 登录页面
│
├── static/                         # 静态资源目录
│   ├── index.html                 # 独立的主应用页面
│   ├── script.js                  # 主应用JavaScript (2447行)
│   ├── style.css                  # 样式文件
│   ├── login.css                  # 登录页面样式
│   ├── login.js                   # 登录页面逻辑
│   ├── ai.png                     # 助手头像
│   ├── README.md                  # 使用说明
│   └── API_INTEGRATION.md         # API集成指南
│
├── test_*.html                     # 功能测试页面
│   ├── test_upload_fix.html       # 上传修复测试
│   ├── test_single_image_limit.html  # 单图片限制测试
│   ├── test_single_upload.html    # 单图片上传测试
│   └── test_functionality.html    # 功能测试
│
└── 文档/
    ├── COMPLETE_SYSTEM_GUIDE.md   # 完整系统指南
    ├── LOGIN_SYSTEM_README.md     # 登录系统说明
    ├── FPGA_COMMUNICATION_GUIDE.md # FPGA通信指南
    └── TECHNICAL_DOCUMENTATION.md # 本文档
```

## 核心模块详解

### 1. Flask应用主文件 (app.py)

#### 1.1 配置管理

**环境变量配置**:
```python
# 会话密钥
app.secret_key = os.getenv("FLASK_SECRET_KEY", "static_dev_secret_key")

# 讯飞语音合成
XFY_TTS_APP_ID = "52fbf31a"
XFY_TTS_API_KEY = "ec7c3ca805a58a96a5a6d22afb181fd7"
XFY_TTS_API_SECRET = "YTViZDQ3Mjk4YWNkYzFlYTFkOWJmNTNl"

# 讯飞语音唤醒
XFY_WAKE_APP_ID = "88b466a0"
XFY_WAKE_API_KEY = "bcaa94619fe2cd14e7e5f09406199865"
XFY_WAKE_API_SECRET = "YmI2MzkzZDIzNzI0Nzc3NjZlZTg0NThj"

# SiliconFlow ASR
SILICONFLOW_ASR_KEY = "sk-wbvxcozbweaxqhwnrogjgmdxcbckzclkefjykpxuoqtsuyla"

# 豆包图片生成
DOUBAO_API_KEY = os.getenv("DOUBAO_API_KEY", "879e481d-4733-4520-9655-10d0f29fb5b6")

# QwQ-32B模型
QWQ_API_KEY = os.getenv("QWQ_API_KEY", "sk-Hga8t11MnLJv7dfsjayvC1jvnJ3mZRdvSlNZpPSL20SOYuId")
QWQ_API_URL = "https://api.suanli.cn/v1/chat/completions"
```

**配置原则**:
- 使用环境变量覆盖默认配置
- 生产环境使用环境变量管理敏感信息
- 提供合理的默认值便于开发

#### 1.2 会话管理

**登录验证装饰器**:
```python
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function
```

**会话状态**:
- `session['logged_in']`: 登录状态
- `session['username']`: 用户名
- `session['token']`: 会话令牌

#### 1.3 AI模型接口

**1. 百度文心 (chat_with_baidu)**
- 使用AccessToken认证
- Token缓存机制（避免频繁请求）
- 超时时间60秒
- 支持温度、top_p参数调节

**2. OpenRouter (chat_with_openrouter)**
- 使用OpenAI SDK
- 模型: moonshotai/moonlight-16b-a3b-instruct:free
- 支持流式和非流式响应

**3. QwQ-32B (chat_with_qwq)**
- 官方API接口
- Bearer Token认证
- 免费模型

**4. 讯飞星火 (chat_with_xfy_placeholder)**
- 占位实现
- 需要WebSocket/SDK接入

#### 1.4 图片处理模块

**图片生成API** (`/api/generate-image`):
```python
# 使用豆包SeedReam模型
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {DOUBAO_API_KEY}"
}
payload = {
    "model": "doubao-seedream-4-0-250828",
    "prompt": prompt,
    "response_format": "url",
    "size": "2K",
    "stream": False,
    "watermark": False
}
```

**图片转数组** (`/api/image-to-array`):
- 支持base64和URL两种输入
- 自动灰度转换
- 等比例缩放到64x64（保留宽高比）
- 返回宽度、高度、模式、数组

**灰度图转换** (`/api/image-to-grayscale`):
- 避免前端跨域画布污染问题
- 服务器端转换后返回base64 PNG

#### 1.5 FPGA通信模块

**串口管理**:
- 串口列表获取 (`/api/serial-ports`)
- 串口连接 (`/api/serial-connect`)
- 串口断开 (`/api/serial-disconnect`)
- 串口状态 (`/api/serial-status`)

**工业级UART帧格式**:
```python
# 元信息帧
meta_frame = [0xAA, 0x00, 0x00, w_l, w_h, h_l, h_h, checksum, 0x55]

# 数据帧（每帧3像素）
data_frame = [0xAA, 0x01, frame_count, p1, p2, p3, checksum, 0x55]
```

**帧格式特性**:
- 帧头: 0xAA
- 帧尾: 0x55
- 校验和: 前N-1字节累加和的低8位
- 支持宽度/高度16位传输
- 帧类型: 0x00（元信息）、0x01（数据）

**传输流程**:
1. 发送元信息帧（图像尺寸）
2. 分帧发送像素数据（每帧3像素）
3. 记录传输日志
4. 返回传输统计

### 2. 前端核心逻辑 (script.js)

#### 2.1 LaserImageAssistant类

**构造函数**:
```javascript
constructor() {
  this.currentChatId = null;
  this.chatHistory = [];
  this.isGenerating = false;
  this.isUploading = false;
  this.voiceRecognition = null;
  this.currentMode = 'image';
  this.hasUploadedImage = false;
  this.uploadedImageData = null;
}
```

**核心方法**:

1. **generateImage()**: 图片生成
   - 调用豆包API
   - 显示加载状态
   - 处理错误和成功响应

2. **handleFileUpload()**: 文件上传
   - 单文件限制
   - 文件类型验证
   - 文件大小检查
   - 图片预览

3. **sendChatMessage()**: 发送消息
   - 多模型支持
   - 流式响应处理
   - 历史记录管理

4. **processGrayscaleImage()**: 灰度处理
   - 自动转灰度
   - 等比例缩放
   - 显示预览

5. **convertImageToArray()**: 数组转换
   - 调用后端API
   - 显示统计信息
   - 数据验证

6. **sendToFPGA()**: FPGA传输
   - 构建FPGA帧
   - 串口连接检查
   - 实时传输日志

#### 2.2 用户界面组件

**聊天界面**:
- 响应式布局
- 消息气泡样式
- 滚动自动定位
- 加载动画

**图片预览模态框**:
- 大图查看
- 旋转功能
- 下载保存
- 确认上传

**历史记录**:
- 最近10条记录
- 点击切换对话
- 清空历史
- 新建对话

#### 2.3 语音识别

**Web Speech API集成**:
```javascript
initVoiceRecognition() {
  this.voiceRecognition = new webkitSpeechRecognition();
  this.voiceRecognition.lang = 'zh-CN';
  this.voiceRecognition.continuous = false;
  this.voiceRecognition.interimResults = false;
  
  this.voiceRecognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    this.messageInput.value = transcript;
  };
}
```

**操作方式**:
- 按住说话
- 松开发送
- 支持触摸事件

### 3. 登录系统

#### 3.1 登录页面

**UI设计**:
- 渐变背景
- 浮动装饰动画
- 半透明卡片
- 响应式布局

**表单验证**:
- 必填字段检查
- 实时错误提示
- 加载状态显示
- 记住我功能

**交互特性**:
- 密码显示/隐藏
- 键盘导航
- 动画反馈
- 友好提示

#### 3.2 认证流程

```
用户访问 /login
  ↓
输入用户名/密码
  ↓
POST /api/login
  ↓
验证 credentials
  ↓
创建 session
  ↓
返回 token
  ↓
跳转主应用
```

#### 3.3 安全性

**会话安全**:
- Flask session加密
- 随机令牌生成
- 过期时间管理

**路由保护**:
- 所有API端点需要登录
- 自动重定向未登录用户

**前端保护**:
- 页面加载检查登录状态
- 自动跳转登录页
- SessionStorage检查

## API接口文档

### 认证相关

#### POST /api/login
登录验证

**请求体**:
```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "token": "hex_token_string"
}
```

#### POST /api/logout
登出

**响应**:
```json
{
  "success": true,
  "message": "已登出"
}
```

### AI对话相关

#### POST /chat
发送对话消息

**请求体**:
```json
{
  "message": "你好",
  "mode": "chat",
  "provider": "baidu"
}
```

**响应**:
```json
{
  "reply": "你好，我是AI助手"
}
```

### 图片生成相关

#### POST /api/generate-image
AI生成图片

**请求体**:
```json
{
  "prompt": "一只可爱的小猫"
}
```

**响应**:
```json
{
  "success": true,
  "imageUrl": "https://example.com/image.jpg",
  "fallback": false
}
```

#### POST /api/image-to-array
图片转数组

**请求体**:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "imageData": "base64...",
  "grayscale": true
}
```

**响应**:
```json
{
  "success": true,
  "width": 64,
  "height": 64,
  "mode": "L",
  "array": [255, 128, 64, ...]
}
```

#### POST /api/image-to-grayscale
转灰度图

**请求体**:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "imageData": "base64..."
}
```

**响应**:
```json
{
  "success": true,
  "image": "base64_grayscale_data",
  "width": 64,
  "height": 64
}
```

### FPGA通信相关

#### POST /api/send-to-fpga
发送数据到FPGA

**请求体**:
```json
{
  "width": 64,
  "height": 64,
  "array": [255, 128, 64, ...],
  "frames": true
}
```

**响应**:
```json
{
  "success": true,
  "message": "成功发送 4096 个像素数据到FPGA",
  "data_info": {
    "width": 64,
    "height": 64,
    "pixel_count": 4096,
    "min_value": 0,
    "max_value": 255,
    "avg_value": 127.5
  },
  "uart_frame_preview": [[...], [...]]
}
```

#### GET /api/serial-ports
获取串口列表

**响应**:
```json
{
  "success": true,
  "ports": [
    {
      "device": "COM3",
      "description": "USB Serial Port",
      "hwid": "USB\\VID_xxx&PID_xxx"
    }
  ]
}
```

#### POST /api/serial-connect
连接串口

**请求体**:
```json
{
  "port": "COM3",
  "baudrate": 115200,
  "data_bits": 8,
  "stop_bits": 1,
  "parity": "None"
}
```

#### POST /api/serial-transmit
传输数据

**请求体**:
```json
{
  "frames": [[0xAA, ...], [0xAA, ...]],
  "interval": 0.1
}
```

#### GET /api/transmission-log
获取传输日志

**响应**:
```json
{
  "success": true,
  "log": [
    {
      "timestamp": "2024-01-01 12:00:00.123",
      "frame_number": 1,
      "frame_type": "元信息",
      "frame_hex": "AA 00 00 ...",
      "bytes_written": 9,
      "status": "成功"
    }
  ],
  "total_entries": 100
}
```

### 语音相关

#### POST /tts
文字转语音

**请求体**:
```json
{
  "text": "你好",
  "provider": "xunfei"
}
```

**响应**:
```json
{
  "audio": "base64_audio_data",
  "provider": "xunfei"
}
```

#### POST /asr
语音转文字

**请求**: multipart/form-data
- audio: wav文件

**响应**:
```json
{
  "text": "你好世界"
}
```

## 数据流程图

### 图片生成流程

```
用户输入描述
  ↓
前端发送请求 → POST /api/generate-image
  ↓
后端调用豆包API
  ↓
返回图片URL
  ↓
前端显示预览
  ↓
自动转灰度图
  ↓
转数组处理
  ↓
发送到FPGA
```

### FPGA传输流程

```
准备传输数据
  ↓
构建FPGA帧格式
  ↓
检查串口连接
  ↓
发送元信息帧
  ↓
循环发送数据帧（每帧3像素）
  ↓
记录传输日志
  ↓
返回传输结果
```

### 登录验证流程

```
访问受保护页面
  ↓
检查session状态
  ↓
未登录 → 重定向/login
  ↓
登录页输入凭证
  ↓
POST /api/login
  ↓
验证成功 → 创建session
  ↓
跳转主应用
```

## 测试页面说明

### test_functionality.html
综合功能测试页面，测试：
- 新建对话按钮
- 图片上传功能
- 图片处理功能

### test_single_upload.html
单图片上传测试，验证：
- 文件数量限制
- 文件类型检查
- 文件大小限制
- 图片预览显示

### test_upload_fix.html
上传修复测试，验证各种边界情况。

### test_single_image_limit.html
单图片限制测试，确保：
- 只能选择一张图片
- 选择多张时清空并提示
- 文件验证正确

## 部署指南

### 开发环境

**1. 安装依赖**:
```bash
pip install -r requirements.txt
```

**2. 配置环境变量** (可选):
```bash
export DOUBAO_API_KEY="your_key"
export QWQ_API_KEY="your_key"
export FLASK_SECRET_KEY="your_secret"
```

**3. 启动应用**:
```bash
python app.py
```

**4. 访问应用**:
- 登录页: http://localhost:5000/login
- 默认账号: admin / 123456

### 生产环境

**1. 使用生产级WSGI服务器**:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

**2. 使用Nginx反向代理**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**3. 配置HTTPS**:
- 使用Let's Encrypt免费证书
- 配置SSL/TLS
- 强制HTTPS重定向

**4. 环境变量配置**:
```bash
export FLASK_ENV=production
export FLASK_SECRET_KEY="secure_random_key"
export DOUBAO_API_KEY="production_key"
```

**5. 日志配置**:
- 配置日志级别
- 日志轮转
- 错误监控

### Docker部署

**Dockerfile示例**:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - FLASK_SECRET_KEY=${FLASK_SECRET_KEY}
    volumes:
      - ./logs:/app/logs
```

## 安全考虑

### 1. 认证安全
- ✅ 使用Flask session管理登录状态
- ✅ 会话令牌随机生成
- ✅ 路由保护装饰器
- ⚠️ 生产环境需修改默认密码
- ⚠️ 建议实现JWT认证

### 2. 数据安全
- ✅ 输入验证
- ✅ SQL注入防护（当前无数据库）
- ✅ XSS防护（Flask自动转义）
- ✅ CSRF保护（Flask内置）

### 3. API安全
- ✅ 登录验证
- ⚠️ 建议添加API限流
- ⚠️ 建议添加请求签名
- ⚠️ 生产环境使用HTTPS

### 4. 敏感信息
- ⚠️ API密钥存在代码中，需使用环境变量
- ⚠️ 配置文件不要提交到版本控制
- ⚠️ 使用密钥管理服务

## 性能优化

### 1. 前端优化
- Tailwind CSS按需加载
- 图片懒加载
- 防抖节流处理
- LocalStorage缓存

### 2. 后端优化
- Token缓存机制
- 连接池管理
- 异步处理长任务
- 响应压缩

### 3. 网络优化
- CDN加速静态资源
- Gzip压缩
- HTTP/2支持
- 缓存策略

## 故障排除

### 常见问题

**1. 图片生成失败**
- 检查API密钥配置
- 查看网络连接
- 检查API配额

**2. FPGA通信失败**
- 确认串口已连接
- 检查波特率设置
- 验证帧格式
- 查看传输日志

**3. 登录后跳转失败**
- 检查session配置
- 清除浏览器缓存
- 查看控制台错误

**4. 语音功能不工作**
- 检查HTTPS设置
- 验证浏览器权限
- 确认API配置

### 调试技巧

**1. 日志查看**:
```bash
# 查看Flask日志
tail -f logs/app.log
```

**2. 前端调试**:
```javascript
// 在浏览器控制台
console.log(assistant);
console.log(assistant.chatHistory);
```

**3. 网络调试**:
- 使用浏览器开发者工具
- 查看Network面板
- 检查请求/响应

## 扩展指南

### 添加新的AI模型

**1. 在后端添加模型接口**:
```python
def chat_with_new_model(message: str) -> str:
    """新的AI模型接口"""
    try:
        # 调用新模型API
        response = requests.post(API_URL, ...)
        return response.json()
    except Exception as e:
        logger.error(f"模型调用失败: {e}")
        return f"调用失败: {str(e)}"
```

**2. 在chat路由中添加支持**:
```python
elif provider == "new_model":
    reply = chat_with_new_model(message)
```

**3. 在前端添加选项**:
```html
<option value="new_model">新模型</option>
```

### 添加新的通信方式

**1. 实现通信接口**:
```python
def send_to_fpga_tcp(array, host='192.168.1.100', port=8080):
    """TCP通信实现"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((host, port))
    sock.sendall(bytes(array))
    sock.close()
```

**2. 修改发送逻辑**:
```python
if COMM_TYPE == 'tcp':
    result = send_to_fpga_tcp(array, ...)
```

### 添加数据库支持

**1. 安装数据库驱动**:
```bash
pip install flask-sqlalchemy
```

**2. 配置数据库**:
```python
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy(app)
```

**3. 创建模型**:
```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)
```

## 贡献指南

### 代码规范
- 遵循PEP 8 Python编码规范
- 使用ESLint JavaScript规范
- 添加必要的注释
- 编写单元测试

### 提交规范
- 使用有意义的提交信息
- 一个提交一个功能
- 提交前运行测试
- 更新相关文档

## 更新日志

### v1.0.0 (2024-01-01)
- ✅ 初始版本发布
- ✅ 登录系统实现
- ✅ AI对话功能
- ✅ 图片生成功能
- ✅ FPGA通信功能
- ✅ 语音交互功能

## 许可证

MIT License

## 联系方式

- 项目地址: [GitHub Repository]
- 问题反馈: [Issue Tracker]
- 文档: [Documentation]

---

**注意**: 本文档持续更新中，请定期查看最新版本。
