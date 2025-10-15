// Main application file - coordinates all components
class App {
    constructor() {
        this.converter = null;
        this.ui = null;

        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing CMD to PowerShell Converter...');
            
            // Initialize storage first
            await this.initializeStorage();
            
            // Initialize enhanced converter with Microsoft Learn integration
            this.converter = new EnhancedCommandConverter();
            
            // Initialize UI
            this.ui = new UIManager();
            
            // Load previous state and data
            await this.loadApplicationData();
            

            
            // Initialize examples
            this.updateExamples();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('Application initialized successfully');
            
            // Show welcome message
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeStorage() {
        if (StorageManager.isSupported()) {
            await window.StorageManager.init();
            console.log('Storage initialized');
        } else {
            console.warn('IndexedDB not supported, using fallback storage');
        }
    }

    async loadApplicationData() {
        try {
            // Load conversion history
            if (this.converter && window.StorageManager) {
                await this.converter.loadHistory();
                const history = this.converter.getHistory();
                this.ui.updateHistory(history);
            }
            
            // Load previous UI state
            await this.ui.loadState();
            
            console.log('Application data loaded');
        } catch (error) {
            console.warn('Could not load application data:', error);
        }
    }

    updateExamples() {
        if (this.converter && this.ui) {
            const examples = this.converter.getExamples();
            this.ui.updateExamples(examples);
        }
    }



    showWelcomeMessage() {
        // Mark as visited without showing toast notification
        if (window.StorageManager) {
            window.StorageManager.loadSetting('hasVisited', false).then(hasVisited => {
                if (!hasVisited) {
                    // Mark as visited without notification
                    window.StorageManager.saveSetting('hasVisited', true);
                }
            });
        }
    }

    handleInitializationError(error) {
        // Show error message to user
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        errorContainer.innerHTML = `
            <div class="error-message">
                <h2>应用初始化失败</h2>
                <p>抱歉，应用无法正常启动。请刷新页面重试。</p>
                <p class="error-details">错误信息: ${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">刷新页面</button>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }

    // Public methods for external access
    
    convert(input, sourceType = 'auto') {
        if (!this.isInitialized || !this.converter) {
            console.warn('Application not yet initialized');
            return { output: '', type: 'error', suggestions: [] };
        }
        
        return this.converter.convert(input, sourceType);
    }

    getHistory() {
        if (!this.converter) return [];
        return this.converter.getHistory();
    }

    clearHistory() {
        if (this.converter) {
            this.converter.clearHistory();
            this.ui.updateHistory([]);
        }
    }

    exportData() {
        if (!window.StorageManager) {
            throw new Error('Storage not available');
        }
        return window.StorageManager.exportData();
    }

    async importData(data) {
        if (!window.StorageManager) {
            throw new Error('Storage not available');
        }
        
        await window.StorageManager.importData(data);
        
        // Reload application data
        await this.loadApplicationData();
        
        this.ui.showToast('导入成功', '数据已成功导入', 'success');
    }

    async getStorageStats() {
        if (!window.StorageManager) {
            return { totalItems: 0 };
        }
        
        return await window.StorageManager.getStorageStats();
    }

    // Utility methods for debugging and development

    getAppInfo() {
        return {
            version: '1.0.0',
            initialized: this.isInitialized,
            converter: !!this.converter,
            ui: !!this.ui,
            storage: StorageManager.isSupported(),
            historyCount: this.converter ? this.converter.getHistory().length : 0
        };
    }

    // Method to handle service worker updates
    handleServiceWorkerUpdate() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // Page will reload when new service worker takes control
                window.location.reload();
            });
        }
    }

    // Handle online/offline status
    handleNetworkStatus() {
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                this.ui.showToast('已连接', '网络连接已恢复', 'success');
            } else {
                this.ui.showToast('离线模式', '当前处于离线状态，功能可能受限', 'warning');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    }

    // Analytics and usage tracking (privacy-focused)
    trackUsage(action, details = {}) {
        // Simple privacy-focused usage tracking
        const event = {
            action,
            timestamp: new Date(),
            details,
            session: this.getSessionId()
        };
        
        // Store locally for insights (not sent to servers)
        if (window.StorageManager) {
            window.StorageManager.saveSetting('lastAction', event);
        }
        
        console.log('Action tracked:', action, details);
    }

    getSessionId() {
        // Generate or retrieve session ID
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // Performance monitoring
    measurePerformance(label, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`Performance [${label}]: ${(end - start).toFixed(2)}ms`);
        
        return result;
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    
    // Make app globally available
    window.app = new App();
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        
        if (window.app && window.app.ui) {
            window.app.ui.showToast(
                '发生错误', 
                '应用遇到了一个问题，请刷新页面', 
                'error'
            );
        }
    });
    
    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        if (window.app && window.app.ui) {
            window.app.ui.showToast(
                '异步错误', 
                '应用遇到了异步处理问题', 
                'error'
            );
        }
    });
});

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause heavy operations
        console.log('Application paused');
    } else {
        // Page is visible, resume operations
        console.log('Application resumed');
        
        if (window.app && window.app.ui) {
            // Refresh UI state if needed
            window.app.loadApplicationData();
        }
    }
});

// Export for debugging in console
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
} else {
    window.App = App;
}