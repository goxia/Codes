class IPQueryApp {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
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
            this.ipInput.value = '';
            this.handleSearch();
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
                this.handleSearch();
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

        // 滚动到结果区域
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
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
        icon.className = type === 'error' 
            ? 'fas fa-exclamation-circle' 
            : 'fas fa-check-circle';
        
        this.toast.style.background = type === 'error' 
            ? 'var(--error-color)' 
            : 'var(--success-color)';
        
        this.toast.classList.add('show');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
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
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    window.ipQueryApp = new IPQueryApp();
});

// Service Worker注册（如果支持）
if ('serviceWorker' in navigator) {
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