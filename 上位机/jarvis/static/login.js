// 激光成图助手 - 登录页面功能

class LoginManager {
  constructor() {
    this.isLoading = false;
    this.initElements();
    this.initEventListeners();
    this.initAnimations();
  }

  // 初始化DOM元素
  initElements() {
    this.loginForm = document.getElementById('login-form');
    this.usernameInput = document.getElementById('username');
    this.passwordInput = document.getElementById('password');
    this.togglePasswordBtn = document.getElementById('toggle-password');
    this.loginBtn = document.getElementById('login-btn');
    this.loginText = document.getElementById('login-text');
    this.loginLoading = document.getElementById('login-loading');
    this.errorMessage = document.getElementById('error-message');
    this.errorText = document.getElementById('error-text');
    this.successMessage = document.getElementById('success-message');
    this.successText = document.getElementById('success-text');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.rememberCheckbox = document.getElementById('remember');
  }

  // 初始化事件监听器
  initEventListeners() {
    // 表单提交
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    
    // 密码显示/隐藏切换
    this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
    
    // 输入框事件
    this.usernameInput.addEventListener('input', () => this.clearMessages());
    this.passwordInput.addEventListener('input', () => this.clearMessages());
    
    // 回车键登录
    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin(e);
      }
    });

    // 记住我功能
    this.rememberCheckbox.addEventListener('change', () => this.handleRememberMe());
    
    // 加载保存的登录信息
    this.loadSavedCredentials();
  }

  // 初始化动画效果
  initAnimations() {
    // 页面加载动画
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.body.style.transition = 'opacity 0.5s ease';
      document.body.style.opacity = '1';
    }, 100);

    // 输入框聚焦动画
    const inputs = [this.usernameInput, this.passwordInput];
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
      });
      
      input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
      });
    });
  }

  // 处理登录
  async handleLogin(e) {
    e.preventDefault();
    
    if (this.isLoading) return;

    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value.trim();

    // 基本验证
    if (!username || !password) {
      this.showError('请输入用户名和密码');
      return;
    }

    this.setLoading(true);

    try {
      // 调用登录API
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
          remember: this.rememberCheckbox.checked
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('登录成功，正在跳转...');
        
        // 保存登录状态
        this.saveLoginState(username, data.token);
        
        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        this.showError(data.message || '登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('登录错误:', error);
      this.showError('网络错误，请重试');
    } finally {
      this.setLoading(false);
    }
  }

  // 切换密码可见性
  togglePasswordVisibility() {
    const isPassword = this.passwordInput.type === 'password';
    this.passwordInput.type = isPassword ? 'text' : 'password';
    
    const icon = this.togglePasswordBtn.querySelector('i');
    icon.className = isPassword ? 'fa fa-eye-slash' : 'fa fa-eye';
  }

  // 设置加载状态
  setLoading(loading) {
    this.isLoading = loading;
    
    if (loading) {
      this.loginBtn.disabled = true;
      this.loginText.classList.add('hidden');
      this.loginLoading.classList.remove('hidden');
      this.loadingOverlay.classList.remove('hidden');
    } else {
      this.loginBtn.disabled = false;
      this.loginText.classList.remove('hidden');
      this.loginLoading.classList.add('hidden');
      this.loadingOverlay.classList.add('hidden');
    }
  }

  // 显示错误消息
  showError(message) {
    this.clearMessages();
    this.errorText.textContent = message;
    this.errorMessage.classList.remove('hidden');
    this.errorMessage.classList.add('error-message');
    
    // 自动隐藏错误消息
    setTimeout(() => {
      this.errorMessage.classList.add('hidden');
    }, 5000);
  }

  // 显示成功消息
  showSuccess(message) {
    this.clearMessages();
    this.successText.textContent = message;
    this.successMessage.classList.remove('hidden');
    this.successMessage.classList.add('success-message');
  }

  // 清除所有消息
  clearMessages() {
    this.errorMessage.classList.add('hidden');
    this.successMessage.classList.add('hidden');
  }

  // 处理记住我功能
  handleRememberMe() {
    if (this.rememberCheckbox.checked) {
      localStorage.setItem('rememberLogin', 'true');
    } else {
      localStorage.removeItem('rememberLogin');
      localStorage.removeItem('savedUsername');
    }
  }

  // 保存登录状态
  saveLoginState(username, token) {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);
    sessionStorage.setItem('token', token);
    
    if (this.rememberCheckbox.checked) {
      localStorage.setItem('savedUsername', username);
    }
  }

  // 加载保存的凭据
  loadSavedCredentials() {
    const rememberLogin = localStorage.getItem('rememberLogin');
    const savedUsername = localStorage.getItem('savedUsername');
    
    if (rememberLogin === 'true' && savedUsername) {
      this.usernameInput.value = savedUsername;
      this.rememberCheckbox.checked = true;
      this.passwordInput.focus();
    } else {
      this.usernameInput.focus();
    }
  }

  // 检查是否已登录
  static checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const token = sessionStorage.getItem('token');
    
    if (!isLoggedIn || !token) {
      return false;
    }
    
    // 可以在这里验证token的有效性
    return true;
  }

  // 登出功能
  static logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('token');
    window.location.href = '/login';
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 检查是否已经登录
  if (LoginManager.checkLoginStatus()) {
    window.location.href = '/';
    return;
  }

  // 初始化登录管理器
  const loginManager = new LoginManager();

  // 添加一些交互效果
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.style.transform = 'scale(1)';
    });
  });

  // 添加键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl + Enter 快速登录
    if (e.ctrlKey && e.key === 'Enter') {
      loginManager.handleLogin(e);
    }
    
    // ESC 清除错误消息
    if (e.key === 'Escape') {
      loginManager.clearMessages();
    }
  });

  // 添加页面可见性变化处理
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // 页面隐藏时暂停动画
      document.querySelectorAll('.floating-animation').forEach(el => {
        el.style.animationPlayState = 'paused';
      });
    } else {
      // 页面显示时恢复动画
      document.querySelectorAll('.floating-animation').forEach(el => {
        el.style.animationPlayState = 'running';
      });
    }
  });

  // 添加触摸设备支持
  if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
    
    // 触摸设备上的特殊处理
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        // 防止iOS缩放
        const viewport = document.querySelector('meta[name="viewport"]');
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      });
      
      input.addEventListener('blur', () => {
        // 恢复正常缩放
        const viewport = document.querySelector('meta[name="viewport"]');
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      });
    });
  }
});

// 导出给全局使用
window.LoginManager = LoginManager;
