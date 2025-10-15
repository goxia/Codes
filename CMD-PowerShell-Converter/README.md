# CMD to PowerShell Converter

一个现代化的Web应用程序，用于在CMD命令和PowerShell命令之间进行转换。支持PWA离线使用，具有美观的现代UI设计。

## 功能特性

### 🔄 双向转换
- **CMD → PowerShell**: 将传统CMD命令转换为现代PowerShell等价命令
- **PowerShell → CMD**: 将PowerShell命令转换为CMD命令
- **智能检测**: 自动识别输入的命令类型

### 💡 智能建议
- 提供相关命令建议和示例
- 显示参数说明和用法
- 常用命令快速访问

### 📱 现代化界面
- **响应式设计**: 支持桌面、平板和手机
- **主题切换**: 明亮、深色、自动模式
- **直观布局**: 左右分屏，类似翻译界面
- **快捷操作**: 一键交换、复制、清空

### 🔧 PWA功能
- **离线使用**: 完全支持离线操作
- **应用安装**: 可安装到设备，如原生应用
- **快速启动**: 优化的缓存策略
- **跨平台**: 支持Windows、macOS、Linux、Android、iOS

### 💾 数据管理
- **历史记录**: 自动保存转换历史
- **本地存储**: 使用IndexedDB安全存储
- **数据导出**: 支持备份和恢复
- **自定义规则**: 可添加个人转换规则

## 技术栈

- **前端**: 纯HTML5 + CSS3 + JavaScript (ES6+)
- **存储**: IndexedDB for 离线数据
- **PWA**: Service Worker + Web App Manifest
- **字体**: Inter + JetBrains Mono
- **图标**: Font Awesome 6
- **架构**: 模块化设计，易于维护

## 快速开始

### 本地开发

1. 克隆项目到本地
```bash
git clone <repository-url>
cd cmd-powershell-converter
```

2. 启动本地服务器
```bash
# 使用Python
python -m http.server 8080

# 或使用Node.js
npx serve .

# 或使用任何其他静态服务器
```

3. 打开浏览器访问 `http://localhost:8080`

### 部署到Azure

项目已配置为可直接部署到Azure Static Web Apps：

1. Fork此仓库
2. 在Azure Portal中创建Static Web App
3. 连接到您的GitHub仓库
4. Azure会自动部署应用

## 使用说明

### 基本操作

1. **输入命令**: 在左侧(CMD)或右侧(PowerShell)输入框中输入命令
2. **自动转换**: 应用会自动检测并转换到对应的命令
3. **查看建议**: 下方会显示相关的命令建议和说明
4. **交换面板**: 点击中间的交换按钮可以切换输入输出方向

### 键盘快捷键

- `Ctrl + Enter`: 交换面板
- `Ctrl + L`: 清空当前输入
- `Ctrl + Shift + T`: 切换主题
- `Ctrl + Shift + I`: 显示安装对话框

### 常用转换示例

| CMD命令 | PowerShell等价命令 | 说明 |
|---------|-------------------|------|
| `dir /s *.txt` | `Get-ChildItem -Path . -Filter "*.txt" -Recurse` | 递归搜索文本文件 |
| `copy file.txt backup\` | `Copy-Item -Path "file.txt" -Destination "backup\"` | 复制文件 |
| `del /q /f temp\*.*` | `Remove-Item -Path "temp\*.*" -Force -Confirm:$false` | 强制删除文件 |
| `tasklist` | `Get-Process` | 列出运行进程 |
| `ping google.com` | `Test-NetConnection -ComputerName "google.com"` | 网络连接测试 |

## 项目结构

```
cmd-powershell-converter/
├── index.html              # 主页面
├── manifest.json           # PWA配置
├── sw.js                  # Service Worker
├── styles/
│   └── main.css           # 主样式表
├── js/
│   ├── app.js             # 主应用程序
│   ├── commands.js        # 命令映射数据
│   ├── converter.js       # 转换引擎
│   ├── storage.js         # 存储管理
│   └── ui.js              # 界面管理
├── icons/                 # PWA图标
└── README.md              # 项目说明
```

## 浏览器支持

- **Chrome/Edge**: 完全支持
- **Firefox**: 完全支持  
- **Safari**: 基本支持(PWA功能受限)
- **移动浏览器**: 支持所有现代移动浏览器

## 隐私和安全

- **本地存储**: 所有数据仅存储在用户设备上
- **无服务器依赖**: 纯客户端应用，无数据传输
- **离线优先**: 不依赖网络连接运行
- **开源透明**: 代码完全开源可审计

## 联系方式

- 项目地址: [GitHub Repository]
- 问题反馈: [GitHub Issues]
- 功能建议: [GitHub Discussions]

---


**享受现代化的命令转换体验！** 🚀
