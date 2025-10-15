class IPQueryApp {
    constructor() {
        this.version = '1.2.3'; // 应用版本号
        this.checkCacheVersion(); // 检查并清理过期缓存
        this.initializeElements();
        this.bindEvents();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
        this.cachedClientIP = null; // 缓存客户端IP
        this.clientIPCacheTime = null;
    }

    initializeElements() {
        // 输入和按钮元素
        this.ipInput = document.getElementById('ipInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.myIpBtn = document.getElementById('myIpBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.retryBtn = document.getElementById('retryBtn');

        // 状态元素
        this.loading = document.getElementById('loading');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toastMessage');

        // 结果显示元素
        this.resultElements = {
            ipAddress: document.getElementById('ipAddress'),
            countryCode: document.getElementById('countryCode'),
            country: document.getElementById('country'),
            city: document.getElementById('city'),
            isp: document.getElementById('isp'),
            org: document.getElementById('org'),
            asname: document.getElementById('asname'),
            asNumber: document.getElementById('asNumber'),
            mobile: document.getElementById('mobile'),
            proxy: document.getElementById('proxy'),
            hosting: document.getElementById('hosting'),
            latitude: document.getElementById('latitude'),
            longitude: document.getElementById('longitude'),
            timezone: document.getElementById('timezone'),
            zip: document.getElementById('zip')
        };
    }

    bindEvents() {
        // 搜索按钮点击
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        
        // 输入框回车
        this.ipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // 输入框实时验证
        this.ipInput.addEventListener('input', () => {
            this.validateInput();
        });

        // 查询我的IP
        this.myIpBtn.addEventListener('click', () => {
            this.handleMyIPQuery();
        });

        // 清除按钮
        this.clearBtn.addEventListener('click', () => {
            this.clearResults();
        });

        // 复制结果
        this.copyBtn.addEventListener('click', () => {
            this.copyResults();
        });

        // 重试按钮
        this.retryBtn.addEventListener('click', () => {
            this.handleSearch();
        });

        // 页面加载时自动查询当前IP
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.handleAutoQuery();
            }, 500);
        });
    }

    validateInput() {
        const ip = this.ipInput.value.trim();
        const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        if (ip === '' || ipPattern.test(ip)) {
            this.ipInput.setCustomValidity('');
            return true;
        } else {
            this.ipInput.setCustomValidity('请输入有效的IP地址格式');
            return false;
        }
    }

    async handleSearch() {
        const ip = this.ipInput.value.trim();
        
        // 验证输入
        if (ip && !this.validateInput()) {
            this.showToast('请输入有效的IP地址', 'error');
            return;
        }

        // 检查缓存
        const cacheKey = ip || 'current';
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
            this.displayResults(cached);
            this.showToast('使用缓存数据');
            return;
        }

        try {
            this.showLoading();
            const result = await this.queryIP(ip);
            
            if (result.status === 'success') {
                this.cacheResult(cacheKey, result);
                this.displayResults(result);
                this.showToast('查询成功');
            } else {
                throw new Error(result.message || '查询失败');
            }
        } catch (error) {
            this.showError(error.message);
            this.showToast('查询失败: ' + error.message, 'error');
        }
    }

    // 自动查询：获取客户端真实IP并查询详细信息
    async handleAutoQuery() {
        try {
            this.showLoading();
            
            // 获取客户端真实IP（确保使用外部服务）
            const realIP = await this.getRealClientIP();
            
            if (realIP) {
                console.log('获取到客户端真实IP:', realIP);
                // 使用真实IP查询详细信息
                const result = await this.queryIP(realIP);
                
                if (result && result.status === 'success') {
                    this.displayResults(result);
                    this.showToast('自动查询成功 - 显示您的真实IP信息', 'success');
                } else {
                    throw new Error(result.message || '查询失败');
                }
            } else {
                throw new Error('无法获取客户端IP地址');
            }
        } catch (error) {
            console.error('自动查询失败:', error);
            this.hideLoading();
            // 如果自动查询失败，显示提示但不显示错误
            this.showToast('无法自动获取IP信息，请点击"查询我的IP"手动获取', 'info');
        }
    }

    // 手动查询我的IP
    async handleMyIPQuery() {
        try {
            this.showLoading();
            this.clearResults();
            this.hideError();
            
            // 获取客户端真实IP
            const realIP = await this.getRealClientIP();
            
            if (realIP) {
                // 将获取到的IP显示在输入框中
                this.ipInput.value = realIP;
                
                // 查询IP详细信息
                const result = await this.queryIP(realIP);
                
                if (result && result.status === 'success') {
                    this.displayResults(result);
                    this.showToast(`查询成功 - 您的IP: ${realIP}`, 'success');
                } else {
                    throw new Error(result.message || '查询失败');
                }
            } else {
                throw new Error('无法获取您的IP地址');
            }
        } catch (error) {
            console.error('查询我的IP失败:', error);
            this.showError('查询失败: ' + error.message);
            this.showToast('获取IP地址失败', 'error');
        }
    }

    // 获取客户端真实IP地址 - iOS兼容版本
    async getRealClientIP() {
        // 检查缓存（5分钟内有效）
        if (this.cachedClientIP && this.clientIPCacheTime && 
            (Date.now() - this.clientIPCacheTime < 5 * 60 * 1000)) {
            console.log('使用缓存的客户端IP:', this.cachedClientIP);
            return this.cachedClientIP;
        }

        try {
            console.log('尝试获取客户端IP...');
            
            // 简化的fetch请求，iOS兼容性更好
            const response = await fetch('https://api.ipify.org?format=json', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            console.log('外部IP服务响应:', response);
            
            console.log('IP获取响应状态:', response.status);

            if (response.ok) {
                const data = await response.json();
                const ip = data.ip;
                
                console.log('获取到的IP数据:', data);
                
                if (ip && this.isValidIP(ip)) {
                    console.log('验证通过，客户端IP:', ip);
                    // 缓存IP地址
                    this.cachedClientIP = ip;
                    this.clientIPCacheTime = Date.now();
                    return ip;
                }
            }
            
            throw new Error(`IP服务响应异常 (状态: ${response.status})`);
        } catch (error) {
            console.error('获取真实IP详细错误:', error);
            
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            
            // 如果是CORS、网络错误或load failed，尝试其他外部IP服务
            if (error.message.includes('CORS') || 
                error.message.includes('fetch') || 
                error.message.includes('load') ||
                error.message.includes('Failed') ||
                error.name === 'TypeError') {
                console.log('检测到网络问题，尝试备用IP服务...');
                
                // 备用IP服务列表
                const backupServices = [
                    'https://ipinfo.io/json',
                    'https://api.ipify.org?format=json',
                    'https://httpbin.org/ip'
                ];
                
                for (let i = 0; i < backupServices.length; i++) {
                    try {
                        console.log(`尝试备用服务 ${i + 1}:`, backupServices[i]);
                        const fallbackResponse = await fetch(backupServices[i], {
                            method: 'GET',
                            headers: { 'Accept': 'application/json' }
                        });
                        
                        if (fallbackResponse.ok) {
                            const fallbackData = await fallbackResponse.json();
                            let fallbackIP = null;
                            
                            // 不同服务返回格式不同
                            if (fallbackData.ip) {
                                fallbackIP = fallbackData.ip;
                            } else if (fallbackData.origin) {
                                fallbackIP = fallbackData.origin;
                            } else if (typeof fallbackData === 'string') {
                                fallbackIP = fallbackData.trim();
                            }
                            
                            if (fallbackIP && this.isValidIP(fallbackIP)) {
                                console.log(`从备用服务获取到IP:`, fallbackIP);
                                // 缓存获取到的IP
                                this.cachedClientIP = fallbackIP;
                                this.clientIPCacheTime = Date.now();
                                return fallbackIP;
                            }
                        }
                    } catch (serviceError) {
                        console.error(`备用服务 ${i + 1} 失败:`, serviceError);
                        continue;
                    }
                }
                
                console.error('所有备用IP服务都失败了');
            }
            
            throw new Error('无法获取IP地址：' + error.message);
        }
    }

    // 验证IP地址格式
    isValidIP(ip) {
        const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipPattern.test(ip);
    }

    async queryIP(ip = '') {
        // 使用Azure Function API代替直接调用ip-api.com
        const url = ip 
            ? `/api/ipquery?ip=${encodeURIComponent(ip)}`
            : `/api/ipquery`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接');
            }
            throw new Error('网络请求失败: ' + error.message);
        }
    }

    displayResults(data) {
        this.hideLoading();
        this.hideError();
        this.showResults();

        // 更新基本信息
        this.updateElement('ipAddress', data.query || '-');
        this.updateElement('countryCode', data.countryCode || '-');
        this.updateElement('country', data.country || '-');
        this.updateElement('city', data.city || '-');

        // 更新网络服务商信息
        this.updateElement('isp', data.isp || '-');
        this.updateElement('org', data.org || '-');
        this.updateElement('asname', data.asname || '-');
        
        // 解析AS号码
        const asNumber = data.as ? data.as.split(' ')[0] : '-';
        this.updateElement('asNumber', asNumber);

        // 更新网络类型信息（徽章样式）
        this.updateBadgeElement('mobile', data.mobile);
        this.updateBadgeElement('proxy', data.proxy);
        this.updateBadgeElement('hosting', data.hosting);

        // 更新地理位置信息
        this.updateElement('latitude', data.lat ? data.lat.toFixed(6) : '-');
        this.updateElement('longitude', data.lon ? data.lon.toFixed(6) : '-');
        this.updateElement('timezone', data.timezone || '-');
        this.updateElement('zip', data.zip || '-');

        // 移除自动滚动 - 让用户控制页面位置
    }

    updateElement(elementId, value) {
        const element = this.resultElements[elementId];
        if (element) {
            element.textContent = value;
            element.title = value; // 添加工具提示
        }
    }

    updateBadgeElement(elementId, value) {
        const element = this.resultElements[elementId];
        if (element) {
            const displayValue = value === true ? '是' : value === false ? '否' : '-';
            element.textContent = displayValue;
            
            // 移除之前的类
            element.classList.remove('true', 'false');
            
            // 添加对应的样式类
            if (value === true) {
                element.classList.add('true');
            } else if (value === false) {
                element.classList.add('false');
            }
        }
    }

    showLoading() {
        this.loading.classList.remove('hidden');
        this.resultSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
        this.searchBtn.disabled = true;
        this.searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 查询中...';
    }

    hideLoading() {
        this.loading.classList.add('hidden');
        this.searchBtn.disabled = false;
        this.searchBtn.innerHTML = '<i class="fas fa-search"></i> 查询';
    }

    showResults() {
        this.resultSection.classList.remove('hidden');
        this.errorSection.classList.add('hidden');
    }

    showError(message) {
        this.hideLoading();
        this.resultSection.classList.add('hidden');
        this.errorSection.classList.remove('hidden');
        this.errorMessage.textContent = message;
    }

    hideError() {
        this.errorSection.classList.add('hidden');
    }

    clearResults() {
        this.ipInput.value = '';
        this.resultSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
        this.hideLoading();
        this.ipInput.focus();
        this.showToast('已清除结果');
    }

    async copyResults() {
        try {
            const data = this.extractResultData();
            const text = this.formatResultsForCopy(data);
            
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            this.showToast('结果已复制到剪贴板');
        } catch (error) {
            this.showToast('复制失败', 'error');
        }
    }

    extractResultData() {
        const data = {};
        Object.keys(this.resultElements).forEach(key => {
            const element = this.resultElements[key];
            if (element) {
                data[key] = element.textContent;
            }
        });
        return data;
    }

    formatResultsForCopy(data) {
        return `IP查询结果
==================
IP地址: ${data.ipAddress}
国家代码: ${data.countryCode}
国家: ${data.country}
城市: ${data.city}

网络服务商信息
==================
ISP: ${data.isp}
组织: ${data.org}
AS名称: ${data.asname}
AS号码: ${data.asNumber}

网络类型
==================
移动网络: ${data.mobile}
代理服务器: ${data.proxy}
托管服务: ${data.hosting}

地理位置
==================
纬度: ${data.latitude}
经度: ${data.longitude}
时区: ${data.timezone}
邮编: ${data.zip}

查询时间: ${new Date().toLocaleString()}`;
    }

    showToast(message, type = 'success') {
        this.toastMessage.textContent = message;
        
        // 设置图标和样式
        const icon = this.toast.querySelector('i');
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            this.toast.style.background = 'var(--error-color)';
        } else if (type === 'info') {
            icon.className = 'fas fa-info-circle';
            this.toast.style.background = '#3498db'; // 蓝色信息提示
        } else {
            icon.className = 'fas fa-check-circle';
            this.toast.style.background = 'var(--success-color)';
        }
        
        this.toast.classList.add('show');
        
        // 根据类型调整显示时间
        const duration = type === 'info' ? 4000 : 3000;
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, duration);
    }

    // 缓存相关方法
    getCachedResult(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    cacheResult(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // 限制缓存大小
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    // 检查缓存版本并清理过期缓存
    checkCacheVersion() {
        try {
            const storedVersion = localStorage.getItem('ipapi_version');
            const now = Date.now();
            
            // 如果版本不匹配或者超过24小时，清理所有缓存
            if (storedVersion !== this.version) {
                console.log(`版本更新: ${storedVersion} -> ${this.version}, 清理缓存`);
                this.clearAllCache();
                localStorage.setItem('ipapi_version', this.version);
                localStorage.setItem('ipapi_cache_clear_time', now.toString());
            } else {
                // 即使版本相同，也检查是否需要定期清理缓存（24小时）
                const lastClearTime = localStorage.getItem('ipapi_cache_clear_time');
                if (!lastClearTime || (now - parseInt(lastClearTime)) > 24 * 60 * 60 * 1000) {
                    console.log('定期清理缓存（24小时）');
                    this.clearAllCache();
                    localStorage.setItem('ipapi_cache_clear_time', now.toString());
                }
            }
        } catch (error) {
            console.warn('缓存版本检查失败:', error);
        }
    }

    // 清理所有缓存
    clearAllCache() {
        try {
            // 清理应用内缓存
            if (this.cache) {
                this.cache.clear();
            }
            this.cachedClientIP = null;
            this.clientIPCacheTime = null;

            // 清理localStorage中的相关数据
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('ipapi_') || key.startsWith('ip_cache_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                if (key !== 'ipapi_version' && key !== 'ipapi_cache_clear_time') {
                    localStorage.removeItem(key);
                }
            });

            // 尝试清理浏览器缓存（如果支持的话）
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        if (name.includes('ipapi') || name.includes('v1')) {
                            caches.delete(name);
                        }
                    });
                }).catch(err => console.warn('清理caches失败:', err));
            }

            console.log('缓存清理完成');
        } catch (error) {
            console.warn('缓存清理失败:', error);
        }
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.ipQueryApp = new IPQueryApp();
});

// Service Worker注册（临时禁用以修复iOS问题）
if ('serviceWorker' in navigator && false) { // 临时禁用
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW注册成功:', registration);
            })
            .catch(registrationError => {
                console.log('SW注册失败:', registrationError);
            });
    });
}

// PWA安装提示
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // 可以在这里显示自定义安装按钮
    showInstallPrompt();
});

function showInstallPrompt() {
    // 创建安装提示
    const installBanner = document.createElement('div');
    installBanner.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; background: var(--primary-color); color: white; padding: 1rem; text-align: center; z-index: 1000; box-shadow: var(--shadow-md);">
            <span>将此应用安装到您的设备主屏幕</span>
            <button id="installBtn" style="background: white; color: var(--primary-color); border: none; border-radius: 4px; padding: 0.5rem 1rem; margin-left: 1rem; cursor: pointer;">安装</button>
            <button id="dismissBtn" style="background: transparent; color: white; border: 1px solid white; border-radius: 4px; padding: 0.5rem 1rem; margin-left: 0.5rem; cursor: pointer;">暂不</button>
        </div>
    `;
    
    document.body.appendChild(installBanner);
    
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`用户选择: ${outcome}`);
            deferredPrompt = null;
        }
        installBanner.remove();
    });
    
    document.getElementById('dismissBtn').addEventListener('click', () => {
        installBanner.remove();
    });
    
    // 10秒后自动隐藏
    setTimeout(() => {
        if (installBanner.parentNode) {
            installBanner.remove();
        }
    }, 10000);
}