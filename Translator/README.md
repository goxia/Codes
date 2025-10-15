# Translator

现代化的翻译工具，基于 Azure Translator 和 Speech Services 构建，支持 PWA 安装。

## 功能特性

- ✅ 文本翻译（支持多种语言）
- ✅ 自动语言检测
- ✅ 单词和句子发音（TTS）
- ✅ 翻译历史记录
- ✅ 收藏功能
- ✅ 复制粘贴支持
- ✅ 响应式设计（桌面和移动端）
- ✅ PWA 支持（可安装为独立应用）

## 当前状态

✅ **已部署到生产环境** - 使用 Azure Translator 和 Speech Services
- 🌐 在线访问: [Azure Static Web Apps](https://ats.mdt.link)
- 📱 支持移动端优化布局

## 本地开发

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
cd web
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

## Azure 资源配置（后续步骤）

### 1. 创建 Azure Translator 资源

1. 登录 [Azure Portal](https://portal.azure.com)
2. 点击 "创建资源" → 搜索 "Translator"
3. 创建资源并选择定价层：
   - F0（免费）：200万字符/月
   - S1（标准）：按需付费
4. 记录以下信息：
   - 订阅密钥（Key）
   - 区域（Region，如 eastus）

### 2. 创建 Azure Speech Services 资源

1. 在 Azure Portal 创建 "Speech Services" 资源
2. 选择定价层：
   - F0（免费）：5小时语音合成/月
   - S0（标准）：按需付费
3. 记录密钥和区域

### 3. 配置环境变量

创建 `api/local.settings.json`（后端配置）：

```json
{
  "IsEncrypted": false,
  "Values": {
    "TRANSLATOR_KEY": "your-translator-key",
    "TRANSLATOR_REGION": "eastus",
    "SPEECH_KEY": "your-speech-key",
    "SPEECH_REGION": "eastus"
  }
}
```

## 部署到 Azure Static Web Apps

### 使用 VS Code 扩展（推荐）

1. 安装 "Azure Static Web Apps" 扩展
2. 右键点击 `web` 文件夹
3. 选择 "Deploy to Static Web App"
4. 按提示完成配置

### 使用 Azure Portal

1. 创建 Static Web App 资源
2. 连接 GitHub 仓库
3. 配置构建：
   - App location: `/web`
   - Api location: `/api`
   - Output location: `dist`

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **PWA**: vite-plugin-pwa
- **后端**: Azure Functions (TypeScript)
- **API**: Azure Translator + Speech Services

## 项目结构

```
Translator/
├── web/                    # 前端应用
│   ├── src/
│   │   ├── components/     # React 组件
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/            # 静态资源
│   └── vite.config.ts
├── api/                   # Azure Functions 后端（待创建）
│   └── src/
│       └── functions/
└── README.md
```

## 许可证

MIT

## 支持

如有问题或建议，请创建 Issue。
