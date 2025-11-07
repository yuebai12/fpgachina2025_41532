// 激光成图助手 - 主要功能实现

class LaserImageAssistant {
  constructor() {
    console.log('LaserImageAssistant 构造函数被调用');
    this.currentChatId = null;
    this.chatHistory = [];
    this.isGenerating = false;
    this.isUploading = false; // 防止重复上传
    this.voiceRecognition = null;
    this.currentMode = 'image'; // 默认图片模式
    this.hasUploadedImage = false; // 跟踪是否已上传图片
    this.uploadedImageData = null; // 存储已上传的图片数据
    this.uploadedImageFile = null; // 存储已上传的文件对象
    
    this.initElements();
    this.initEventListeners();
    this.loadChatHistory();
    this.initVoiceRecognition();
  }

  // 初始化DOM元素
  initElements() {
    this.chatContainer = document.getElementById('chat-container');
    this.messageInput = document.getElementById('message-input');
    this.generateBtn = document.getElementById('generate-btn');
    this.chatBtn = document.getElementById('chat-btn');
    this.voiceBtn = document.getElementById('voice-btn');
    this.uploadBtn = document.getElementById('upload-btn');
    this.fileInput = document.getElementById('file-input');
    this.newChatBtn = document.getElementById('new-chat-btn');
    this.historyList = document.getElementById('history-list');
    this.clearHistoryBtn = document.getElementById('clear-history-btn');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.imageModal = document.getElementById('image-modal');
    this.modalImage = document.getElementById('modal-image');
    this.closeModal = document.getElementById('close-modal');
    this.confirmUpload = document.getElementById('confirm-upload');
    this.rotateBtn = document.getElementById('rotate-btn');
    this.downloadBtn = document.getElementById('download-btn');
    // 可选：模型/提供商选择（如果在页面中加入对应select）
    this.providerSelect = document.getElementById('provider-select');
    this.voiceSelect = null;
    this.voiceVolume = null;
    
    // 调试：检查元素是否正确获取
    console.log('上传按钮元素:', this.uploadBtn);
    console.log('文件输入元素:', this.fileInput);
  }

  // 显示提示消息
  showToast(message, type = 'info') {
    // 创建提示框
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm transition-all duration-300 transform translate-x-full`;
    
    // 根据类型设置样式
    switch (type) {
      case 'success':
        toast.classList.add('bg-green-500');
        break;
      case 'error':
        toast.classList.add('bg-red-500');
        break;
      case 'warning':
        toast.classList.add('bg-yellow-500');
        break;
      case 'info':
      default:
        toast.classList.add('bg-blue-500');
        break;
    }
    
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fa fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}-circle"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // 显示/隐藏加载指示器
  showLoading(show) {
    if (this.loadingIndicator) {
      if (show) {
        this.loadingIndicator.classList.remove('hidden');
        this.loadingIndicator.classList.add('flex');
      } else {
        this.loadingIndicator.classList.add('hidden');
        this.loadingIndicator.classList.remove('flex');
      }
    }
  }

  // 移除事件监听器
  removeEventListeners() {
    // 克隆节点来移除所有事件监听器
    if (this.generateBtn) {
      const newGenerateBtn = this.generateBtn.cloneNode(true);
      this.generateBtn.parentNode.replaceChild(newGenerateBtn, this.generateBtn);
      this.generateBtn = newGenerateBtn;
    }
    
    if (this.uploadBtn) {
      const newUploadBtn = this.uploadBtn.cloneNode(true);
      this.uploadBtn.parentNode.replaceChild(newUploadBtn, this.uploadBtn);
      this.uploadBtn = newUploadBtn;
    }
    
    if (this.fileInput) {
      const newFileInput = this.fileInput.cloneNode(true);
      this.fileInput.parentNode.replaceChild(newFileInput, this.fileInput);
      this.fileInput = newFileInput;
    }
  }

  // 初始化事件监听器
  initEventListeners() {
    console.log('initEventListeners 被调用');
    
    // 先移除已存在的事件监听器，防止重复绑定
    this.removeEventListeners();
    
    // 生成图片按钮
    this.generateBtn.addEventListener('click', () => this.generateImage());
    
    // 上传图片按钮
    this.uploadBtn.addEventListener('click', () => {
      console.log('上传按钮被点击', { hasUploadedImage: this.hasUploadedImage });
      if (this.hasUploadedImage) {
        this.showToast('已上传图片，请先处理当前图片或创建新对话', 'warning');
        return;
      }
      console.log('触发文件选择对话框');
      this.fileInput.click();
    });
    
    // 文件选择事件
    this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    
    // 对话按钮
    this.chatBtn.addEventListener('click', () => this.sendChatMessage());
    
    // 新建对话按钮
    this.newChatBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('新建对话按钮被点击'); // 调试日志
      this.createNewChat();
    });
    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }
    
    // 输入框回车事件
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // 检查是否包含图片生成关键词
        const message = this.messageInput.value.trim();
        if (this.containsImageKeywords(message)) {
          this.generateImage();
        } else {
          this.sendChatMessage();
        }
      }
    });

    // 语音按钮：按住说话，松开发送
    const startRecording = () => {
      if (!this.voiceRecognition) return;
      try { this.voiceRecognition.start(); } catch (e) {}
    };
    const stopRecording = () => {
      if (!this.voiceRecognition) return;
      try { this.voiceRecognition.stop(); } catch (e) {}
    };

    this.voiceBtn.addEventListener('mousedown', startRecording);
    this.voiceBtn.addEventListener('touchstart', startRecording, { passive: true });
    this.voiceBtn.addEventListener('mouseup', stopRecording);
    this.voiceBtn.addEventListener('mouseleave', stopRecording);
    this.voiceBtn.addEventListener('touchend', stopRecording);

    // 浏览器语音资源加载
    // 不再加载语音选择和音量

    // 模态框事件
    this.closeModal.addEventListener('click', () => this.closeImageModal());
    this.confirmUpload.addEventListener('click', () => this.confirmImageUpload());
    this.rotateBtn.addEventListener('click', () => this.rotateImage());
    this.downloadBtn.addEventListener('click', () => this.downloadImage());

    // 点击模态框背景关闭
    this.imageModal.addEventListener('click', (e) => {
      if (e.target === this.imageModal) {
        this.closeImageModal();
      }
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeImageModal();
      }
    });
  }

  // 初始化语音识别（使用SiliconFlow ASR）
  initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.voiceRecognition = new SpeechRecognition();
      this.voiceRecognition.lang = 'zh-CN';
      this.voiceRecognition.continuous = false;
      this.voiceRecognition.interimResults = false;

      this.voiceRecognition.onstart = () => {
        this.voiceBtn.classList.add('voice-recording');
        this.voiceBtn.innerHTML = '<i class="fa fa-stop"></i>';
        this.showToast('正在听取语音...', 'info');
      };

      this.voiceRecognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        this.messageInput.value = transcript;
        this.showToast('语音识别完成', 'success');
        
        // 检查是否包含图片生成关键词
        if (this.containsImageKeywords(transcript)) {
          this.showToast('检测到图片生成关键词，开始生成图片...', 'info');
          await this.generateImage();
        } else {
          // 否则正常发送聊天消息
          this.sendChatMessage();
        }
      };

      this.voiceRecognition.onerror = (event) => {
        this.showToast('语音识别失败: ' + event.error, 'error');
        this.resetVoiceButton();
      };

      this.voiceRecognition.onend = () => {
        this.resetVoiceButton();
      };
    } else {
      this.voiceBtn.style.display = 'none';
    }
  }

  // 不再使用点击切换语音识别

  // 重置语音按钮
  resetVoiceButton() {
    this.voiceBtn.classList.remove('voice-recording');
    this.voiceBtn.innerHTML = '<i class="fa fa-microphone"></i>';
  }

  // 处理文件上传
  async handleFileUpload(event) {
    console.log('handleFileUpload 被调用', { 
      isUploading: this.isUploading, 
      hasUploadedImage: this.hasUploadedImage,
      files: event.target.files?.length 
    });
    
    const files = event.target.files;
    
    // 防止重复执行：如果正在处理上传，直接返回
    if (this.isUploading) {
      console.log('正在处理上传，忽略重复请求');
      return;
    }
    
    // 检查是否选择了文件
    if (!files || files.length === 0) {
      return;
    }

    // 严格限制：只允许选择一张图片
    if (files.length > 1) {
      this.showToast('只能选择一张图片，请重新选择', 'error');
      this.fileInput.value = ''; // 清空选择
      return;
    }

    const file = files[0];

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      this.showToast('请选择图片文件', 'error');
      this.fileInput.value = ''; // 清空选择
      return;
    }

    // 检查文件大小（限制为10MB）
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('图片文件过大，请选择小于10MB的图片', 'error');
      this.fileInput.value = ''; // 清空选择
      return;
    }

    // 设置上传状态，防止重复执行
    this.isUploading = true;

    try {
      this.showLoading(true);
      
      // 读取文件并转换为base64
      const base64 = await this.fileToBase64(file);
      
      // 存储上传的图片数据，但不直接显示
      this.uploadedImageData = base64;
      this.uploadedImageFile = file;
      this.hasUploadedImage = true;
      
      // 在输入框中显示文件名
      this.messageInput.value = `📁 已选择图片: ${file.name}`;
      this.messageInput.placeholder = '点击"生成图片"按钮将图片添加到聊天界面';
      
      // 添加AI回复，提示用户点击生成图片
      this.addMessage('ai', '本地图片已上传', false);
      
      // 清空文件输入
      this.fileInput.value = '';
      
      this.showToast(`图片 "${file.name}" 上传成功，请点击生成图片按钮`, 'success');
    } catch (error) {
      console.error('文件上传失败:', error);
      this.addMessage('ai', '抱歉，图片上传失败，请重试', false);
      this.showToast('上传失败，请重试', 'error');
    } finally {
      this.showLoading(false);
      this.isUploading = false; // 重置上传状态
    }
  }

  // 将文件转换为base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // 移除data:image/...;base64,前缀
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 生成图片
  async generateImage() {
    const prompt = this.messageInput.value.trim();
    
    console.log('generateImage 被调用', { 
      prompt: prompt.substring(0, 50),
      hasUploadedImage: this.hasUploadedImage,
      hasUploadedData: !!this.uploadedImageData,
      startsWithFileIcon: prompt.startsWith('📁 已选择图片:')
    });
    
    // 检查是否有已上传的图片（通过检查输入框内容或上传状态）
    if (this.hasUploadedImage && this.uploadedImageData && prompt.startsWith('📁 已选择图片:')) {
      console.log('处理已上传的本地图片');
      // 处理已上传的本地图片
      this.handleUploadedImage();
      return;
    }
    
    // 检查是否有文本描述
    if (!prompt) {
      this.showToast('请输入图片描述或上传本地图片', 'warning');
      return;
    }

    if (this.isGenerating) {
      this.showToast('正在生成中，请稍候...', 'warning');
      return;
    }

    this.isGenerating = true;
    this.showLoading(true);

    try {
      // 添加用户消息
      this.addMessage('user', prompt);
      this.messageInput.value = '';

      // 调用API生成图片
      const response = await this.callGenerateImageAPI(prompt);
      
      if (response.success) {
        // 添加AI回复
        this.addMessage('ai', '图片生成完成！', false);
        // 添加图片
        this.addImageMessage(response.imageUrl, response.imageData);
        // 保存到历史记录
        this.saveToHistory(prompt, response.imageUrl);
      } else {
        this.addMessage('ai', '抱歉，图片生成失败：' + response.error, false);
      }
    } catch (error) {
      console.error('生成图片失败:', error);
      this.addMessage('ai', '抱歉，生成图片时出现错误，请重试', false);
      this.showToast('生成失败，请重试', 'error');
    } finally {
      this.isGenerating = false;
      this.showLoading(false);
    }
  }

  // 处理已上传的图片
  async handleUploadedImage() {
    if (!this.uploadedImageData || !this.uploadedImageFile) {
      this.showToast('没有找到已上传的图片', 'error');
      return;
    }

    try {
      this.showLoading(true);
      
      // 添加用户消息，显示文件名
      this.addMessage('user', `上传本地图片: ${this.uploadedImageFile.name}`);
      
      // 添加AI回复
      this.addMessage('ai', '本地图片已处理完成', false);
      
      // 添加图片消息（使用base64数据）
      this.addImageMessage(`data:${this.uploadedImageFile.type};base64,${this.uploadedImageData}`, this.uploadedImageData);
      
      // 清除上传状态并重置输入框
      this.hasUploadedImage = false;
      this.uploadedImageData = null;
      this.uploadedImageFile = null;
      this.messageInput.value = '';
      this.messageInput.placeholder = '输入消息与激光助手对话，或描述图片';
      
      this.showToast('本地图片已添加到聊天界面', 'success');
    } catch (error) {
      console.error('处理上传图片失败:', error);
      this.addMessage('ai', '抱歉，处理图片时出现错误，请重试', false);
      this.showToast('处理失败，请重试', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // 调用生成图片API
  async callGenerateImageAPI(prompt) {
    // TODO: 替换为实际的API端点
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        style: 'realistic', // 可选参数
        size: '1024x1024'   // 可选参数
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // 播放TTS语音（浏览器内置speechSynthesis）
  async playTTS(text) {
    if (!('speechSynthesis' in window)) {
      return; // 浏览器不支持
    }
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text;
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1; // 固定音量

    try {
      const voices = await new Promise((resolve) => {
        const vs = speechSynthesis.getVoices();
        if (vs.length) return resolve(vs);
        speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
      });
      // 优先使用中文语音
      if (!utterance.voice) {
        const zhVoice = voices.find(v => /zh|Chinese|中文/i.test(v.lang || v.name));
        if (zhVoice) utterance.voice = zhVoice;
      }
    } catch (e) {
      // 忽略获取语音失败
    }

    window.speechSynthesis.speak(utterance);
  }

  // 已移除语音列表加载

  // 检查是否包含图片生成关键词
  containsImageKeywords(text) {
    const keywords = ["生成", "画一张", "创建", "制作", "画", "画个", "画一个", "生成一张", "创建一张", "制作一张"];
    return keywords.some(keyword => text.includes(keyword));
  }

  // 发送聊天消息
  async sendChatMessage() {
    const message = this.messageInput.value.trim();
    if (!message) {
      this.showToast('请输入消息内容', 'warning');
      return;
    }

    if (this.isGenerating) {
      this.showToast('正在处理中，请稍候...', 'warning');
      return;
    }

    // 检查是否包含图片生成关键词
    if (this.containsImageKeywords(message)) {
      this.showToast('检测到图片生成关键词，开始生成图片...', 'info');
      await this.generateImage();
      return;
    }

    this.isGenerating = true;
    this.currentMode = 'chat';
    this.showLoading(true);

    try {
      // 添加用户消息
      this.addMessage('user', message);
      this.messageInput.value = '';

      // 调用聊天API
      const provider = this.providerSelect && this.providerSelect.value ? this.providerSelect.value : 'baidu';
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          mode: 'chat',
          provider: provider
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.reply) {
        // 添加AI回复（会自动播放语音）
        this.addMessage('ai', result.reply);
      } else {
        this.addMessage('ai', '抱歉，没有收到回复', false);
      }
    } catch (error) {
      console.error('聊天失败:', error);
      this.addMessage('ai', '抱歉，聊天时出现错误，请重试', false);
      this.showToast('聊天失败，请重试', 'error');
    } finally {
      this.isGenerating = false;
      this.showLoading(false);
    }
  }

  // 添加消息到聊天区域
  addMessage(role, content, isImage = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start gap-3 ${role === 'user' ? 'justify-end' : ''}`;

    if (role === 'user') {
      messageDiv.innerHTML = `
        <div class="text-right">
          <div class="bg-primary/10 text-primary chat-bubble-user px-4 py-3 max-w-lg inline-block">
            <p>${this.escapeHtml(content)}</p>
          </div>
        </div>
        <div class="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-pink-400 flex items-center justify-center text-white shrink-0">
          <i class="fa fa-user"></i>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white shrink-0 overflow-hidden">
          <img src="${window.ASSISTANT_AVATAR_URL || 'static/ai.png'}" alt="AI" class="w-8 h-8 object-cover"/>
        </div>
        <div>
          <div class="inline-block px-3 py-1 bg-light rounded-full text-xs text-gray-500 mb-1">
            激光助手
          </div>
          <div class="bg-light chat-bubble-ai px-4 py-3 max-w-lg">
            <p class="text-gray-700">${this.escapeHtml(content)}</p>
          </div>
        </div>
      `;
    }

    messageDiv.classList.add(`message-${role}`);
    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    // 如果是AI回复且不是图片消息，则播放语音
    if (role === 'ai' && !isImage && content.trim()) {
      this.playTTS(content);
    }
  }

  // 添加图片消息
  addImageMessage(imageUrl, imageData) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start gap-3 message-image';
    
    messageDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white shrink-0 overflow-hidden">
        <img src="${window.ASSISTANT_AVATAR_URL || 'static/ai.png'}" alt="AI" class="w-8 h-8 object-cover"/>
      </div>
      <div class="space-y-4">
        <!-- 原始图片 -->
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-gray-600">原始图片</h4>
          <div class="image-container relative rounded-xl overflow-hidden shadow-lg hover-lift">
            <img src="${imageUrl}" alt="生成的图片" class="w-full max-w-md h-auto object-cover" data-image-data="${imageData || ''}" id="original-image-${Date.now()}">
            <div class="image-overlay">
              <button onclick="assistant.openImageModal('${imageUrl}')" class="text-gray-600 hover:text-gray-800">
                <i class="fa fa-expand"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 灰白图预览 -->
        <div class="space-y-2">
          <h4 class="text-sm font-medium text-gray-600">灰白图预览</h4>
          <div class="image-container relative rounded-xl overflow-hidden shadow-lg hover-lift">
            <canvas id="grayscale-canvas-${Date.now()}" class="w-full max-w-md h-auto object-cover border border-gray-200 cursor-pointer"></canvas>
            <div class="image-overlay">
              <button data-action="open-gray" data-target="grayscale-canvas" class="text-gray-600 hover:text-gray-800">
                <i class="fa fa-expand"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 图片操作按钮 -->
        <div class="flex flex-wrap gap-2">
          <button onclick="assistant.openImageModal('${imageUrl}')" class="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-light transition-colors flex items-center gap-1">
            <i class="fa fa-eye text-blue-500"></i>
            查看原图
          </button>
          <button data-action="to-gray" data-image="${imageUrl}" data-target="grayscale-canvas" class="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-light transition-colors flex items-center gap-1">
            <i class="fa fa-adjust text-gray-500"></i>
            转灰白图
          </button>
          <button data-action="to-array" data-target="grayscale-canvas" class="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-light transition-colors flex items-center gap-1">
            <i class="fa fa-code text-purple-500"></i>
            转数组
          </button>
          <button data-action="confirm-transfer" data-target="grayscale-canvas" class="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1">
            <i class="fa fa-paper-plane text-white"></i>
            确认传输
          </button>
        </div>
      </div>
    `;

    // 生成唯一前缀，保证按钮和canvas对应
    const uid = `grayscale-canvas-${Date.now()}`;
    messageDiv.innerHTML = messageDiv.innerHTML.replaceAll('grayscale-canvas', uid);
    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    // 更新canvas的onclick事件，使用正确的ID
    const canvas = messageDiv.querySelector('canvas');
    if (canvas) {
      canvas.onclick = () => this.openGrayscaleModal(canvas.id);
    }
    
    // 仅在用户点击“转灰白图”时进行转换；未转换前灰白图区域为空白，不再显示原图

    // 事件委托绑定
    const container = messageDiv;
    container.querySelectorAll('[data-action="to-gray"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        const canvasId = container.querySelector('canvas').id;
        const imgUrl = btn.getAttribute('data-image') || imageUrl;
        this.convertToGrayscale(imgUrl, canvasId);
      });
    });
    container.querySelectorAll('[data-action="to-array"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const canvasId = container.querySelector('canvas').id;
        this.convertToArray(canvasId);
      });
    });
    container.querySelectorAll('[data-action="confirm-transfer"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const canvasId = container.querySelector('canvas').id;
        this.confirmTransfer(canvasId);
      });
    });
    container.querySelectorAll('[data-action="open-gray"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          this.openGrayscaleModal(canvas.id);
        }
      });
    });
  }

  // 打开图片模态框
  openImageModal(imageUrl) {
    this.modalImage.src = imageUrl;
    this.imageModal.classList.remove('hidden');
    this.imageModal.classList.add('flex');
  }

  // 关闭图片模态框
  closeImageModal() {
    this.imageModal.classList.add('hidden');
    this.imageModal.classList.remove('flex');
  }

  // 打开灰度图放大模态框
  openGrayscaleModal(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // 创建灰度图放大模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl w-[95vw] h-[95vh] max-w-none overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h3 class="text-lg font-semibold">灰白图放大预览</h3>
          <div class="flex items-center gap-4">
            <div class="text-sm text-gray-600">
              <span id="zoom-level" class="text-blue-600 font-medium">8x 放大</span>
              <span class="ml-2">尺寸: ${canvas.width} × ${canvas.height}</span>
            </div>
            <button class="text-gray-500 hover:text-gray-700 close-grayscale-modal">
              <i class="fa fa-times text-xl"></i>
            </button>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 bg-gray-50 overflow-auto">
          <div class="relative">
            <canvas id="grayscale-zoom-canvas" class="border border-gray-300 cursor-zoom-in hover:shadow-lg transition-shadow bg-white"></canvas>
            <div class="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              点击图片可进一步放大
            </div>
          </div>
        </div>
        <div class="flex justify-center gap-2 p-4 border-t flex-shrink-0">
          <button class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors reset-zoom">
            <i class="fa fa-refresh mr-1"></i>
            重置缩放
          </button>
          <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors download-grayscale-zoom">
            <i class="fa fa-download mr-1"></i>
            下载灰白图
          </button>
          <button class="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors close-grayscale-modal">
            <i class="fa fa-times mr-1"></i>
            关闭
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 复制canvas内容到放大canvas
    const zoomCanvas = modal.querySelector('#grayscale-zoom-canvas');
    const zoomCtx = zoomCanvas.getContext('2d');
    
    // 设置放大canvas尺寸（初始8倍放大，适合64x64像素查看）
    const scale = 8;
    zoomCanvas.width = canvas.width * scale;
    zoomCanvas.height = canvas.height * scale;
    
    // 绘制放大图像
    zoomCtx.imageSmoothingEnabled = false; // 保持像素清晰度
    zoomCtx.drawImage(canvas, 0, 0, zoomCanvas.width, zoomCanvas.height);

    // 添加点击进一步放大功能
    zoomCanvas.addEventListener('click', () => {
      const currentScale = zoomCanvas.width / canvas.width;
      const newScale = currentScale * 1.5;
      zoomCanvas.width = canvas.width * newScale;
      zoomCanvas.height = canvas.height * newScale;
      zoomCtx.imageSmoothingEnabled = false;
      zoomCtx.drawImage(canvas, 0, 0, zoomCanvas.width, zoomCanvas.height);
      
      // 更新缩放指示器
      const zoomLevel = modal.querySelector('#zoom-level');
      zoomLevel.textContent = `${newScale.toFixed(1)}x 放大`;
    });

    // 重置缩放功能
    modal.querySelector('.reset-zoom').addEventListener('click', () => {
      const initialScale = 8;
      zoomCanvas.width = canvas.width * initialScale;
      zoomCanvas.height = canvas.height * initialScale;
      zoomCtx.imageSmoothingEnabled = false;
      zoomCtx.drawImage(canvas, 0, 0, zoomCanvas.width, zoomCanvas.height);
      
      // 更新缩放指示器
      const zoomLevel = modal.querySelector('#zoom-level');
      zoomLevel.textContent = `${initialScale}x 放大`;
    });

    // 下载功能
    modal.querySelector('.download-grayscale-zoom').addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `grayscale-${Date.now()}.png`;
      link.href = zoomCanvas.toDataURL();
      link.click();
      this.showToast('灰白图下载完成', 'success');
    });

    // 关闭功能
    modal.querySelectorAll('.close-grayscale-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // 确认图片上传
  confirmImageUpload() {
    // TODO: 实现图片上传到服务器的逻辑
    this.showToast('图片上传成功', 'success');
    this.closeImageModal();
  }

  // 旋转图片
  rotateImage() {
    const img = this.modalImage;
    const currentRotation = img.style.transform.match(/rotate\((\d+)deg\)/) || [null, '0'];
    const newRotation = (parseInt(currentRotation[1]) + 30) % 360;
    img.style.transform = `rotate(${newRotation}deg)`;
    img.style.transition = 'transform 0.3s ease';
  }

  // 下载图片
  downloadImage() {
    const img = this.modalImage;
    const link = document.createElement('a');
    link.href = img.src;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('图片下载完成', 'success');
  }

  // 从URL下载图片
  downloadImageFromUrl(imageUrl) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('图片下载完成', 'success');
  }

  // 转换为灰白图
  async convertToGrayscale(imageUrl, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = document.getElementById(canvasId)?.closest('.message-image');
    const imgEl = container ? container.querySelector('img') : null;
    const imageDataAttr = imgEl ? imgEl.getAttribute('data-image-data') : '';


    // 优先尝试前端渲染；失败则回退后端
    try {
    const ctx = canvas.getContext('2d');
    const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      this.showToast('灰白图转换完成', 'success');
      return;
    } catch (e) {
      console.warn('前端灰白图失败，回退到后端：', e);
    }

    // 回退：请求后端转换
    try {
      this.showLoading(true);
      const resp = await fetch('/api/image-to-grayscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : '',
          imageData: imageDataAttr || (imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : '')
        })
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || '后端灰白图失败');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `data:image/png;base64,${result.image}`;
      });
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      this.showToast('灰白图转换完成（后端）', 'success');
    } catch (err) {
      console.error('后端灰白图失败:', err);
      this.showToast('灰白图转换失败: ' + err.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // 打开灰白图模态框
  openGrayscaleModal(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // 创建新的模态框用于灰白图预览
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-semibold">灰白图预览</h3>
          <button class="text-gray-500 hover:text-gray-700 close-grayscale-modal">
            <i class="fa fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-4">
          <canvas id="modal-grayscale-canvas" class="max-w-full max-h-[70vh] object-contain"></canvas>
        </div>
        <div class="flex gap-3 p-4 border-t">
          <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 download-grayscale">
            <i class="fa fa-download"></i>
            下载灰白图
          </button>
          <button class="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-light transition-colors flex items-center gap-2 convert-to-array-modal">
            <i class="fa fa-code"></i>
            转数组
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 复制canvas内容到模态框
    const sourceCanvas = document.getElementById(canvasId);
    const modalCanvas = document.getElementById('modal-grayscale-canvas');
    const modalCtx = modalCanvas.getContext('2d');
    
    modalCanvas.width = sourceCanvas.width;
    modalCanvas.height = sourceCanvas.height;
    modalCtx.drawImage(sourceCanvas, 0, 0);

    // 事件监听
    modal.querySelector('.close-grayscale-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.download-grayscale').addEventListener('click', () => {
      this.downloadCanvasAsImage(modalCanvas, 'grayscale-image');
    });

    modal.querySelector('.convert-to-array-modal').addEventListener('click', () => {
      this.convertCanvasToArray(modalCanvas);
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // 转换为数组：改为调用后端API（支持PNG -> 数组）
  async convertToArray(canvasId) {
    const container = document.querySelector(`#${canvasId}`)?.closest('.message-image');
    const imgEl = container ? container.querySelector('img[alt="生成的图片"]') : null;
    const imageUrl = imgEl ? imgEl.src : '';
    const imageDataAttr = imgEl ? imgEl.getAttribute('data-image-data') : '';


    try {
      this.showLoading(true);
      const resp = await fetch('/api/image-to-array', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl && !imageUrl.startsWith('data:') ? imageUrl : '',
          imageData: imageDataAttr || (imageUrl.startsWith('data:') ? imageUrl.split(',')[1] : ''),
          grayscale: true
        })
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || '后端转换失败');
      this.showArrayModal(result.array, result.width, result.height);
    } catch (e) {
      console.error('后端转数组失败:', e);
      this.showToast('转数组失败: ' + e.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // 转换canvas为数组的核心函数
  convertCanvasToArray(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 提取灰度值
    const grayscaleArray = [];
    for (let i = 0; i < data.length; i += 4) {
      grayscaleArray.push(data[i]); // 只取R值（灰白图中RGB都相等）
    }
    
    // 显示数组信息
    this.showArrayModal(grayscaleArray, canvas.width, canvas.height);
  }

  // 显示数组模态框
  showArrayModal(array, width, height) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    
    // 计算数组统计信息（避免调用栈溢出）
    const min = array.reduce((min, val) => Math.min(min, val), Infinity);
    const max = array.reduce((max, val) => Math.max(max, val), -Infinity);
    const avg = Math.round(array.reduce((a, b) => a + b, 0) / array.length);
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl max-w-6xl max-h-[90vh] overflow-hidden">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-semibold">图片数组数据</h3>
          <button class="text-gray-500 hover:text-gray-700 close-array-modal">
            <i class="fa fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-700 mb-2">数组信息</h4>
              <div class="space-y-1 text-sm">
                <div>尺寸: ${width} × ${height} ${width === 64 && height === 64 ? '(等比例缩放)' : ''}</div>
                <div>像素总数: ${array.length}</div>
                <div>最小值: ${min}</div>
                <div>最大值: ${max}</div>
                <div>平均值: ${avg}</div>
                ${width === 64 && height === 64 ? '<div class="text-green-600">✓ FPGA优化尺寸</div>' : ''}
              </div>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-700 mb-2">操作</h4>
              <div class="space-y-2">
                <button class="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 copy-array">
                  <i class="fa fa-copy"></i>
                  复制数组
                </button>
                <button class="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-light transition-colors flex items-center justify-center gap-2 download-array">
                  <i class="fa fa-download"></i>
                  下载数组文件
                </button>
                <button class="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-light transition-colors flex items-center justify-center gap-2 send-to-fpga">
                  <i class="fa fa-paper-plane"></i>
                  发送到FPGA
                </button>
                <button class="w-full px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 convert-to-fpga">
                  <i class="fa fa-microchip"></i>
                  转FPGA格式
                </button>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-2">数组预览 (前50个值)</h4>
            <div class="bg-white p-3 rounded border max-h-40 overflow-y-auto">
              <code class="text-xs text-gray-600">[${array.slice(0, 50).join(', ')}${array.length > 50 ? '...' : ''}]</code>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 事件监听
    modal.querySelector('.close-array-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.copy-array').addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(array)).then(() => {
        this.showToast('数组已复制到剪贴板', 'success');
      });
    });

    modal.querySelector('.download-array').addEventListener('click', () => {
      this.downloadArrayAsFile(array, width, height);
    });

    modal.querySelector('.send-to-fpga').addEventListener('click', () => {
      this.sendArrayToFPGA(array, width, height);
    });

    modal.querySelector('.convert-to-fpga').addEventListener('click', () => {
      this.convertToFPGAFormat(array, width, height);
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // 下载canvas为图片
  downloadCanvasAsImage(canvas, filename) {
    const link = document.createElement('a');
    link.download = `${filename}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('图片下载完成', 'success');
  }

  // 下载数组为文件
  downloadArrayAsFile(array, width, height) {
    const data = {
      width: width,
      height: height,
      array: array,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-array-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('数组文件下载完成', 'success');
  }

  // 发送数组到FPGA
  async sendArrayToFPGA(array, width, height) {
    this.showLoading(true);
    
    try {
      const response = await fetch('/api/send-to-fpga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          width: width,
          height: height,
          array: array
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showToast('数据已发送到FPGA', 'success');
      } else {
        this.showToast('发送失败: ' + result.error, 'error');
    }
  } catch (error) {
      console.error('发送到FPGA失败:', error);
      this.showToast('发送失败，请重试', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // 发送FPGA帧格式到FPGA
  async sendFPGAFramesToFPGA(array, width, height) {
    this.showLoading(true);
    
    try {
      const response = await fetch('/api/send-to-fpga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          width: width,
          height: height,
          array: array,
          frames: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showToast(`FPGA帧格式数据已发送，共${result.uart_frame_preview.length}帧`, 'success');
        // 显示FPGA串口传输助手
        this.showFPGATransmissionAssistant(result.uart_frame_preview, width, height, array);
      } else {
        this.showToast('发送失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('发送FPGA帧格式失败:', error);
      this.showToast('发送失败，请重试', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // 转换为FPGA格式
  async convertToFPGAFormat(array, width, height) {
    this.showLoading(true);
    
    try {
      const response = await fetch('/api/send-to-fpga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          width: width,
          height: height,
          array: array,
          frames: true
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // 显示FPGA格式数据预览
        this.showFPGAFormatModal(result.uart_frame_preview, width, height, array);
        this.showToast('FPGA格式转换完成', 'success');
      } else {
        this.showToast('转换失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('FPGA格式转换失败:', error);
      this.showToast('转换失败，请重试', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // 显示FPGA串口传输助手
  showFPGATransmissionAssistant(frames, width, height, array) {
    console.log('FPGA串口传输助手启动:', { 
      frames: frames.length, 
      width, 
      height, 
      array: array.length,
      expectedFrames: Math.ceil(array.length / 3) + 1
    });
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl w-[95vw] h-[95vh] max-w-none overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-4 border-b flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white">
              <i class="fa fa-microchip"></i>
            </div>
            <div>
              <h3 class="text-lg font-semibold">FPGA串口传输助手</h3>
              <p class="text-sm text-gray-600">实时传输灰白图数组到FPGA设备</p>
            </div>
          </div>
          <button class="text-gray-500 hover:text-gray-700 close-fpga-assistant">
            <i class="fa fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="flex-1 flex overflow-hidden">
          <!-- 左侧：串口配置面板 -->
          <div class="w-80 bg-gray-50 border-r flex flex-col">
            <div class="p-4 border-b">
              <h4 class="font-medium text-gray-700 mb-3">串口配置</h4>
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600 w-16">串口:</label>
                  <select id="serial-port" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="">正在检测串口...</option>
                  </select>
                  <button id="refresh-ports" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors">
                    <i class="fa fa-refresh"></i>
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600 w-16">波特率:</label>
                  <select id="baud-rate" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="9600">9600</option>
                    <option value="19200">19200</option>
                    <option value="38400">38400</option>
                    <option value="57600">57600</option>
                    <option value="115200" selected>115200</option>
                    <option value="230400">230400</option>
                    <option value="460800">460800</option>
                    <option value="921600">921600</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600 w-16">数据位:</label>
                  <select id="data-bits" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="7">7</option>
                    <option value="8" selected>8</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600 w-16">停止位:</label>
                  <select id="stop-bits" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="1" selected>1</option>
                    <option value="2">2</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600 w-16">校验位:</label>
                  <select id="parity" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="None" selected>None</option>
                    <option value="Odd">Odd</option>
                    <option value="Even">Even</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <button id="serial-connect" class="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                    <i class="fa fa-plug"></i>
                    打开串口
                  </button>
                </div>
              </div>
            </div>
            
            <div class="p-4 border-b">
              <h4 class="font-medium text-gray-700 mb-3">传输控制</h4>
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <button id="start-transmission" class="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                    <i class="fa fa-play"></i>
                    开始传输
                  </button>
                  <button id="pause-transmission" class="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors" disabled>
                    <i class="fa fa-pause"></i>
                  </button>
                  <button id="stop-transmission" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors" disabled>
                    <i class="fa fa-stop"></i>
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600">波特率:</label>
                  <select id="baud-rate" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="9600">9600 bps</option>
                    <option value="19200">19200 bps</option>
                    <option value="38400">38400 bps</option>
                    <option value="57600">57600 bps</option>
                    <option value="115200" selected>115200 bps (FPGA标准)</option>
                    <option value="230400">230400 bps</option>
                    <option value="460800">460800 bps</option>
                    <option value="921600">921600 bps</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600">传输间隔:</label>
                  <select id="transmission-speed" class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="auto" selected>自动计算</option>
                    <option value="100">100ms/帧</option>
                    <option value="200">200ms/帧</option>
                    <option value="500">500ms/帧</option>
                    <option value="1000">1000ms/帧</option>
                  </select>
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600">显示选项:</label>
                  <div class="flex-1 space-y-1">
                    <label class="flex items-center gap-2 text-xs">
                      <input type="checkbox" id="hex-display" class="rounded">
                      <span>16进制显示</span>
                    </label>
                    <label class="flex items-center gap-2 text-xs">
                      <input type="checkbox" id="timestamp" class="rounded" checked>
                      <span>时间戳</span>
                    </label>
                    <label class="flex items-center gap-2 text-xs">
                      <input type="checkbox" id="auto-scroll" class="rounded" checked>
                      <span>自动滚动</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="p-4 border-b">
              <h4 class="font-medium text-gray-700 mb-3">传输状态</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">总帧数:</span>
                  <span id="total-frames" class="font-medium">${frames.length}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">已传输:</span>
                  <span id="transmitted-frames" class="font-medium text-blue-600">0</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">传输进度:</span>
                  <span id="transmission-progress" class="font-medium text-green-600">0%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div id="progress-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
              </div>
            </div>
            
            <div class="p-4 border-b">
              <h4 class="font-medium text-gray-700 mb-3">传输时间估算</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">波特率:</span>
                  <span id="baud-rate-display" class="font-medium text-blue-600">115200 bps</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">每帧字节:</span>
                  <span class="font-medium">8 字节</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">理论传输时间:</span>
                  <span id="theoretical-time" class="font-medium text-green-600">计算中...</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">实际传输间隔:</span>
                  <span id="actual-interval" class="font-medium text-purple-600">自动计算</span>
                </div>
              </div>
            </div>
            
            <div class="p-4 border-b">
              <h4 class="font-medium text-gray-700 mb-3">图像信息</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">尺寸:</span>
                  <span class="font-medium">${width} × ${height}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">像素总数:</span>
                  <span class="font-medium">${array.length}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">数据帧:</span>
                  <span class="font-medium">${frames.length - 1} 帧</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">元信息帧:</span>
                  <span class="font-medium">1 帧</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">总帧数:</span>
                  <span class="font-medium text-blue-600">${frames.length} 帧</span>
                </div>
              </div>
            </div>
            
            <div class="p-4 border-b">
              <h4 class="font-medium text-gray-700 mb-3">技术说明</h4>
              <div class="space-y-2 text-xs text-gray-600">
                <div>• 每帧8字节：AA 01 CNT P1 P2 P3 SUM 55</div>
                <div>• 每帧传输3像素（P1 P2 P3）</div>
                <div>• 计算：⌈4096÷3⌉ = 1366帧</div>
                <div>• 元信息帧：传输图像尺寸</div>
                <div>• 总帧数：1366 + 1 = 1367帧</div>
                <div>• 波特率：115200 bps (FPGA标准)</div>
                <div>• 每帧传输时间：~0.69ms (理论)</div>
                <div>• 总传输时间：~0.94秒 (理论)</div>
              </div>
            </div>
            
            <div class="p-4">
              <h4 class="font-medium text-gray-700 mb-3">操作</h4>
              <div class="space-y-2">
                <button id="download-frames" class="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                  <i class="fa fa-download"></i>
                  下载帧数据
                </button>
                <button id="copy-frames" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <i class="fa fa-copy"></i>
                  复制帧数据
                </button>
              </div>
            </div>
          </div>
          
          <!-- 右侧：串口通信日志 -->
          <div class="flex-1 flex flex-col">
            <div class="p-4 border-b flex justify-between items-center">
              <h4 class="font-medium text-gray-700">串口通信日志</h4>
              <div class="flex items-center gap-2">
                <button id="clear-log" class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors">
                  <i class="fa fa-trash mr-1"></i>
                  清除日志
                </button>
                <button id="save-log" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
                  <i class="fa fa-save mr-1"></i>
                  保存日志
                </button>
              </div>
            </div>
            <div class="flex-1 overflow-auto bg-black text-green-400 font-mono text-sm p-4">
              <div id="transmission-display" class="space-y-1">
                <!-- 串口通信日志将在这里显示 -->
                <div class="text-gray-500 text-xs">
                  [系统] FPGA串口传输助手已启动，等待连接...
                </div>
              </div>
            </div>
            <div class="p-2 border-t bg-gray-100 flex justify-between items-center text-sm">
              <div class="flex items-center gap-4">
                <span>发送: <span id="tx-count" class="font-medium text-blue-600">0</span></span>
                <span>接收: <span id="rx-count" class="font-medium text-green-600">0</span></span>
                <span>错误: <span id="error-count" class="font-medium text-red-600">0</span></span>
              </div>
              <div class="flex items-center gap-2">
                <span>串口状态: <span id="serial-status" class="font-medium text-red-600">未连接</span></span>
                <span id="current-time" class="text-gray-600"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupFPGATransmissionControls(modal, frames, width, height, array);
  }

  // 设置FPGA传输控制
  setupFPGATransmissionControls(modal, frames, width, height, array) {
    let transmissionInterval = null;
    let currentFrameIndex = 0;
    let isTransmitting = false;
    let isPaused = false;

    const startBtn = modal.querySelector('#start-transmission');
    const pauseBtn = modal.querySelector('#pause-transmission');
    const stopBtn = modal.querySelector('#stop-transmission');
    const speedSelect = modal.querySelector('#transmission-speed');
    const baudRateSelect = modal.querySelector('#baud-rate');
    const transmittedFrames = modal.querySelector('#transmitted-frames');
    const progressBar = modal.querySelector('#progress-bar');
    const progressText = modal.querySelector('#transmission-progress');
    const displayArea = modal.querySelector('#transmission-display');
    const baudRateDisplay = modal.querySelector('#baud-rate-display');
    const theoreticalTime = modal.querySelector('#theoretical-time');
    const actualInterval = modal.querySelector('#actual-interval');

    // 计算传输时间
    function calculateTransmissionTime() {
      const baudRate = parseInt(baudRateSelect.value);
      const frameCount = frames.length;
      const bytesPerFrame = 8; // 每帧8字节
      const totalBytes = frameCount * bytesPerFrame;
      
      // 计算理论传输时间（考虑起始位、停止位、校验位）
      const bitsPerByte = 10; // 1起始位 + 8数据位 + 1停止位
      const totalBits = totalBytes * bitsPerByte;
      const theoreticalTimeMs = (totalBits / baudRate) * 1000;
      
      // 更新显示
      baudRateDisplay.textContent = `${baudRate} bps`;
      theoreticalTime.textContent = `${(theoreticalTimeMs / 1000).toFixed(2)} 秒`;
      
      // 计算实际传输间隔
      let interval;
      if (speedSelect.value === 'auto') {
        // 自动计算：理论时间除以帧数，但不少于10ms
        interval = Math.max(10, Math.ceil(theoreticalTimeMs / frameCount));
        actualInterval.textContent = `${interval}ms/帧 (自动)`;
      } else {
        interval = parseInt(speedSelect.value);
        actualInterval.textContent = `${interval}ms/帧 (手动)`;
      }
      
      return interval;
    }

    // 初始化计算
    calculateTransmissionTime();

    // 监听波特率变化
    baudRateSelect.addEventListener('change', calculateTransmissionTime);
    speedSelect.addEventListener('change', calculateTransmissionTime);

    // 串口连接状态
    let isSerialConnected = false;
    const serialConnectBtn = modal.querySelector('#serial-connect');
    const serialStatus = modal.querySelector('#serial-status');
    const txCount = modal.querySelector('#tx-count');
    const rxCount = modal.querySelector('#rx-count');
    const errorCount = modal.querySelector('#error-count');
    const currentTime = modal.querySelector('#current-time');

    // 更新当前时间
    function updateCurrentTime() {
      const now = new Date();
      currentTime.textContent = now.toLocaleTimeString('zh-CN');
    }
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();

    // 检测串口
    async function detectSerialPorts() {
      try {
        const response = await fetch('/api/serial-ports');
        const result = await response.json();
        
        if (result.success) {
          const portSelect = modal.querySelector('#serial-port');
          portSelect.innerHTML = '';
          
          if (result.ports.length === 0) {
            portSelect.innerHTML = '<option value="">未检测到串口设备</option>';
          } else {
            result.ports.forEach(port => {
              const option = document.createElement('option');
              option.value = port.device;
              option.textContent = `${port.device} - ${port.description}`;
              if (port.description.includes('CH340') || port.description.includes('CH34')) {
                option.selected = true;
              }
              portSelect.appendChild(option);
            });
          }
        }
      } catch (error) {
        console.error('检测串口失败:', error);
        modal.querySelector('#serial-port').innerHTML = '<option value="">检测串口失败</option>';
      }
    }

    // 初始化检测串口
    detectSerialPorts();

    // 刷新串口列表
    modal.querySelector('#refresh-ports').addEventListener('click', detectSerialPorts);

    // 串口连接/断开
    serialConnectBtn.addEventListener('click', async () => {
      if (!isSerialConnected) {
        // 真实串口连接
        try {
          const port = modal.querySelector('#serial-port').value;
          const baudrate = modal.querySelector('#baud-rate').value;
          const dataBits = modal.querySelector('#data-bits').value;
          const stopBits = modal.querySelector('#stop-bits').value;
          const parity = modal.querySelector('#parity').value;
          
          if (!port) {
            this.showToast('请选择串口', 'error');
            return;
          }
          
          const response = await fetch('/api/serial-connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              port: port,
              baudrate: parseInt(baudrate),
              data_bits: parseInt(dataBits),
              stop_bits: parseInt(stopBits),
              parity: parity
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            isSerialConnected = true;
            serialConnectBtn.innerHTML = '<i class="fa fa-unlink"></i> 关闭串口';
            serialConnectBtn.className = 'flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2';
            serialStatus.textContent = '已连接';
            serialStatus.className = 'font-medium text-green-600';
            
            // 添加连接日志
            const logEntry = document.createElement('div');
            logEntry.className = 'mb-1 text-green-400';
            logEntry.innerHTML = `
              <span class="text-gray-500">[${new Date().toLocaleString('zh-CN')}]</span>
              <span class="text-green-300">[系统]</span>
              <span class="text-white">串口已连接 - ${port} @ ${baudrate} bps</span>
            `;
            displayArea.appendChild(logEntry);
            
            this.showToast('串口连接成功', 'success');
          } else {
            this.showToast(`串口连接失败: ${result.error}`, 'error');
          }
        } catch (error) {
          console.error('串口连接失败:', error);
          this.showToast('串口连接失败', 'error');
        }
      } else {
        // 真实串口断开
        try {
          const response = await fetch('/api/serial-disconnect', {
            method: 'POST'
          });
          
          const result = await response.json();
          
          isSerialConnected = false;
          serialConnectBtn.innerHTML = '<i class="fa fa-plug"></i> 打开串口';
          serialConnectBtn.className = 'flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2';
          serialStatus.textContent = '未连接';
          serialStatus.className = 'font-medium text-red-600';
          
          // 添加断开日志
          const logEntry = document.createElement('div');
          logEntry.className = 'mb-1 text-red-400';
          logEntry.innerHTML = `
            <span class="text-gray-500">[${new Date().toLocaleString('zh-CN')}]</span>
            <span class="text-red-300">[系统]</span>
            <span class="text-white">串口已断开</span>
          `;
          displayArea.appendChild(logEntry);
          
          this.showToast('串口已断开', 'success');
        } catch (error) {
          console.error('串口断开失败:', error);
          this.showToast('串口断开失败', 'error');
        }
      }
    });

    // 清除日志
    modal.querySelector('#clear-log').addEventListener('click', () => {
      displayArea.innerHTML = `
        <div class="text-gray-500 text-xs">
          [系统] 日志已清除
        </div>
      `;
      txCount.textContent = '0';
      rxCount.textContent = '0';
      errorCount.textContent = '0';
    });

    // 保存日志
    modal.querySelector('#save-log').addEventListener('click', () => {
      const logContent = displayArea.innerText;
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fpga-serial-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('日志已保存', 'success');
    });

    // 开始传输
    startBtn.addEventListener('click', async () => {
      if (!isTransmitting) {
        isTransmitting = true;
        isPaused = false;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        
        // 检查串口连接状态
        if (!isSerialConnected) {
          this.showToast('请先连接串口', 'error');
          return;
        }
        
        const speed = calculateTransmissionTime();
        
        // 立即开始实时日志更新
        this.startRealTimeLogUpdate(displayArea, txCount, errorCount, transmittedFrames, progressBar, progressText);
        
        // 启动异步传输
        fetch('/api/serial-transmit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frames: frames,
            interval: speed / 1000  // 转换为秒
          })
        }).then(response => response.json())
        .then(result => {
          if (result.success) {
            // 启动实际的传输
            this.startActualTransmission(frames, speed / 1000);
          } else {
            this.showToast(`传输启动失败: ${result.error}`, 'error');
          }
        }).catch(error => {
          console.error('串口传输启动失败:', error);
          this.showToast('串口传输启动失败', 'error');
        });
      }
    });

    // 暂停传输
    pauseBtn.addEventListener('click', () => {
      if (isTransmitting) {
        isPaused = !isPaused;
        pauseBtn.innerHTML = isPaused ? '<i class="fa fa-play"></i>' : '<i class="fa fa-pause"></i>';
        pauseBtn.className = isPaused ? 
          'px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors' :
          'px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors';
      }
    });

    // 停止传输
    stopBtn.addEventListener('click', () => {
      this.stopTransmission();
    });

    // 停止传输函数
    this.stopTransmission = () => {
      if (transmissionInterval) {
        clearInterval(transmissionInterval);
        transmissionInterval = null;
      }
      isTransmitting = false;
      isPaused = false;
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      pauseBtn.innerHTML = '<i class="fa fa-pause"></i>';
      pauseBtn.className = 'px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors';
    };

    // 下载帧数据
    modal.querySelector('#download-frames').addEventListener('click', () => {
      this.downloadFPGAFrames(frames, width, height);
    });

    // 复制帧数据
    modal.querySelector('#copy-frames').addEventListener('click', () => {
      const framesText = frames.map(frame => 
        frame.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      ).join('\n');
      
      navigator.clipboard.writeText(framesText).then(() => {
        this.showToast('FPGA帧数据已复制到剪贴板', 'success');
      });
    });

    // 关闭功能
    modal.querySelectorAll('.close-fpga-assistant').forEach(btn => {
      btn.addEventListener('click', () => {
        this.stopTransmission();
        document.body.removeChild(modal);
      });
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.stopTransmission();
        document.body.removeChild(modal);
      }
    });
  }

  // 显示传输日志
  async displayTransmissionLog(container, result) {
    try {
      const response = await fetch('/api/transmission-log');
      const logResult = await response.json();
      
      if (logResult.success) {
        // 清空现有日志
        container.innerHTML = '';
        
        // 显示传输日志
        logResult.log.forEach(entry => {
          const logEntry = document.createElement('div');
          logEntry.className = 'mb-1';
          
          const statusColor = entry.status === '成功' ? 'text-green-400' : 'text-red-400';
          const typeColor = entry.frame_type === '元信息' ? 'text-purple-300' : 'text-blue-300';
          
          logEntry.innerHTML = `
            <div class="${statusColor}">
              <span class="text-gray-500">[${entry.timestamp}]</span>
              <span class="text-blue-400">TX:</span>
              <span class="${typeColor}">帧${entry.frame_number} [${entry.frame_type}]</span>
              <span class="text-white">${entry.frame_hex}</span>
              <span class="text-cyan-300">// ${entry.status}</span>
            </div>
          `;
          
          container.appendChild(logEntry);
        });
        
        // 添加传输完成日志
        const logEntry = document.createElement('div');
        logEntry.className = 'mb-1 text-green-400';
        logEntry.innerHTML = `
          <span class="text-gray-500">[${new Date().toLocaleString('zh-CN')}]</span>
          <span class="text-green-300">[系统]</span>
          <span class="text-white">传输完成 - 成功 ${result.transmitted_count} 帧, 失败 ${result.error_count} 帧</span>
        `;
        container.appendChild(logEntry);
        
        // 自动滚动到底部
        container.scrollTop = container.scrollHeight;
      }
    } catch (error) {
      console.error('获取传输日志失败:', error);
    }
  }

  // 显示传输帧
  displayTransmissionFrame(container, frame, frameNumber) {
    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    
    const frameType = frame[1] === 0x00 ? '元信息' : '数据';
    const frameHex = frame.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    
    // 解析帧内容
    let frameDetails = '';
    if (frame[1] === 0x00) {
      // 元信息帧
      const width = frame[3] + (frame[4] << 8);
      const height = frame[5] + (frame[6] << 8);
      frameDetails = `图像尺寸: ${width}×${height}`;
    } else {
      // 数据帧
      const pixels = frame.slice(3, 6).map(p => p.toString(16).padStart(2, '0').toUpperCase());
      frameDetails = `像素: ${pixels.join(' ')}`;
    }
    
    const logEntry = document.createElement('div');
    logEntry.className = 'mb-1';
    logEntry.innerHTML = `
      <div class="text-green-400">
        <span class="text-gray-500">[${timestamp}]</span>
        <span class="text-blue-400">TX:</span>
        <span class="text-yellow-300">帧${frameNumber} [${frameType}]</span>
        <span class="text-white">${frameHex}</span>
        <span class="text-cyan-300">// ${frameDetails}</span>
      </div>
    `;
    
    container.appendChild(logEntry);
    
    // 自动滚动到底部
    const autoScroll = document.getElementById('auto-scroll');
    if (autoScroll && autoScroll.checked) {
      container.scrollTop = container.scrollHeight;
    }
  }

  // 显示FPGA格式数据模态框
  showFPGAFormatModal(frames, width, height, array) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
      <div class="bg-white rounded-xl max-w-6xl max-h-[90vh] overflow-hidden">
        <div class="flex justify-between items-center p-4 border-b">
          <div>
            <h3 class="text-lg font-semibold">FPGA UART 帧格式数据预览</h3>
            <p class="text-sm text-gray-600">查看FPGA帧格式数据，点击"进入串口传输助手"开始传输</p>
          </div>
          <button class="text-gray-500 hover:text-gray-700 close-fpga-modal">
            <i class="fa fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-700 mb-2">帧格式说明</h4>
              <div class="space-y-1 text-sm">
                <div><strong>工业级 FPGA UART 协议</strong></div>
                <div>• 元信息帧: AA 00 00 W_L W_H H_L H_H SUM 55</div>
                <div>• 数据帧: AA 01 CNT P1 P2 P3 SUM 55</div>
                <div>• 每帧3像素，行优先传输</div>
                <div>• 校验和: 前6字节累加和的低8位</div>
                <div>• 总帧数: ${frames.length}</div>
              </div>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-700 mb-2">操作</h4>
              <div class="space-y-2">
                <button class="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 confirm-fpga-transmission">
                  <i class="fa fa-paper-plane"></i>
                  进入串口传输助手
                </button>
                <button class="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 copy-fpga-frames">
                  <i class="fa fa-copy"></i>
                  复制帧数据
                </button>
                <button class="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-light transition-colors flex items-center justify-center gap-2 download-fpga-frames">
                  <i class="fa fa-download"></i>
                  下载帧文件
                </button>
              </div>
            </div>
          </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-700 mb-2">帧数据预览 (前20帧)</h4>
              <div class="bg-white p-3 rounded border max-h-40 overflow-y-auto">
                <code class="text-xs text-gray-600">${frames.slice(0, 20).map((frame, idx) => {
                  const frameType = frame[1] === 0x00 ? '元信息' : '数据';
                  const hexData = frame.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                  return `帧${idx+1} [${frameType}]: ${hexData}`;
                }).join('\n')}</code>
              </div>
            </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 事件监听
    modal.querySelector('.close-fpga-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.copy-fpga-frames').addEventListener('click', () => {
      const framesText = frames.map(frame => 
        frame.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      ).join('\n');
      navigator.clipboard.writeText(framesText).then(() => {
        this.showToast('FPGA帧数据已复制到剪贴板', 'success');
      });
    });

    modal.querySelector('.download-fpga-frames').addEventListener('click', () => {
      this.downloadFPGAFrames(frames, width, height);
    });

    modal.querySelector('.confirm-fpga-transmission').addEventListener('click', async () => {
      // 关闭当前模态框
      document.body.removeChild(modal);
      
      // 显示FPGA串口传输助手
      this.showFPGATransmissionAssistant(frames, width, height, array);
      this.showToast('FPGA串口传输助手已启动', 'success');
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // 下载FPGA帧数据
  downloadFPGAFrames(frames, width, height) {
    const data = {
      width: width,
      height: height,
      frame_count: frames.length,
      frames: frames,
      format: "FPGA_UART_8BYTE",
      description: "每帧格式: AA XH XL YH YL PIX SUM 55",
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fpga-frames-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showToast('FPGA帧文件下载完成', 'success');
  }

  // 确认传输
  async confirmTransfer(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // 确认对话框
    if (!confirm('确认要将此灰白图转换为FPGA帧格式并发送吗？')) {
      return;
    }

    // 转换为数组
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const grayscaleArray = [];
    for (let i = 0; i < data.length; i += 4) {
      grayscaleArray.push(data[i]);
    }

    // 发送FPGA帧格式到FPGA
    await this.sendFPGAFramesToFPGA(grayscaleArray, canvas.width, canvas.height);
  }

  // 创建新对话
  createNewChat() {
    console.log('创建新对话被调用'); // 调试日志
    this.currentChatId = this.generateChatId();
    this.chatHistory = [];
    this.hasUploadedImage = false; // 重置上传状态
    this.isUploading = false; // 重置上传处理状态
    this.uploadedImageData = null; // 清除上传的图片数据
    this.uploadedImageFile = null; // 清除上传的文件对象
    this.messageInput.value = ''; // 清空输入框
    this.messageInput.placeholder = '输入消息与激光助手对话，或描述图片'; // 重置占位符
    this.clearChatContainer();
    this.addMessage('ai', '主人你好，我是你的激光助手，请问今天有什么事需要吗？', false);
    this.showToast('新对话已创建', 'success');
  }

  // 生成聊天ID
  generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 清空聊天容器
  clearChatContainer() {
    this.chatContainer.innerHTML = '';
  }

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }, 100);
  }

  // 显示/隐藏加载指示器
  showLoading(show) {
    if (show) {
      this.loadingIndicator.classList.remove('hidden');
    } else {
      this.loadingIndicator.classList.add('hidden');
    }
  }

  // 显示提示消息
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // 保存到历史记录
  saveToHistory(prompt, imageUrl) {
    const historyItem = {
      id: this.generateChatId(),
      prompt: prompt,
      imageUrl: imageUrl,
      timestamp: new Date().toISOString(),
      chatId: this.currentChatId
    };

    this.chatHistory.unshift(historyItem);
    this.updateHistoryDisplay();
    this.saveToLocalStorage();
  }

  // 清空历史记录
  clearHistory() {
    if (confirm('确定要清空所有历史记录吗？当前对话不会被影响。')) {
      this.chatHistory = [];
      this.updateHistoryDisplay();
      localStorage.removeItem('laserImageAssistant_history');
      this.showToast('历史记录已清空', 'success');
    }
  }

  // 更新历史记录显示
  updateHistoryDisplay() {
    this.historyList.innerHTML = '';
    
    this.chatHistory.slice(0, 10).forEach(item => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'w-full text-left py-2 px-3 rounded-lg text-sm text-gray-700 hover:bg-light transition-colors flex items-center gap-2 history-item';
      btn.setAttribute('data-id', item.id);
      btn.innerHTML = `
        <i class="fa fa-file-image-o text-primary/70"></i>
        <span class="truncate">${this.escapeHtml(item.prompt)}</span>
      `;
      btn.addEventListener('click', () => this.loadHistoryItem(item.id));
      li.appendChild(btn);
      this.historyList.appendChild(li);
    });
  }

  // 加载历史记录项
  loadHistoryItem(itemId) {
    const item = this.chatHistory.find(h => h.id === itemId);
    if (!item) return;

    this.clearChatContainer();
    this.addMessage('user', item.prompt);
    this.addMessage('ai', '图片生成完成！', false);
    this.addImageMessage(item.imageUrl);
    
    // 更新选中状态（不使用隐式全局 event）
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    const current = this.historyList.querySelector(`.history-item[data-id="${itemId}"]`);
    if (current) current.classList.add('active');
    
    this.showToast('历史记录已加载', 'success');
  }

  // 加载聊天历史
  loadChatHistory() {
    const saved = localStorage.getItem('laserImageAssistant_history');
    if (saved) {
      this.chatHistory = JSON.parse(saved);
      this.updateHistoryDisplay();
    }
  }

  // 保存到本地存储
  saveToLocalStorage() {
    localStorage.setItem('laserImageAssistant_history', JSON.stringify(this.chatHistory));
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 全局实例
let assistant;

// 页面加载完成后初始化（仅在HTML中没有初始化时才执行）
document.addEventListener('DOMContentLoaded', () => {
  // 检查是否已经在HTML中初始化了
  if (typeof assistant === 'undefined' || !assistant) {
    console.log('script.js中初始化 LaserImageAssistant');
    assistant = new LaserImageAssistant();
    
    // 添加一些示例历史记录（仅用于演示）
    if (assistant.chatHistory.length === 0) {
      const sampleHistory = [
        { id: 'sample1', prompt: '生成一张可爱的小猫', imageUrl: 'https://p11-flow-imagex-download-sign.byteimg.com/tos-cn-i-a9rns2rl98/777c586f5dde45ad9cf5ea983add8e3c.png~tplv-a9rns2rl98-24:720:720.png?rcl=202510200030354B2E17671D9CBDFD2B04&rk3s=8e244e95&rrcfp=8a172a1a&x-expires=1761496235&x-signature=Qywjqge2svCVUjrr%2BIYZqEAz8LI%3D', timestamp: new Date().toISOString(), chatId: 'sample_chat' },
        { id: 'sample2', prompt: '画一个美丽的日落', imageUrl: '', timestamp: new Date().toISOString(), chatId: 'sample_chat' },
        { id: 'sample3', prompt: '生成一张科幻风格的机器人', imageUrl: '', timestamp: new Date().toISOString(), chatId: 'sample_chat' }
      ];
      assistant.chatHistory = sampleHistory;
      assistant.updateHistoryDisplay();
    }
  }
});

// 启动实际传输函数
LaserImageAssistant.prototype.startActualTransmission = function(frames, interval) {
  // 在后台启动实际传输
  fetch('/api/start-serial-transmission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      frames: frames,
      interval: interval
    })
  }).then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('实际传输完成:', result);
    } else {
      console.error('实际传输失败:', result.error);
    }
  }).catch(error => {
    console.error('实际传输失败:', error);
  });
};

// 实时日志更新函数
LaserImageAssistant.prototype.startRealTimeLogUpdate = function(displayArea, txCount, errorCount, transmittedFrames, progressBar, progressText) {
  let logUpdateInterval = null;
  let lastLogCount = 0;
  let isTransmissionComplete = false;
  
  // 开始实时更新
  logUpdateInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/transmission-log');
      const result = await response.json();
      
      if (result.success && result.log.length > lastLogCount) {
        // 显示新的日志条目
        for (let i = lastLogCount; i < result.log.length; i++) {
          const logEntry = result.log[i];
          const logElement = document.createElement('div');
          logElement.className = 'mb-1';
          
          // 根据日志类型设置颜色
          if (logEntry.frame_type === '错误') {
            logElement.className += ' text-red-400';
          } else if (logEntry.frame_type === '元信息') {
            logElement.className += ' text-blue-400';
          } else {
            logElement.className += ' text-green-400';
          }
          
          // 格式化时间戳
          const timestamp = logEntry.timestamp || new Date().toLocaleString('zh-CN');
          
          // 格式化帧数据
          const frameHex = logEntry.frame_hex || '传输失败';
          
          logElement.innerHTML = `
            <span class="text-gray-500">[${timestamp}]</span>
            <span class="text-yellow-300">TX:</span>
            <span class="text-white">帧${logEntry.frame_number} [${logEntry.frame_type}] ${frameHex}</span>
            <span class="text-green-300">// ${logEntry.status}</span>
          `;
          
          displayArea.appendChild(logElement);
        }
        
        // 更新计数器
        const transmittedCount = result.log.filter(log => log.status === '成功').length;
        const errorCount = result.log.filter(log => log.status !== '成功').length;
        
        txCount.textContent = transmittedCount;
        errorCount.textContent = errorCount;
        transmittedFrames.textContent = transmittedCount;
        
        // 更新进度条
        const totalFrames = result.log.length;
        const progress = totalFrames > 0 ? (transmittedCount / totalFrames) * 100 : 0;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress.toFixed(1)}%`;
        
        // 自动滚动到底部
        displayArea.scrollTop = displayArea.scrollHeight;
        
        lastLogCount = result.log.length;
        
        // 检查是否传输完成（假设总帧数为1367）
        if (totalFrames >= 1367) {
          isTransmissionComplete = true;
          if (logUpdateInterval) {
            clearInterval(logUpdateInterval);
          }
        }
      }
    } catch (error) {
      console.error('获取传输日志失败:', error);
    }
  }, 50); // 每50ms更新一次，更频繁
  
  // 10秒后强制停止更新
  setTimeout(() => {
    if (logUpdateInterval) {
      clearInterval(logUpdateInterval);
    }
  }, 10000);
};

// 导出给全局使用
window.assistant = assistant;