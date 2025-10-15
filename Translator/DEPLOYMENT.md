# Azure Static Web Apps 部署指南

本指南将帮助您将翻译应用部署到 Azure Static Web Apps。

## 📋 前提条件

- Azure 账户（[免费创建](https://azure.microsoft.com/free/)）
- GitHub 账户
- Git 已安装
- 已完成本地开发和测试

## 🚀 部署步骤

### 1. 准备 Git 仓库

#### 1.1 初始化 Git（本地）

```powershell
# 进入项目目录
cd d:\Development\Project\Translator

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交初始代码
git commit -m "Initial commit: Azure Translator PWA"
```

#### 1.2 创建 GitHub 仓库并推送

1. 访问 [GitHub](https://github.com)，创建新仓库（例如：`translator`）
2. **不要**勾选"Initialize with README"（因为本地已有代码）
3. 复制仓库 URL（例如：`https://github.com/YOUR_USERNAME/translator.git`）

```powershell
# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/translator.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 2. 创建 Azure Static Web App

#### 方法 1：使用 Azure Portal（推荐）

1. **登录 Azure Portal**
   - 访问 [portal.azure.com](https://portal.azure.com)

2. **创建资源**
   - 点击 "创建资源"
   - 搜索 "Static Web Apps"
   - 点击 "创建"

3. **配置基本信息**
   - **订阅**：选择您的订阅
   - **资源组**：创建新的或选择现有的（例如：`rg-translator`）
   - **名称**：输入应用名称（例如：`translator-app`）
   - **计划类型**：选择 **Free**（免费层）
   - **区域**：选择 **East Asia** 或 **Southeast Asia**

4. **配置部署详细信息**
   - **源**：选择 **GitHub**
   - **GitHub 账户**：授权 Azure 访问您的 GitHub
   - **组织**：选择您的 GitHub 用户名
   - **存储库**：选择 `azure-translator-pwa`
   - **分支**：选择 `main`

5. **配置生成详细信息**
   - **生成预设**：选择 **Custom**
   - **应用位置**：输入 `/web`
   - **API 位置**：输入 `/api`
   - **输出位置**：输入 `dist`

6. **查看 + 创建**
   - 检查配置
   - 点击 "创建"

#### 方法 2：使用 Azure CLI

```bash
# 登录 Azure
az login

# 创建资源组
az group create --name rg-translator --location eastasia

# 创建 Static Web App
az staticwebapp create \
  --name translator-app \
  --resource-group rg-translator \
  --source https://github.com/YOUR_USERNAME/translator \
  --location eastasia \
  --branch main \
  --app-location "/web" \
  --api-location "/api" \
  --output-location "dist" \
  --login-with-github
```

### 3. 配置环境变量（重要！🔐）

部署完成后，**必须**在 Azure Portal 中配置 API 密钥。这是安全的最佳实践，密钥不会出现在代码中。

#### 为什么要在 Azure Portal 配置？
- ✅ **安全**：密钥不会出现在 Git 仓库中
- ✅ **灵活**：可以随时更新密钥而不需要重新部署代码
- ✅ **分离**：开发和生产环境使用不同的密钥

#### 配置步骤

**第 1 步：打开 Static Web App**
1. 登录 [Azure Portal](https://portal.azure.com)
2. 搜索并打开刚创建的 Static Web App（例如：`translator-app`）

**第 2 步：进入配置页面**
1. 在左侧菜单中，找到 **"设置"** 部分
2. 点击 **"配置"**
3. 选择 **"应用程序设置"** 标签

**第 3 步：添加环境变量**

点击 **"+ 添加"** 按钮，逐个添加以下变量：

| 名称 | 值 | 从哪里获取 |
|------|-----|-----------|
| `TRANSLATOR_KEY` | `您的翻译密钥` | Azure Portal → Translator 资源 → "密钥和终结点" → KEY 1 |
| `TRANSLATOR_REGION` | `global` | 通常是 `global`，具体查看 Translator 资源页面 |
| `SPEECH_KEY` | `您的语音密钥` | Azure Portal → Speech 资源 → "密钥和终结点" → KEY 1 |
| `SPEECH_REGION` | `eastus2` | 查看 Speech 资源的"位置"（例如：eastus2, westus, eastasia） |

**第 4 步：保存配置**
1. 添加完所有变量后，点击页面顶部的 **"保存"** 按钮
2. 等待几秒钟，配置会自动应用到 Functions 后端

#### 获取密钥的详细步骤

**获取 Translator 密钥：**
```
1. Azure Portal → 搜索 "Translator" 或 "sufan-translator"
2. 点击您的 Translator 资源
3. 左侧菜单 → "密钥和终结点"
4. 复制 "KEY 1" 或 "KEY 2"（任选其一）
5. 记录 "区域"（通常是 global）
```

**获取 Speech 密钥：**
```
1. Azure Portal → 搜索 "Speech" 或 "Speechify"
2. 点击您的 Speech Services 资源
3. 左侧菜单 → "密钥和终结点"
4. 复制 "KEY 1" 或 "KEY 2"（任选其一）
5. 记录 "位置/区域"（例如：eastus2）
```

#### ⚠️ 注意事项

1. **密钥安全**
   - ❌ 不要将密钥提交到 Git
   - ❌ 不要在公开场合分享密钥
   - ✅ 定期轮换密钥（Azure 提供 KEY 1 和 KEY 2，可以无缝切换）

2. **配置生效**
   - 保存后配置会立即生效
   - 如果 API 仍然报错，等待 1-2 分钟后重试
   - 可以重启 Static Web App 加速生效

3. **验证配置**
   - 配置完成后，访问您的应用 URL
   - 测试翻译功能，确认 API 正常工作
   - 如果失败，检查浏览器控制台的错误信息

#### 代码如何读取这些变量？

您的代码已经配置好了，使用 `process.env` 读取环境变量：

```typescript
// api/src/functions/translate.ts
const translatorKey = process.env.TRANSLATOR_KEY;
const translatorRegion = process.env.TRANSLATOR_REGION;

// api/src/functions/speak.ts  
const speechKey = process.env.SPEECH_KEY;
const speechRegion = process.env.SPEECH_REGION;
```

**工作原理：**
- **本地开发**：从 `api/local.settings.json` 读取（不会提交到 Git）
- **Azure 部署**：从 Azure Portal 的"应用程序设置"读取
- **无需修改代码**：Node.js 的 `process.env` 在两种环境下都能工作

### 4. 验证部署

1. **查看部署状态**
   - 在 Static Web App 概述页，查看 **"URL"**
   - 点击 URL 访问您的应用

2. **检查 GitHub Actions**
   - 访问 GitHub 仓库的 **"Actions"** 标签
   - 查看部署工作流状态
   - 确认构建和部署成功

3. **测试应用功能**
   - 访问部署的 URL
   - 测试翻译功能
   - 测试语音功能
   - 检查历史记录

## 🔄 更新部署

每次推送到 `main` 分支时，GitHub Actions 会自动部署：

```powershell
# 修改代码后
git add .
git commit -m "更新翻译功能"
git push
```

## 🌐 自定义域名（可选）

1. 在 Azure Portal 的 Static Web App 中选择 **"自定义域"**
2. 点击 **"+ 添加"**
3. 输入您的域名
4. 按照说明配置 DNS 记录

## 📊 监控和分析

1. **查看日志**
   - Azure Portal → Static Web App → "日志流"

2. **查看指标**
   - Azure Portal → Static Web App → "指标"
   - 查看请求数、响应时间等

## ❓ 常见问题

### Q: API 调用失败？
A: 检查环境变量配置是否正确，确保密钥有效。

### Q: 部署失败？
A: 查看 GitHub Actions 日志，检查构建错误。

### Q: PWA 无法安装？
A: 确保使用 HTTPS，检查 manifest.json 配置。

## 🎉 完成！

恭喜！您的翻译应用已成功部署到 Azure Static Web Apps！

**应用 URL**: `https://<your-app-name>.azurestaticapps.net`

现在可以在任何设备上访问和使用您的翻译工具了！
