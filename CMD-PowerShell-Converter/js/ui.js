// UI Manager - handles user interface interactions and updates
class UIManager {
    constructor() {
        this.elements = {};
        this.currentTheme = 'auto';
        this.isSwapped = false; // Track if panels are swapped
        this.toastQueue = [];
        this.toastTimeout = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeTheme();
    }

    // Initialize DOM element references
    initializeElements() {
        console.log('Initializing UI elements...');
        
        this.elements = {
            // Input elements
            cmdInput: document.getElementById('cmd-input'),
            psInput: document.getElementById('ps-input'),
            
            // Suggestion containers
            cmdSuggestions: document.getElementById('cmd-suggestions'),
            psSuggestions: document.getElementById('ps-suggestions'),
            
            // Control buttons
            swapBtn: document.getElementById('swap-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            
            // Clear and copy buttons
            clearBtns: document.querySelectorAll('.clear-btn'),
            copyBtns: document.querySelectorAll('.copy-btn'),
            
            // Examples and history
            examplesGrid: document.getElementById('examples-grid'),
            historyList: document.getElementById('history-list'),
            clearHistoryBtn: document.getElementById('clear-history'),
            
            // Modal elements
            
            // Toast container
            toastContainer: document.getElementById('toast-container'),
            
            // Conversion info panel
            conversionInfo: document.getElementById('conversion-info'),
            infoContent: document.getElementById('info-content'),
            
            // Panels
            cmdPanel: document.querySelector('.cmd-panel'),
            psPanel: document.querySelector('.ps-panel')
        };
        
        // Validate critical elements
        const criticalElements = ['cmdInput', 'psInput', 'cmdSuggestions', 'psSuggestions'];
        for (const elementKey of criticalElements) {
            if (!this.elements[elementKey]) {
                console.error(`Critical UI element not found: ${elementKey}`);
                throw new Error(`UI初始化失败：找不到元素 ${elementKey}`);
            }
        }
        
        console.log('UI elements initialized successfully');
    }

    // Bind event listeners
    bindEvents() {
        console.log('Binding UI events...');
        
        try {
            // Input events (async handlers)
            this.elements.cmdInput.addEventListener('input', async (e) => {
                try {
                    await this.handleInput(e, 'cmd');
                } catch (error) {
                    console.error('Error in CMD input handler:', error);
                }
            });
            this.elements.psInput.addEventListener('input', async (e) => {
                try {
                    await this.handleInput(e, 'ps');
                } catch (error) {
                    console.error('Error in PS input handler:', error);
                }
            });
        
        // Keyboard shortcuts
        this.elements.cmdInput.addEventListener('keydown', (e) => this.handleKeydown(e, 'cmd'));
        this.elements.psInput.addEventListener('keydown', (e) => this.handleKeydown(e, 'ps'));
        
        // Control buttons
        this.elements.swapBtn.addEventListener('click', () => this.swapPanels());
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Clear and copy buttons
        this.elements.clearBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.clearInput(e.target.dataset.target));
        });
        
        this.elements.copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.copyToClipboard(e.target.dataset.target));
        });
        
        // History management
        this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        

        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        
        // Window events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('beforeunload', () => this.saveState());
        
        console.log('UI events bound successfully');
        
        } catch (error) {
            console.error('Error binding UI events:', error);
            throw error;
        }
    }

    // Handle input changes (enhanced with async support)
    async handleInput(event, sourceType) {
        try {
            const input = event.target.value;
            
            // Determine the actual command type based on current panel state
            let actualSourceType;
            
            // Figure out what type of command this panel should accept
            if (sourceType === 'cmd') {
                // Left panel (cmdInput)
                actualSourceType = this.isSwapped ? 'powershell' : 'cmd';
            } else {
                // Right panel (psInput) - sourceType is 'ps'
                actualSourceType = this.isSwapped ? 'cmd' : 'powershell';
            }
            
            const targetInput = sourceType === 'cmd' ? this.elements.psInput : this.elements.cmdInput;
            const suggestionsContainer = sourceType === 'cmd' ? this.elements.cmdSuggestions : this.elements.psSuggestions;
            
            // Clear old suggestions from panels
            this.clearSuggestions();
            
            // Show loading in conversion info panel
            if (input.trim()) {
                this.showConversionInfo('正在转换...');
            }
            
            // Convert the command (now async)
            if (window.app && window.app.converter) {
                const result = await window.app.converter.convert(input, actualSourceType);
                
                // Update target input (always update the opposite panel)
                if (targetInput) {
                    targetInput.value = result.output;
                }
                
                // Show conversion info with enhanced information
                if (result.suggestions && result.suggestions.length > 0) {
                    this.displayConversionInfo(result, actualSourceType);
                } else if (!input.trim()) {
                    // Hide conversion info if input is empty
                    this.hideConversionInfo();
                }
            }
            
            // Hide conversion info if input is empty
            if (!input.trim()) {
                this.hideConversionInfo();
            }
            
            // Auto-resize textarea
            this.autoResize(event.target);
            
        } catch (error) {
            console.error('Error in handleInput:', error);
            // Show error to user
            if (this.showToast) {
                this.showToast('转换错误', '命令转换时出现错误: ' + error.message, 'error');
            }
            
            // Clear loading indicator
            const suggestionsContainer = sourceType === 'cmd' ? this.elements.cmdSuggestions : this.elements.psSuggestions;
            if (suggestionsContainer) {
                this.hideLoadingIndicator(suggestionsContainer);
            }
        }
    }

    // Handle keyboard shortcuts
    handleKeydown(event, sourceType) {
        // Ctrl+Enter to swap panels
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            this.swapPanels();
        }
        
        // Ctrl+L to clear current input
        if (event.ctrlKey && event.key === 'l') {
            event.preventDefault();
            this.clearInput(sourceType);
        }
        
        // Ctrl+C when no selection to copy current panel content
        if (event.ctrlKey && event.key === 'c' && window.getSelection().toString() === '') {
            this.copyToClipboard(sourceType);
        }
    }

    // Handle global keyboard shortcuts
    handleGlobalKeydown(event) {
        // Ctrl+Shift+T to toggle theme
        if (event.ctrlKey && event.shiftKey && event.key === 'T') {
            event.preventDefault();
            this.toggleTheme();
        }
        

    }

    // Auto-resize textarea based on content
    autoResize(textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 150), 400);
        textarea.style.height = newHeight + 'px';
    }

    // Swap input panels
    async swapPanels() {
        const cmdValue = this.elements.cmdInput.value;
        const psValue = this.elements.psInput.value;
        
        // Swap input values
        this.elements.cmdInput.value = psValue;
        this.elements.psInput.value = cmdValue;
        
        // Update visual state
        this.isSwapped = !this.isSwapped;
        
        // Swap panel headers and content
        const cmdPanel = this.elements.cmdPanel;
        const psPanel = this.elements.psPanel;
        
        // Get header elements
        const cmdHeader = cmdPanel.querySelector('.panel-header h2');
        const psHeader = psPanel.querySelector('.panel-header h2');
        
        // Get placeholders
        const cmdInput = this.elements.cmdInput;
        const psInput = this.elements.psInput;
        
        if (this.isSwapped) {
            // Change CMD panel to show PowerShell
            cmdHeader.innerHTML = '<i class="fab fa-microsoft"></i> PowerShell';
            cmdInput.placeholder = "输入 PowerShell 命令...\u000A例如: Get-ChildItem -Recurse -Filter *.txt";
            
            // Change PS panel to show CMD
            psHeader.innerHTML = '<i class="fas fa-terminal"></i> CMD';
            psInput.placeholder = "CMD 命令将在这里显示...\u000A或者输入 CMD 命令转换为 PowerShell";
            
            // Update panel classes for styling
            cmdPanel.classList.remove('cmd-panel');
            cmdPanel.classList.add('ps-panel');
            psPanel.classList.remove('ps-panel');
            psPanel.classList.add('cmd-panel');
        } else {
            // Restore original state
            cmdHeader.innerHTML = '<i class="fas fa-terminal"></i> CMD';
            cmdInput.placeholder = "输入 CMD 命令...\u000A例如: dir /s *.txt";
            
            psHeader.innerHTML = '<i class="fab fa-microsoft"></i> PowerShell';
            psInput.placeholder = "PowerShell 命令将在这里显示...\u000A或者输入 PowerShell 命令转换为 CMD";
            
            // Restore panel classes
            cmdPanel.classList.remove('ps-panel');
            cmdPanel.classList.add('cmd-panel');
            psPanel.classList.remove('cmd-panel');
            psPanel.classList.add('ps-panel');
        }
        
        // Animate swap button
        this.elements.swapBtn.style.transform = this.isSwapped ? 'rotate(180deg)' : 'rotate(0deg)';
        
        // Trigger conversion for the newly entered text (now async)
        // Note: After swapping, we need to respect the new panel roles
        try {
            if (this.elements.cmdInput.value.trim()) {
                await this.handleInput({ target: this.elements.cmdInput }, 'cmd');
            }
            if (this.elements.psInput.value.trim()) {
                await this.handleInput({ target: this.elements.psInput }, 'ps');
            }
        } catch (error) {
            console.error('Error during panel swap conversion:', error);
        }
    }

    // Clear input
    clearInput(targetType) {
        const input = targetType === 'cmd' ? this.elements.cmdInput : this.elements.psInput;
        const otherInput = targetType === 'cmd' ? this.elements.psInput : this.elements.cmdInput;
        const suggestions = targetType === 'cmd' ? this.elements.cmdSuggestions : this.elements.psSuggestions;
        
        input.value = '';
        otherInput.value = '';
        suggestions.innerHTML = '';
        
        this.autoResize(input);
        this.autoResize(otherInput);
    }

    // Copy to clipboard
    async copyToClipboard(targetType) {
        const input = targetType === 'cmd' ? this.elements.cmdInput : this.elements.psInput;
        const text = input.value;
        
        if (!text.trim()) {
            return;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            // Successfully copied - no notification needed
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.showToast('复制失败', '无法访问剪贴板', 'error');
        }
    }

    // Update suggestions display
    updateSuggestions(container, suggestions) {
        container.innerHTML = '';
        
        if (!suggestions || suggestions.length === 0) {
            return;
        }
        
        suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'suggestion-item';
            suggestionElement.innerHTML = `
                <div class="suggestion-command">${this.escapeHtml(suggestion.command)}</div>
                <div class="suggestion-description">${this.escapeHtml(suggestion.description)}</div>
            `;
            
            // Click to use suggestion
            suggestionElement.addEventListener('click', () => {
                this.useSuggestion(suggestion.command, container);
            });
            
            container.appendChild(suggestionElement);
        });
    }

    // Enhanced suggestions display with documentation links and source info
    updateEnhancedSuggestions(container, result) {
        container.innerHTML = '';
        
        if (!result.suggestions || result.suggestions.length === 0) {
            return;
        }

        // Create enhanced suggestions container
        const suggestionsWrapper = document.createElement('div');
        suggestionsWrapper.className = 'enhanced-suggestions';

        // Add source information
        if (result.source) {
            const sourceInfo = document.createElement('div');
            sourceInfo.className = 'source-info';
            sourceInfo.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>来源: ${this.getSourceDisplayName(result.source)}</span>
            `;
            suggestionsWrapper.appendChild(sourceInfo);
        }

        // Add main suggestions
        result.suggestions.forEach(suggestion => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'suggestion-item enhanced';
            
            if (typeof suggestion === 'string') {
                suggestionElement.innerHTML = `
                    <div class="suggestion-text">${this.escapeHtml(suggestion)}</div>
                `;
            } else if (suggestion.command) {
                suggestionElement.innerHTML = `
                    <div class="suggestion-command">${this.escapeHtml(suggestion.command)}</div>
                    <div class="suggestion-description">${this.escapeHtml(suggestion.description || '')}</div>
                `;
                
                // Click to use suggestion
                suggestionElement.addEventListener('click', () => {
                    this.useSuggestion(suggestion.command, container);
                });
            }
            
            suggestionsWrapper.appendChild(suggestionElement);
        });

        // Add documentation links if available
        if (result.documentation) {
            const docsSection = document.createElement('div');
            docsSection.className = 'documentation-links';
            
            const docsHeader = document.createElement('div');
            docsHeader.className = 'docs-header';
            docsHeader.innerHTML = '<i class="fas fa-book"></i> 相关文档';
            docsSection.appendChild(docsHeader);

            if (result.documentation.cmd) {
                const cmdLink = document.createElement('a');
                cmdLink.href = result.documentation.cmd;
                cmdLink.target = '_blank';
                cmdLink.className = 'doc-link cmd-link';
                cmdLink.innerHTML = '<i class="fas fa-terminal"></i> CMD 官方文档';
                docsSection.appendChild(cmdLink);
            }

            if (result.documentation.powershell) {
                const psLink = document.createElement('a');
                psLink.href = result.documentation.powershell;
                psLink.target = '_blank';
                psLink.className = 'doc-link ps-link';
                psLink.innerHTML = '<i class="fab fa-microsoft"></i> PowerShell 文档';
                docsSection.appendChild(psLink);
            }

            if (result.documentation.official) {
                const officialLink = document.createElement('a');
                officialLink.href = result.documentation.official;
                officialLink.target = '_blank';
                officialLink.className = 'doc-link official-link';
                officialLink.innerHTML = '<i class="fas fa-external-link-alt"></i> Microsoft Learn';
                docsSection.appendChild(officialLink);
            }

            suggestionsWrapper.appendChild(docsSection);
        }

        // Add similar commands if available
        if (result.similar && result.similar.length > 0) {
            const similarSection = document.createElement('div');
            similarSection.className = 'similar-commands';
            
            const similarHeader = document.createElement('div');
            similarHeader.className = 'similar-header';
            similarHeader.innerHTML = '<i class="fas fa-lightbulb"></i> 相似命令';
            similarSection.appendChild(similarHeader);

            result.similar.forEach(similar => {
                const similarItem = document.createElement('div');
                similarItem.className = 'similar-item';
                similarItem.innerHTML = `
                    <span class="similar-command">${similar.command}</span>
                    <span class="similar-target">${similar.target}</span>
                    <span class="similarity-score">${similar.similarity}</span>
                `;
                
                similarItem.addEventListener('click', () => {
                    this.useSuggestion(similar.command, container);
                });
                
                similarSection.appendChild(similarItem);
            });

            suggestionsWrapper.appendChild(similarSection);
        }

        container.appendChild(suggestionsWrapper);
    }

    // Get display name for data source
    getSourceDisplayName(source) {
        const sourceNames = {
            'local_basic': '本地映射',
            'local_complex': '本地高级映射',
            'microsoft_learn': 'Microsoft Learn',
            'cache': '缓存结果',
            'fallback': '备用查询',
            'unknown': '未知命令',
            'error': '查询错误'
        };
        
        return sourceNames[source] || source;
    }

    // Show loading indicator
    showLoadingIndicator(container, message = '正在处理...') {
        container.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
    }

    // Show conversion info panel
    showConversionInfo(message) {
        this.elements.conversionInfo.classList.add('show');
        this.elements.infoContent.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
    }

    // Display conversion info with results
    displayConversionInfo(result, sourceType) {
        this.elements.conversionInfo.classList.add('show');
        
        console.log('Display conversion info:', result); // Debug log
        
        let content = '';
        
        // Add conversion description
        if (result.output && result.output !== '') {
            const sourceTypeName = sourceType === 'cmd' ? 'CMD' : 'PowerShell';
            const targetTypeName = sourceType === 'cmd' ? 'PowerShell' : 'CMD';
            content += `<div class="conversion-description">
                <strong>${sourceTypeName} 命令已转换为 ${targetTypeName}</strong>
            </div>`;
        }
        
        // Add suggestions
        if (result.suggestions && result.suggestions.length > 0) {
            content += '<div class="suggestions-list">';
            result.suggestions.forEach(suggestion => {
                if (typeof suggestion === 'string') {
                    content += `<div class="suggestion-text">${this.escapeHtml(suggestion)}</div>`;
                }
            });
            content += '</div>';
        }
        
        // Add documentation links if available
        if (result.documentation) {
            content += '<div class="docs-links">';
            if (result.documentation.cmd) {
                content += `<a href="${result.documentation.cmd}" target="_blank" class="doc-link">
                    <i class="fas fa-terminal"></i> CMD 文档
                </a>`;
            }
            if (result.documentation.powershell) {
                content += `<a href="${result.documentation.powershell}" target="_blank" class="doc-link">
                    <i class="fab fa-microsoft"></i> PowerShell 文档
                </a>`;
            }
            content += '</div>';
        }
        
        this.elements.infoContent.innerHTML = content;
    }

    // Hide conversion info panel
    hideConversionInfo() {
        this.elements.conversionInfo.classList.remove('show');
    }

    // Clear suggestions from all panels
    clearSuggestions() {
        this.elements.cmdSuggestions.innerHTML = '';
        this.elements.psSuggestions.innerHTML = '';
    }

    // Hide loading indicator
    hideLoadingIndicator(container) {
        const loading = container.querySelector('.loading-indicator');
        if (loading) {
            loading.remove();
        }
    }

    // Use a suggestion (updated to handle async)
    async useSuggestion(command, container) {
        try {
            // Determine which input to update based on container
            const isCmdSuggestion = container === this.elements.cmdSuggestions;
            const targetInput = isCmdSuggestion ? this.elements.cmdInput : this.elements.psInput;
            
            targetInput.value = command;
            this.autoResize(targetInput);
            
            // Trigger conversion (now async)
            await this.handleInput({ target: targetInput }, isCmdSuggestion ? 'cmd' : 'ps');
        } catch (error) {
            console.error('Error using suggestion:', error);
            this.showToast('错误', '应用建议时出错', 'error');
        }
    }

    // Theme management
    initializeTheme() {
        // Load saved theme or use system preference
        if (window.StorageManager) {
            window.StorageManager.loadSetting('theme', 'auto').then(theme => {
                this.setTheme(theme);
            });
        } else {
            this.setTheme('auto');
        }
    }

    toggleTheme() {
        const themes = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        
        this.setTheme(nextTheme);
        
        // Save preference
        if (window.StorageManager) {
            window.StorageManager.saveSetting('theme', nextTheme);
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme toggle icon
        const icon = this.elements.themeToggle.querySelector('i');
        switch (theme) {
            case 'light':
                icon.className = 'fas fa-sun';
                break;
            case 'dark':
                icon.className = 'fas fa-moon';
                break;
            case 'auto':
                icon.className = 'fas fa-circle-half-stroke';
                break;
        }
    }

    getThemeDisplayName(theme) {
        const names = {
            'light': '明亮',
            'dark': '深色',
            'auto': '自动'
        };
        return names[theme] || theme;
    }

    // Toast notifications
    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }



    // History management
    updateHistory(history) {
        this.elements.historyList.innerHTML = '';
        
        if (!history || history.length === 0) {
            this.elements.historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>暂无转换历史</p>
                </div>
            `;
            return;
        }
        
        history.forEach(item => {
            const historyElement = document.createElement('div');
            historyElement.className = 'history-item';
            
            const timeStr = new Date(item.timestamp).toLocaleString('zh-CN');
            
            historyElement.innerHTML = `
                <div class="history-commands">
                    <div class="history-${item.sourceType}">${this.escapeHtml(item.input)}</div>
                    <div class="history-arrow">→</div>
                    <div class="history-${item.targetType}">${this.escapeHtml(item.output)}</div>
                </div>
                <div class="history-time">${timeStr}</div>
            `;
            
            // Click to use history item
            historyElement.addEventListener('click', () => {
                this.useHistoryItem(item);
            });
            
            this.elements.historyList.appendChild(historyElement);
        });
    }

    useHistoryItem(historyItem) {
        if (historyItem.sourceType === 'cmd') {
            this.elements.cmdInput.value = historyItem.input;
            this.elements.psInput.value = historyItem.output;
        } else {
            this.elements.psInput.value = historyItem.input;
            this.elements.cmdInput.value = historyItem.output;
        }
        
        this.autoResize(this.elements.cmdInput);
        this.autoResize(this.elements.psInput);
        
        this.showToast('历史记录', '已应用历史转换', 'success');
    }

    clearHistory() {
        if (window.app && window.app.converter) {
            window.app.converter.clearHistory();
            this.updateHistory([]);
            this.showToast('历史清空', '转换历史已清空', 'success');
        }
    }

    // Update examples display
    updateExamples(examples) {
        if (!this.elements.examplesGrid) {
            return;
        }
        
        this.elements.examplesGrid.innerHTML = '';
        
        if (!examples || examples.length === 0) {
            return;
        }
        
        examples.forEach(example => {
            const exampleElement = document.createElement('div');
            exampleElement.className = 'example-item';
            exampleElement.innerHTML = `
                <div class="example-cmd">${this.escapeHtml(example.cmd)}</div>
                <div class="example-ps">${this.escapeHtml(example.powershell)}</div>
                <div class="example-description">${this.escapeHtml(example.description)}</div>
            `;
            
            // Click to use example
            exampleElement.addEventListener('click', () => {
                this.useExample(example);
            });
            
            this.elements.examplesGrid.appendChild(exampleElement);
        });
    }

    useExample(example) {
        this.elements.cmdInput.value = example.cmd;
        this.elements.psInput.value = example.powershell;
        
        this.autoResize(this.elements.cmdInput);
        this.autoResize(this.elements.psInput);
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleResize() {
        // Handle responsive layout changes if needed
    }

    saveState() {
        // Save current state before page unload
        if (window.StorageManager) {
            const state = {
                cmdInput: this.elements.cmdInput.value,
                psInput: this.elements.psInput.value,
                isSwapped: this.isSwapped,
                theme: this.currentTheme
            };
            
            window.StorageManager.saveSetting('lastState', state);
        }
    }

    async loadState() {
        // Load previous state
        if (window.StorageManager) {
            try {
                const state = await window.StorageManager.loadSetting('lastState', {});
                
                if (state.cmdInput) this.elements.cmdInput.value = state.cmdInput;
                if (state.psInput) this.elements.psInput.value = state.psInput;
                if (state.isSwapped) this.isSwapped = state.isSwapped;
                
                this.autoResize(this.elements.cmdInput);
                this.autoResize(this.elements.psInput);
            } catch (error) {
                console.warn('Could not load previous state:', error);
            }
        }
    }

    // Show loading state
    showLoading(show = true) {
        // Add loading indicator if needed
        if (show) {
            document.body.classList.add('loading');
        } else {
            document.body.classList.remove('loading');
        }
    }


}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}