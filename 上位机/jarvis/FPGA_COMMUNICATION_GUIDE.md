# FPGA通信配置指南

## 概述

激光成图助手现在支持将AI生成的图片转换为灰白图，然后转换为数组数据发送给FPGA。本文档说明如何配置和实现FPGA通信。

## 功能流程

1. **AI生成图片** → 2. **转换为灰白图** → 3. **转换为数组** → 4. **发送到FPGA**

## 前端功能

### 图片处理功能
- ✅ **自动转灰白图**: 生成图片后自动转换为灰白图预览
- ✅ **手动转换**: 点击"转灰白图"按钮手动转换
- ✅ **预览功能**: 支持原图和灰白图的大图预览
- ✅ **数组转换**: 将灰白图转换为像素数组
- ✅ **数据统计**: 显示数组的统计信息（最小值、最大值、平均值等）

### 操作按钮
- 🔍 **查看原图**: 预览原始生成的图片
- 🎨 **转灰白图**: 手动转换为灰白图
- 💻 **转数组**: 转换为像素数组并显示详细信息
- 📤 **确认传输**: 直接发送到FPGA

## 后端API

### 1. 图片生成API
```http
POST /api/generate-image
Content-Type: application/json

{
  "prompt": "生成一张可爱的小猫"
}
```

**响应**:
```json
{
  "success": true,
  "imageUrl": "data:image/png;base64,...",
  "imageData": "base64_encoded_data",
  "error": null
}
```

### 2. FPGA数据传输API
```http
POST /api/send-to-fpga
Content-Type: application/json

{
  "width": 1024,
  "height": 1024,
  "array": [255, 128, 64, ...]
}
```

**响应**:
```json
{
  "success": true,
  "message": "成功发送 1048576 个像素数据到FPGA",
  "fpga_response": "FPGA已接收数据",
  "data_info": {
    "width": 1024,
    "height": 1024,
    "pixel_count": 1048576,
    "min_value": 0,
    "max_value": 255,
    "avg_value": 127.5
  }
}
```

### 3. FPGA状态检查API
```http
GET /api/fpga-status
```

**响应**:
```json
{
  "success": true,
  "status": "online",
  "ready": true,
  "last_communication": "2024-01-01T00:00:00Z"
}
```

## FPGA通信实现

### 当前实现（模拟）
```python
def simulate_fpga_communication(array, width, height):
    """模拟FPGA通信"""
    import time
    import random
    
    # 模拟通信延迟
    time.sleep(0.1)
    
    # 模拟成功响应
    return {
        "success": True,
        "response": f"FPGA已接收 {len(array)} 个像素数据",
        "processing_time": random.uniform(0.05, 0.2)
    }
```

### 实际FPGA通信实现选项

#### 1. 串口通信
```python
import serial

def send_to_fpga_serial(array, port='COM3', baudrate=9600):
    """通过串口发送数据到FPGA"""
    try:
        ser = serial.Serial(port, baudrate, timeout=1)
        
        # 发送数据头
        ser.write(b'START')
        
        # 发送数组数据
        ser.write(bytes(array))
        
        # 发送数据尾
        ser.write(b'END')
        
        # 读取FPGA响应
        response = ser.read(100)
        
        ser.close()
        
        return {
            "success": True,
            "response": response.decode('utf-8', errors='ignore')
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

#### 2. TCP网络通信
```python
import socket

def send_to_fpga_tcp(array, host='192.168.1.100', port=8080):
    """通过TCP发送数据到FPGA"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((host, port))
        
        # 发送数据长度
        sock.send(len(array).to_bytes(4, byteorder='big'))
        
        # 发送数组数据
        sock.send(bytes(array))
        
        # 接收响应
        response = sock.recv(1024)
        
        sock.close()
        
        return {
            "success": True,
            "response": response.decode('utf-8', errors='ignore')
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

#### 3. UDP通信
```python
import socket

def send_to_fpga_udp(array, host='192.168.1.100', port=8080):
    """通过UDP发送数据到FPGA"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        # 分块发送（UDP有大小限制）
        chunk_size = 1024
        for i in range(0, len(array), chunk_size):
            chunk = array[i:i+chunk_size]
            sock.sendto(bytes(chunk), (host, port))
        
        sock.close()
        
        return {
            "success": True,
            "response": "UDP数据已发送"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

#### 4. USB通信
```python
import usb.core
import usb.util

def send_to_fpga_usb(array, vendor_id=0x1234, product_id=0x5678):
    """通过USB发送数据到FPGA"""
    try:
        # 查找设备
        dev = usb.core.find(idVendor=vendor_id, idProduct=product_id)
        
        if dev is None:
            return {
                "success": False,
                "error": "FPGA设备未找到"
            }
        
        # 配置设备
        dev.set_configuration()
        
        # 发送数据
        endpoint = dev[0][(0, 0)][0]
        dev.write(endpoint.bEndpointAddress, bytes(array))
        
        return {
            "success": True,
            "response": "USB数据已发送"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

## 配置参数

### 环境变量
```bash
# FPGA通信配置
FPGA_COMM_TYPE=serial  # serial, tcp, udp, usb
FPGA_SERIAL_PORT=COM3
FPGA_SERIAL_BAUDRATE=9600
FPGA_TCP_HOST=192.168.1.100
FPGA_TCP_PORT=8080
FPGA_UDP_HOST=192.168.1.100
FPGA_UDP_PORT=8080
FPGA_USB_VENDOR_ID=0x1234
FPGA_USB_PRODUCT_ID=0x5678
```

### 配置文件
```python
# config.py
FPGA_CONFIG = {
    'type': 'serial',  # serial, tcp, udp, usb
    'serial': {
        'port': 'COM3',
        'baudrate': 9600,
        'timeout': 1
    },
    'tcp': {
        'host': '192.168.1.100',
        'port': 8080,
        'timeout': 5
    },
    'udp': {
        'host': '192.168.1.100',
        'port': 8080
    },
    'usb': {
        'vendor_id': 0x1234,
        'product_id': 0x5678
    }
}
```

## 数据格式

### 数组格式
- **类型**: 8位无符号整数 (0-255)
- **顺序**: 从左到右，从上到下
- **大小**: width × height 个像素

### 传输协议
```
[数据头] + [宽度] + [高度] + [像素数据] + [数据尾]
```

### 示例数据
```json
{
  "width": 64,
  "height": 64,
  "array": [255, 128, 64, 32, 16, 8, 4, 2, 1, 0, ...]
}
```

## 错误处理

### 常见错误
1. **设备未连接**: FPGA设备未找到或未连接
2. **通信超时**: 数据传输超时
3. **数据格式错误**: 数组长度不匹配
4. **权限不足**: 串口或USB访问权限不足

### 错误恢复
- 自动重试机制
- 错误日志记录
- 用户友好的错误提示

## 测试和调试

### 测试工具
```python
# test_fpga_communication.py
def test_fpga_communication():
    """测试FPGA通信"""
    # 创建测试数据
    test_array = [i % 256 for i in range(1024)]
    
    # 测试通信
    result = send_to_fpga(test_array, 32, 32)
    
    print(f"通信结果: {result}")
    assert result['success'] == True
```

### 调试模式
```python
# 启用调试日志
import logging
logging.basicConfig(level=logging.DEBUG)

# 在app.py中设置
app.config['DEBUG'] = True
```

## 部署建议

### 生产环境
1. **错误处理**: 完善的错误处理和重试机制
2. **日志记录**: 详细的通信日志
3. **监控**: FPGA状态监控
4. **备份**: 数据备份和恢复

### 安全考虑
1. **数据验证**: 严格的数据格式验证
2. **访问控制**: FPGA访问权限控制
3. **加密**: 敏感数据传输加密

---

**注意**: 当前实现使用模拟通信，实际部署时需要根据具体的FPGA硬件和通信协议进行相应的修改。
