# 激光成图助手 - API集成指南

## 概述
这个前端应用需要后端API支持来实现图片生成功能。以下是需要实现的API端点和数据结构。

## 必需的API端点

### 1. 图片生成API
**端点**: `POST /api/generate-image`

**请求体**:
```json
{
  "prompt": "生成一张可爱的小猫",
  "style": "realistic",
  "size": "1024x1024"
}
```

**响应体**:
```json
{
  "success": true,
  "imageUrl": "https://example.com/generated-image.png",
  "imageData": "base64_encoded_image_data",
  "error": null
}
```

**错误响应**:
```json
{
  "success": false,
  "imageUrl": null,
  "imageData": null,
  "error": "生成失败的原因"
}
```

## 可选的API端点

### 2. 图片上传API
**端点**: `POST /api/upload-image`

**请求体**: FormData with image file

**响应体**:
```json
{
  "success": true,
  "imageUrl": "https://example.com/uploaded-image.png",
  "message": "上传成功"
}
```

### 3. 历史记录API
**端点**: `GET /api/history`

**响应体**:
```json
{
  "success": true,
  "history": [
    {
      "id": "chat_123",
      "prompt": "生成一张可爱的小猫",
      "imageUrl": "https://example.com/image.png",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 后端实现示例

### Python Flask 示例
```python
from flask import Flask, request, jsonify
import base64
import requests

app = Flask(__name__)

@app.route('/api/generate-image', methods=['POST'])
def generate_image():
    try:
        data = request.json
        prompt = data.get('prompt')
        
        # 调用AI图片生成服务（例如：DALL-E, Midjourney, Stable Diffusion等）
        # 这里需要替换为实际的AI服务调用
        image_url = call_ai_image_service(prompt)
        
        return jsonify({
            "success": True,
            "imageUrl": image_url,
            "imageData": None,  # 可选：base64编码的图片数据
            "error": None
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "imageUrl": None,
            "imageData": None,
            "error": str(e)
        })

def call_ai_image_service(prompt):
    # 示例：调用OpenAI DALL-E API
    # 需要替换为实际的API调用
    pass
```

### Node.js Express 示例
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style, size } = req.body;
    
    // 调用AI图片生成服务
    const imageUrl = await generateImageWithAI(prompt, style, size);
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      imageData: null,
      error: null
    });
  } catch (error) {
    res.json({
      success: false,
      imageUrl: null,
      imageData: null,
      error: error.message
    });
  }
});

async function generateImageWithAI(prompt, style, size) {
  // 实现AI图片生成逻辑
  // 可以使用 OpenAI DALL-E, Stability AI, 或其他服务
}
```

## AI服务集成建议

### 1. OpenAI DALL-E
```python
import openai

def generate_with_dalle(prompt):
    response = openai.Image.create(
        prompt=prompt,
        n=1,
        size="1024x1024"
    )
    return response['data'][0]['url']
```

### 2. Stability AI
```python
import requests

def generate_with_stability(prompt):
    response = requests.post(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {STABILITY_API_KEY}"
        },
        json={
            "text_prompts": [{"text": prompt}],
            "cfg_scale": 7,
            "height": 1024,
            "width": 1024,
            "samples": 1,
            "steps": 30,
        }
    )
    return response.json()['artifacts'][0]['base64']
```

### 3. 本地Stable Diffusion
```python
from diffusers import StableDiffusionPipeline
import torch

def generate_with_local_sd(prompt):
    pipe = StableDiffusionPipeline.from_pretrained("runwayml/stable-diffusion-v1-5")
    pipe = pipe.to("cuda")
    
    image = pipe(prompt).images[0]
    # 保存图片并返回URL
    return save_image_and_get_url(image)
```

## 配置说明

### 环境变量
```bash
# AI服务API密钥
OPENAI_API_KEY=your_openai_key
STABILITY_API_KEY=your_stability_key

# 服务器配置
PORT=3000
HOST=0.0.0.0
```

### CORS配置
确保后端允许前端域名的跨域请求：
```python
from flask_cors import CORS
CORS(app, origins=["http://localhost:3000", "https://yourdomain.com"])
```

## 部署建议

1. **开发环境**: 使用本地服务器，前端和后端分离
2. **生产环境**: 使用Nginx反向代理，配置HTTPS
3. **图片存储**: 建议使用云存储服务（AWS S3, 阿里云OSS等）
4. **缓存策略**: 对生成的图片进行缓存，避免重复生成

## 安全考虑

1. **API密钥保护**: 不要在客户端暴露API密钥
2. **输入验证**: 验证用户输入的prompt内容
3. **频率限制**: 实现API调用频率限制
4. **内容过滤**: 过滤不当的图片生成请求

## 测试

使用以下curl命令测试API：

```bash
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "生成一张可爱的小猫", "style": "realistic", "size": "1024x1024"}'
```

## 故障排除

1. **CORS错误**: 检查后端CORS配置
2. **API密钥错误**: 验证AI服务的API密钥
3. **网络超时**: 增加请求超时时间
4. **图片加载失败**: 检查图片URL的有效性

---

**注意**: 这个前端应用已经实现了完整的用户界面和交互逻辑，只需要按照上述API规范实现后端服务即可使用。
