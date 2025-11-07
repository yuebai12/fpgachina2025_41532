from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import requests
import base64
import json
import secrets
import os
import time
from openai import OpenAI
from PIL import Image
import numpy as np
import io
from functools import wraps
import logging
import serial
import serial.tools.list_ports
import threading
import queue

app = Flask(__name__)

# ====== 日志配置 ======
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
logger = app.logger

# ====== 串口通信配置 ======
serial_connection = None
serial_queue = queue.Queue()
transmission_log = []

# 设置会话密钥（可通过环境变量覆盖）
app.secret_key = os.getenv("FLASK_SECRET_KEY", "static_dev_secret_key")

# ====== 配置区（可通过环境变量覆盖）======
# 提示：生产环境请在系统环境变量中设置对应 KEY，便于运维修改
# 示例：set DOUBAO_API_KEY=xxx  set QWQ_API_KEY=xxx
# 讯飞语音合成配置
XFY_TTS_APP_ID = "52fbf31a"
XFY_TTS_API_KEY = "ec7c3ca805a58a96a5a6d22afb181fd7"
XFY_TTS_API_SECRET = "YTViZDQ3Mjk4YWNkYzFlYTFkOWJmNTNl"

# 讯飞语音唤醒配置
XFY_WAKE_APP_ID = "88b466a0"
XFY_WAKE_API_KEY = "bcaa94619fe2cd14e7e5f09406199865"
XFY_WAKE_API_SECRET = "YmI2MzkzZDIzNzI0Nzc3NjZlZTg0NThj"

# SiliconFlow 语音转文字配置
SILICONFLOW_ASR_KEY = "sk-wbvxcozbweaxqhwnrogjgmdxcbckzclkefjykpxuoqtsuyla"

# 其他配置（可选，通过环境变量覆盖）
BAIDU_APP_ID = os.getenv("BAIDU_APP_ID", "")
BAIDU_API_KEY = os.getenv("BAIDU_API_KEY", "")
BAIDU_SECRET_KEY = os.getenv("BAIDU_SECRET_KEY", "")

# 讯飞星火（占位，后续可接入）
XFY_APP_ID = os.getenv("XFY_APP_ID", "")
XFY_API_KEY = os.getenv("XFY_API_KEY", "")
XFY_API_SECRET = os.getenv("XFY_API_SECRET", "")

# 智匠（旧）/ 豆包（新）图片生成
MINDCRAFT_API_KEY = os.getenv("MINDCRAFT_API_KEY", "your_mindcraft_api_key")
DOUBAO_API_KEY = os.getenv("DOUBAO_API_KEY", "879e481d-4733-4520-9655-10d0f29fb5b6")
SILICONFLOW_TTS_KEY = os.getenv("SILICONFLOW_TTS_KEY", "your_siliconflow_key")

# QwQ-32B 大语言模型配置
QWQ_API_KEY = os.getenv("QWQ_API_KEY", "sk-Hga8t11MnLJv7dfsjayvC1jvnJ3mZRdvSlNZpPSL20SOYuId")
QWQ_API_URL = "https://api.suanli.cn/v1/chat/completions"


# OpenRouter / OpenAI (用于通用对话)
def get_openrouter_client():
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY", "")
    )


# ====== 百度文心 AccessToken 缓存 ======
_baidu_access_token = None
_baidu_token_expire_ts = 0


def _get_baidu_access_token():
    global _baidu_access_token, _baidu_token_expire_ts
    now = int(time.time())
    if _baidu_access_token and now < _baidu_token_expire_ts - 60:
        return _baidu_access_token

    token_url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {
        "grant_type": "client_credentials",
        "client_id": BAIDU_API_KEY,
        "client_secret": BAIDU_SECRET_KEY,
    }
    try:
        r = requests.post(token_url, params=params, timeout=30)
        r.raise_for_status()
    except Exception as e:
        logger.error(f"获取Baidu AccessToken失败: {e}")
        raise
    data = r.json()
    _baidu_access_token = data.get("access_token", "")
    expires_in = int(data.get("expires_in", 0))
    _baidu_token_expire_ts = now + expires_in
    return _baidu_access_token


def chat_with_baidu(message: str) -> str:
    token = _get_baidu_access_token()
    url = f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token={token}"
    payload = {
        "messages": [{"role": "user", "content": message}],
        "temperature": 0.7,
        "top_p": 0.9
    }
    headers = {"Content-Type": "application/json"}
    try:
        logger.info(f"BaiduChat 请求: payload={json.dumps(payload, ensure_ascii=False)}")
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=60)
        logger.info(f"BaiduChat 响应: status={resp.status_code}")
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.error(f"BaiduChat 调用失败: {e}")
        raise
    if "result" in data:
        return data["result"]
    if "error_msg" in data:
        raise RuntimeError(f"Baidu error: {data.get('error_code')} {data.get('error_msg')}")
    return json.dumps(data, ensure_ascii=False)


def chat_with_openrouter(message: str) -> str:
    try:
        client = get_openrouter_client()
        logger.info(f"OpenRouter 请求: message={message[:200]}")
        response = client.chat.completions.create(
            model="moonshotai/moonlight-16b-a3b-instruct:free",
            messages=[{"role": "user", "content": message}]
        )
        logger.info("OpenRouter 响应成功")
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenRouter 调用失败: {e}")
        return f"OpenRouter 调用失败: {e}"


def chat_with_qwq(message: str) -> str:
    """使用QwQ-32B模型进行对话"""
    try:
        headers = {
            "Authorization": f"Bearer {QWQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "free:QwQ-32B",
            "messages": [{"role": "user", "content": message}]
        }
        logger.info(f"QwQ-32B 请求: headers=Authorization ****, payload={json.dumps(payload, ensure_ascii=False)}")
        response = requests.post(QWQ_API_URL, headers=headers, json=payload, timeout=60)
        logger.info(f"QwQ-32B 响应: status={response.status_code}")
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"QwQ-32B 调用失败: {e}")
        return f"QwQ-32B 调用失败: {e}"


def chat_with_xfy_placeholder(message: str) -> str:
    return "[提示] 讯飞星火尚未完成直连接入（需 WebSocket/SDK）。请先使用百度或OpenRouter。"


def tts_with_xunfei(text: str) -> bytes:
    """使用讯飞语音合成API生成语音"""
    import hashlib, hmac
    from urllib.parse import urlencode
    from datetime import datetime
    from time import mktime
    from wsgiref.handlers import format_date_time

    if not all([XFY_TTS_APP_ID, XFY_TTS_API_KEY, XFY_TTS_API_SECRET]):
        raise ValueError("讯飞TTS配置不完整")

    url = "https://api.xf-yun.com/v1/service/v1/tts"
    now = datetime.now()
    date = format_date_time(mktime(now.timetuple()))
    signature_origin = f"host: api.xf-yun.com\ndate: {date}\nGET /v1/service/v1/tts HTTP/1.1"
    signature_sha = hmac.new(XFY_TTS_API_SECRET.encode('utf-8'),
                             signature_origin.encode('utf-8'),
                             digestmod=hashlib.sha256).digest()
    signature_sha_base64 = base64.b64encode(signature_sha).decode('utf-8')
    authorization_origin = f'api_key="{XFY_TTS_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'
    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
    params = {"authorization": authorization, "date": date, "host": "api.xf-yun.com"}

    payload = {
        "common": {"app_id": XFY_TTS_APP_ID},
        "business": {"aue": "raw", "auf": "audio/L16;rate=16000", "vcn": "xiaoyan", "speed": 50, "volume": 50,
                     "pitch": 50, "bgs": 0},
        "data": {"status": 2, "text": base64.b64encode(text.encode('utf-8')).decode('utf-8')}
    }

    try:
        response = requests.post(url, params=params, json=payload, timeout=30)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"讯飞TTS请求失败: {e}")
        raise
    result = response.json()
    if result.get("code") == 0:
        return base64.b64decode(result["data"]["audio"])
    else:
        raise Exception(f"讯飞TTS错误: {result.get('message', '未知错误')}")


def asr_with_siliconflow(audio_file_path: str) -> str:
    if not SILICONFLOW_ASR_KEY:
        raise ValueError("SiliconFlow ASR密钥未配置")
    url = "https://api.siliconflow.cn/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {SILICONFLOW_ASR_KEY}"}
    with open(audio_file_path, 'rb') as audio_file:
        files = {'file': audio_file, 'model': (None, 'FunAudioLLM/SenseVoiceSmall')}
        try:
            response = requests.post(url, headers=headers, files=files, timeout=30)
            response.raise_for_status()
        except Exception as e:
            app.logger.error(f"SiliconFlow ASR 请求失败: {e}")
            raise
        return response.json().get("text", "")


# ====== 登录验证装饰器 ======
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)

    return decorated_function


# ====== 路由部分 ======
@app.route('/login')
def login():
    return render_template('login.html')


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    if username == 'admin' and password == '123456':
        session['logged_in'] = True
        session['username'] = username
        session['token'] = secrets.token_hex(16)
        return jsonify({'success': True, 'message': '登录成功', 'token': session['token']})
    else:
        return jsonify({'success': False, 'message': '用户名或密码错误'})


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': '已登出'})


@app.route('/')
@login_required
def index():
    return render_template('index.html')


@app.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.get_json()
    app.logger.info(f"/chat payload={json.dumps(data, ensure_ascii=False)}")
    message = data.get("message", "").strip()
    mode = data.get("mode", "chat").strip()
    provider = data.get("provider", "openrouter").strip()

    if mode == "image":
        try:
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {DOUBAO_API_KEY}"}
            payload = {
                "model": "doubao-seedream-4-0-250828",
                "prompt": message,
                "response_format": "url",
                "size": "2K",
                "stream": False,
                "watermark": False
            }
            app.logger.info(f"调用豆包(聊天) 生成图片 payload={json.dumps(payload, ensure_ascii=False)}")
            r = requests.post("https://ark.cn-beijing.volces.com/api/v3/images/generations",
                              headers=headers, data=json.dumps(payload), timeout=60)
            app.logger.info(f"豆包(聊天) 响应状态: {r.status_code}")
            r.raise_for_status()
            data_resp = r.json()
            image_url = data_resp.get("data", [{}])[0].get("url") or data_resp.get("url")
            if not image_url:
                return jsonify({"success": False, "error": "豆包API未返回图片URL"}), 502
            return jsonify({"success": True, "imageUrl": image_url})
        except Exception as e:
            return jsonify({"success": False, "error": f"豆包生成失败: {str(e)}"}), 500

    try:
        if provider == "baidu":
            reply = chat_with_baidu(message)
        elif provider == "xfy":
            reply = chat_with_xfy_placeholder(message)
        elif provider == "qwq":
            reply = chat_with_qwq(message)
        else:
            reply = chat_with_openrouter(message)
        return jsonify({"reply": reply})
    except Exception as e:
        app.logger.error(f"/chat 调用失败: {e}")
        return jsonify({"reply": f"调用失败: {str(e)}"}), 500


@app.route('/tts', methods=['POST'])
@login_required
def tts():
    data = request.get_json()
    app.logger.info(f"/tts payload={json.dumps(data, ensure_ascii=False)}")
    text = data.get("text", "")
    provider = data.get("provider", "xunfei")

    try:
        if provider == "xunfei":
            audio_data = tts_with_xunfei(text)
            audio_base64 = base64.b64encode(audio_data).decode()
        else:
            headers = {"Authorization": f"Bearer {SILICONFLOW_TTS_KEY}"}
            payload = {"model": "gpt-4o-mini-tts", "input": text, "voice": "alloy"}
            r = requests.post("https://api.siliconflow.cn/v1/audio/speech", headers=headers, json=payload)
            r.raise_for_status()
            audio_base64 = base64.b64encode(r.content).decode()
        return jsonify({"audio": audio_base64, "provider": provider})
    except Exception as e:
        app.logger.error(f"TTS错误: {str(e)}")
        return jsonify({"error": f"TTS失败: {str(e)}"}), 500


@app.route('/asr', methods=['POST'])
@login_required
def asr():
    if 'audio' not in request.files:
        return jsonify({"error": "未找到音频文件"}), 400
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({"error": "未选择文件"}), 400
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
        audio_file.save(tmp_file.name)
    try:
        text = asr_with_siliconflow(tmp_file.name)
        return jsonify({"text": text})
    finally:
        os.unlink(tmp_file.name)


@app.route('/api/generate-image', methods=['POST'])
@login_required
def generate_image():
    data = request.get_json()
    app.logger.info(f"/api/generate-image payload={json.dumps(data, ensure_ascii=False)}")
    prompt = data.get('prompt', '')
    
    if not prompt:
        return jsonify({"success": False, "error": "缺少图片描述"}), 400
    
    try:
        # 使用豆包API生成图片
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {DOUBAO_API_KEY}"}
        payload = {
            "model": "doubao-seedream-4-0-250828",
            "prompt": prompt,
            "response_format": "url",
            "size": "2K",
            "stream": False,
            "watermark": False
        }
        print(f"调用豆包API，prompt: {prompt}")  # 调试日志
        r = requests.post("https://ark.cn-beijing.volces.com/api/v3/images/generations",
                          headers=headers, data=json.dumps(payload), timeout=60)
        print(f"豆包API响应状态: {r.status_code}")  # 调试日志
        r.raise_for_status()
        data_resp = r.json()
        print(f"豆包API响应数据: {data_resp}")  # 调试日志
        image_url = data_resp.get("data", [{}])[0].get("url") or data_resp.get("url")
        
        if not image_url:
            return jsonify({"success": False, "error": "豆包API未返回图片URL"}), 502
            
        return jsonify({
            "success": True,
            "imageUrl": image_url,
            "imageData": "",  # 豆包返回的是URL，不是base64
            "fallback": False
        })
    except Exception as e:
        print(f"图片生成错误: {str(e)}")  # 添加日志
        # 如果豆包API失败，回退到占位图
        try:
            placeholder = requests.get("https://picsum.photos/1024", timeout=15)
            placeholder.raise_for_status()
            image_base64 = base64.b64encode(placeholder.content).decode()
            image_url = f"data:image/jpeg;base64,{image_base64}"
            return jsonify({
                "success": True,
                "imageUrl": image_url,
                "imageData": image_base64,
                "fallback": True,
                "error": f"豆包API失败，已使用占位图: {str(e)}"
            })
        except Exception as fallback_error:
            return jsonify({
                "success": False,
                "error": f"生成失败: {str(e)}, 占位图也失败: {str(fallback_error)}"
            }), 500


@app.route('/api/send-to-fpga', methods=['POST'])
@login_required
def send_to_fpga():
    data = request.get_json()
    width = data.get('width', 0)
    height = data.get('height', 0)
    array = data.get('array', [])
    build_frames = bool(data.get('frames', True))
    try:
        if not array or width <= 0 or height <= 0:
            return jsonify({"success": False, "error": "无效的数据格式"})
        if len(array) != width * height:
            return jsonify({
                "success": False,
                "error": f"数组长度不匹配: 期望 {width * height}, 实际 {len(array)}"
            })
        frames_preview = []
        if build_frames:
            # 获取完整的帧数据，不限制预览数量
            frames_preview = _build_fpga_frames_from_grayscale(array, width, height)

        # 记录FPGA帧格式数据
        if frames_preview:
            app.logger.info(f"=== FPGA 工业级 UART 协议数据 ===")
            app.logger.info(f"图像尺寸: {width}x{height}, 总帧数: {len(frames_preview)}")
            app.logger.info(f"数据帧数: {len(frames_preview) - 1}, 元信息帧数: 1")
            
            for i, frame in enumerate(frames_preview[:10]):  # 只记录前10帧
                frame_type = "元信息" if frame[1] == 0x00 else "数据"
                frame_hex = ' '.join([f"{int(b):02X}" for b in frame])
                app.logger.info(f"  帧{i+1} [{frame_type}]: {frame_hex}")
                
                # 详细解析第一帧（元信息帧）
                if i == 0 and frame[1] == 0x00:
                    w = frame[3] + (frame[4] << 8)
                    h = frame[5] + (frame[6] << 8)
                    checksum = frame[7]
                    calc_checksum = sum(frame[:7]) & 0xFF
                    app.logger.info(f"    解析: 宽度={w}, 高度={h}, 校验={int(checksum):02X}(计算:{calc_checksum:02X})")
                
                # 详细解析数据帧
                elif frame[1] == 0x01:
                    frame_cnt = frame[2]
                    pixels = frame[3:6]
                    checksum = frame[6]
                    calc_checksum = sum(frame[:6]) & 0xFF
                    app.logger.info(f"    解析: 帧号={frame_cnt}, 像素={[f'{int(p):02X}' for p in pixels]}, 校验={int(checksum):02X}(计算:{calc_checksum:02X})")
            
            app.logger.info(f"=== 协议传输完成 ===")

        fpga_result = simulate_fpga_communication(array, width, height)
        if fpga_result['success']:
            return jsonify({
                "success": True,
                "message": f"成功发送 {len(array)} 个像素数据到FPGA",
                "fpga_response": fpga_result.get('response', ''),
                "data_info": {
                    "width": width,
                    "height": height,
                    "pixel_count": len(array),
                    "min_value": min(array),
                    "max_value": max(array),
                    "avg_value": sum(array) / len(array)
                },
                "uart_frame_preview": frames_preview
            })
        else:
            return jsonify({"success": False, "error": fpga_result.get('error', 'FPGA通信失败')})
    except Exception as e:
        return jsonify({"success": False, "error": f"发送到FPGA失败: {str(e)}"})


def simulate_fpga_communication(array, width, height):
    import time, random
    try:
        time.sleep(0.1)
        return {
            "success": True,
            "response": f"FPGA已接收 {len(array)} 个像素数据",
            "processing_time": random.uniform(0.05, 0.2)
        }
    except Exception as e:
        return {"success": False, "error": f"FPGA通信错误: {str(e)}"}


def _build_fpga_frames_from_grayscale(array, width, height):
    """
    将灰度数组按工业级 FPGA UART 帧格式序列化。
    协议设计：
    - 元信息帧：AA 00 00 W_L W_H H_L H_H SUM 55 (传输图像尺寸)
    - 数据帧：AA 01 CNT P1 P2 P3 SUM 55 (每帧3像素，行优先)
    其中 SUM = 前6字节累加和的低8位
    返回：list[list[int]] 每帧8字节(0-255)
    """
    frames = []
    
    # 1. 发送元信息帧（图像尺寸）
    w_l, w_h = width & 0xFF, (width >> 8) & 0xFF
    h_l, h_h = height & 0xFF, (height >> 8) & 0xFF
    meta_frame = [0xAA, 0x00, 0x00, w_l, w_h, h_l, h_h, 0x00, 0x55]
    # 计算校验和
    meta_frame[7] = sum(meta_frame[:7]) & 0xFF
    frames.append(meta_frame)
    
    # 2. 发送数据帧（每帧3像素）
    per_frame_pixels = 3
    frame_count = 0
    
    # 对于64x64图像，总像素数为4096，需要约1366帧（4096/3）
    total_pixels = width * height
    app.logger.info(f"FPGA帧格式: {width}x{height} = {total_pixels}像素, 预计{total_pixels//per_frame_pixels + 1}帧")
    
    for i in range(0, len(array), per_frame_pixels):
        frame_count = (frame_count + 1) & 0xFF  # 循环计数，避免与元信息帧冲突
        
        # 获取当前帧的像素数据
        pixels = []
        for j in range(per_frame_pixels):
            if i + j < len(array):
                pixels.append(int(array[i + j]) & 0xFF)
            else:
                pixels.append(0)  # 不足补零
        
        # 构建数据帧
        data_frame = [0xAA, 0x01, frame_count] + pixels + [0x00, 0x55]
        # 计算校验和
        data_frame[6] = sum(data_frame[:6]) & 0xFF
        frames.append(data_frame)
    
    app.logger.info(f"实际生成帧数: {len(frames)} (元信息帧: 1, 数据帧: {len(frames)-1})")
    return frames


@app.route('/api/serial-ports', methods=['GET'])
@login_required
def get_serial_ports():
    """获取可用串口列表"""
    try:
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append({
                "device": port.device,
                "description": port.description,
                "hwid": port.hwid,
                "manufacturer": port.manufacturer,
                "product": port.product,
                "serial_number": port.serial_number
            })
        
        app.logger.info(f"检测到 {len(ports)} 个串口设备")
        for port in ports:
            app.logger.info(f"串口: {port['device']} - {port['description']}")
        
        return jsonify({
            "success": True,
            "ports": ports
        })
    except Exception as e:
        app.logger.error(f"获取串口列表失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"获取串口列表失败: {str(e)}"
        }), 500

@app.route('/api/serial-connect', methods=['POST'])
@login_required
def connect_serial():
    """连接串口"""
    global serial_connection
    
    try:
        data = request.get_json()
        port = data.get('port', 'COM3')
        baudrate = int(data.get('baudrate', 115200))
        data_bits = int(data.get('data_bits', 8))
        stop_bits = int(data.get('stop_bits', 1))
        parity_str = data.get('parity', 'None')
        
        # 转换校验位参数
        if parity_str == 'None':
            parity = serial.PARITY_NONE
        elif parity_str == 'Odd':
            parity = serial.PARITY_ODD
        elif parity_str == 'Even':
            parity = serial.PARITY_EVEN
        else:
            parity = serial.PARITY_NONE
        
        # 关闭现有连接
        if serial_connection and serial_connection.is_open:
            serial_connection.close()
        
        # 建立新连接
        serial_connection = serial.Serial(
            port=port,
            baudrate=baudrate,
            bytesize=data_bits,
            parity=parity,
            stopbits=stop_bits,
            timeout=1,
            write_timeout=1
        )
        
        app.logger.info(f"串口连接成功: {port} @ {baudrate} bps")
        
        return jsonify({
            "success": True,
            "message": f"串口连接成功: {port} @ {baudrate} bps",
            "port": port,
            "baudrate": baudrate
        })
        
    except Exception as e:
        app.logger.error(f"串口连接失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"串口连接失败: {str(e)}"
        }), 500

@app.route('/api/serial-disconnect', methods=['POST'])
@login_required
def disconnect_serial():
    """断开串口连接"""
    global serial_connection
    
    try:
        if serial_connection and serial_connection.is_open:
            serial_connection.close()
            app.logger.info("串口连接已断开")
            return jsonify({
                "success": True,
                "message": "串口连接已断开"
            })
        else:
            return jsonify({
                "success": False,
                "error": "串口未连接"
            })
    except Exception as e:
        app.logger.error(f"断开串口连接失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"断开串口连接失败: {str(e)}"
        }), 500

@app.route('/api/serial-status', methods=['GET'])
@login_required
def get_serial_status():
    """获取串口状态"""
    global serial_connection
    
    if serial_connection and serial_connection.is_open:
        return jsonify({
            "success": True,
            "connected": True,
            "port": serial_connection.port,
            "baudrate": serial_connection.baudrate,
            "message": "串口已连接"
        })
    else:
        return jsonify({
            "success": True,
            "connected": False,
            "message": "串口未连接"
        })

@app.route('/api/serial-transmit', methods=['POST'])
@login_required
def transmit_serial_data():
    """通过串口传输数据"""
    global serial_connection, transmission_log
    
    try:
        data = request.get_json()
        frames = data.get('frames', [])
        interval = float(data.get('interval', 0.1))  # 传输间隔（秒）
        
        if not serial_connection or not serial_connection.is_open:
            return jsonify({
                "success": False,
                "error": "串口未连接"
            }), 400
        
        if not frames:
            return jsonify({
                "success": False,
                "error": "没有要传输的数据"
            }), 400
        
        # 清空传输日志
        transmission_log.clear()
        
        app.logger.info(f"开始串口传输: {len(frames)} 帧数据")
        
        # 立即返回成功响应，让前端开始实时获取日志
        return jsonify({
            "success": True,
            "message": "传输已开始，请查看实时日志",
            "total_frames": len(frames)
        })
        
    except Exception as e:
        app.logger.error(f"串口传输失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"串口传输失败: {str(e)}"
        }), 500

@app.route('/api/start-serial-transmission', methods=['POST'])
@login_required
def start_serial_transmission():
    """启动串口传输（异步）"""
    global serial_connection, transmission_log
    
    try:
        data = request.get_json()
        frames = data.get('frames', [])
        interval = float(data.get('interval', 0.1))  # 传输间隔（秒）
        
        if not serial_connection or not serial_connection.is_open:
            return jsonify({
                "success": False,
                "error": "串口未连接"
            }), 400
        
        if not frames:
            return jsonify({
                "success": False,
                "error": "没有要传输的数据"
            }), 400
        
        # 清空传输日志
        transmission_log.clear()
        
        app.logger.info(f"开始串口传输: {len(frames)} 帧数据")
        
        # 传输数据
        transmitted_count = 0
        error_count = 0
        
        for i, frame in enumerate(frames):
            try:
                # 调试：打印帧数据类型
                if i == 0:
                    app.logger.info(f"第1帧数据类型: {type(frame)}, 长度: {len(frame)}, 内容: {frame}")
                
                # 将帧数据转换为字节
                frame_bytes = bytes(frame)
                
                # 发送数据
                bytes_written = serial_connection.write(frame_bytes)
                
                # 记录传输日志
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S") + f".{int(time.time() * 1000) % 1000:03d}"
                
                # 安全地获取帧类型
                try:
                    frame_type = "元信息" if int(frame[1]) == 0x00 else "数据"
                except (ValueError, TypeError, IndexError) as e:
                    app.logger.error(f"获取帧类型失败: {e}, frame[1]={frame[1]}, type={type(frame[1])}")
                    frame_type = "未知"
                
                # 安全地格式化帧数据
                try:
                    frame_hex = ' '.join([f"{int(b):02X}" for b in frame])
                except (ValueError, TypeError) as e:
                    app.logger.error(f"格式化帧数据失败: {e}")
                    frame_hex = str(frame)
                
                log_entry = {
                    "timestamp": timestamp,
                    "frame_number": i + 1,
                    "frame_type": frame_type,
                    "frame_hex": frame_hex,
                    "bytes_written": bytes_written,
                    "status": "成功" if bytes_written == len(frame_bytes) else "失败"
                }
                transmission_log.append(log_entry)
                
                app.logger.info(f"帧{i+1}: {log_entry['frame_hex']} - {log_entry['status']}")
                
                if bytes_written == len(frame_bytes):
                    transmitted_count += 1
                else:
                    error_count += 1
                
                # 等待指定间隔
                if interval > 0:
                    time.sleep(interval)
                    
            except Exception as e:
                error_count += 1
                app.logger.error(f"传输帧{i+1}失败: {str(e)}")
                
                # 记录错误日志
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S") + f".{int(time.time() * 1000) % 1000:03d}"
                log_entry = {
                    "timestamp": timestamp,
                    "frame_number": i + 1,
                    "frame_type": "错误",
                    "frame_hex": "传输失败",
                    "bytes_written": 0,
                    "status": f"错误: {str(e)}"
                }
                transmission_log.append(log_entry)
        
        app.logger.info(f"串口传输完成: 成功 {transmitted_count} 帧, 失败 {error_count} 帧")
        
        return jsonify({
            "success": True,
            "message": f"传输完成: 成功 {transmitted_count} 帧, 失败 {error_count} 帧",
            "transmitted_count": transmitted_count,
            "error_count": error_count,
            "total_frames": len(frames)
        })
        
    except Exception as e:
        app.logger.error(f"串口传输失败: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"串口传输失败: {str(e)}"
        }), 500

@app.route('/api/transmission-log', methods=['GET'])
@login_required
def get_transmission_log():
    """获取传输日志"""
    global transmission_log
    
    return jsonify({
        "success": True,
        "log": transmission_log,
        "total_entries": len(transmission_log)
    })

@app.route('/api/fpga-status', methods=['GET'])
@login_required
def fpga_status():
    try:
        return jsonify({
            "success": True,
            "status": "online",
            "ready": True,
            "last_communication": "2024-01-01T00:00:00Z"
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"无法获取FPGA状态: {str(e)}"})


@app.route('/api/image-to-array', methods=['POST'])
@login_required
def image_to_array():
    try:
        data = request.get_json() or {}
        app.logger.info(f"/api/image-to-array payload={json.dumps(data, ensure_ascii=False)[:800]}")
        image_data_b64 = data.get('imageData', '')
        image_url = data.get('imageUrl', '')
        to_grayscale = bool(data.get('grayscale', True))

        if not image_data_b64 and not image_url:
            return jsonify({"success": False, "error": "缺少 imageData 或 imageUrl"}), 400

        image_bytes = None
        if image_data_b64:
            try:
                image_bytes = base64.b64decode(image_data_b64)
            except Exception as e:
                return jsonify({"success": False, "error": f"imageData 解析失败: {str(e)}"}), 400
        else:
            try:
                app.logger.info(f"下载图片: {image_url}")
                r = requests.get(image_url, timeout=20)
                r.raise_for_status()
                image_bytes = r.content
            except Exception as e:
                return jsonify({"success": False, "error": f"下载图片失败: {str(e)}"}), 400

        with Image.open(io.BytesIO(image_bytes)) as img:
            if to_grayscale:
                # 转灰度
                img = img.convert('L')
                
                # 等比例缩放到64x64（保持宽高比）
                img.thumbnail((64, 64), Image.LANCZOS)
                
                # 创建64x64黑底画布（居中填充）
                canvas = Image.new('L', (64, 64), color=0)
                x_offset = (64 - img.width) // 2
                y_offset = (64 - img.height) // 2
                canvas.paste(img, (x_offset, y_offset))
                
                # 转换为numpy数组
                np_array = np.array(canvas)
                height, width = 64, 64
                flat = np_array.flatten().tolist()
                mode = 'L'
                
                app.logger.info(f"图像等比例缩放: 原图 -> 64x64, 实际尺寸: {img.width}x{img.height}, 偏移: ({x_offset}, {y_offset})")
                app.logger.info(f"数组长度: {len(flat)}, 期望: {width * height}")
            else:
                img = img.convert('RGBA') if img.mode == 'P' else img
                np_array = np.array(img)
                height, width = (np_array.shape[0], np_array.shape[1])
                # 将多通道展开为一维数组返回
                flat = np_array.flatten().tolist()
                mode = img.mode

        return jsonify({
            "success": True,
            "width": width,
            "height": height,
            "mode": mode,
            "array": flat
        })
    except Exception as e:
        app.logger.error(f"/api/image-to-array 失败: {e}")
        return jsonify({"success": False, "error": f"转数组失败: {str(e)}"}), 500


@app.route('/api/image-to-grayscale', methods=['POST'])
@login_required
def image_to_grayscale():
    """将图片转为灰白，返回base64 PNG数据，避免前端跨域画布污染问题"""
    try:
        data = request.get_json() or {}
        app.logger.info(f"/api/image-to-grayscale payload={json.dumps(data, ensure_ascii=False)[:800]}")
        image_data_b64 = data.get('imageData', '')
        image_url = data.get('imageUrl', '')

        if not image_data_b64 and not image_url:
            return jsonify({"success": False, "error": "缺少 imageData 或 imageUrl"}), 400

        if image_data_b64:
            image_bytes = base64.b64decode(image_data_b64)
        else:
            app.logger.info(f"下载图片: {image_url}")
            r = requests.get(image_url, timeout=20)
            r.raise_for_status()
            image_bytes = r.content

        with Image.open(io.BytesIO(image_bytes)) as img:
            # 转灰度
            img = img.convert('L')
            
            # 等比例缩放到64x64（保持宽高比）
            img.thumbnail((64, 64), Image.LANCZOS)
            
            # 创建64x64黑底画布（居中填充）
            canvas = Image.new('L', (64, 64), color=0)
            x_offset = (64 - img.width) // 2
            y_offset = (64 - img.height) // 2
            canvas.paste(img, (x_offset, y_offset))
            
            # 保存为base64
            buf = io.BytesIO()
            canvas.save(buf, format='PNG')
            buf.seek(0)
            out_b64 = base64.b64encode(buf.read()).decode()
            
            app.logger.info(f"灰度图等比例缩放: 原图 -> 64x64, 实际尺寸: {img.width}x{img.height}, 偏移: ({x_offset}, {y_offset})")
            
            return jsonify({
                "success": True,
                "image": out_b64,
                "width": 64,
                "height": 64
            })
    except Exception as e:
        app.logger.error(f"/api/image-to-grayscale 失败: {e}")
        return jsonify({"success": False, "error": f"灰白图转换失败: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
