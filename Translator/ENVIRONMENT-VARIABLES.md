# 环境变量配置说明

## 🔐 安全配置方式

### 配置流程对比

```
本地开发环境                      生产环境（Azure）
════════════                      ═══════════════════

📁 api/                           🌐 Azure Portal
  └── local.settings.json         └── Static Web App
      {                               └── 配置
        "Values": {                       └── 应用程序设置
          "TRANSLATOR_KEY": "xxx"             ├── TRANSLATOR_KEY: xxx
          "TRANSLATOR_REGION": "global"       ├── TRANSLATOR_REGION: global
          "SPEECH_KEY": "yyy"                 ├── SPEECH_KEY: yyy
          "SPEECH_REGION": "eastus2"          └── SPEECH_REGION: eastus2
        }
      }

❌ 文件在 .gitignore 中          ✅ 安全存储在 Azure 中
❌ 不会提交到 Git                ✅ 不会出现在代码中
✅ 仅用于本地测试                ✅ 用于生产环境
```

### 代码读取方式（统一）

```typescript
// api/src/functions/translate.ts
// api/src/functions/speak.ts

// 📖 读取环境变量（本地和 Azure 都适用）
const translatorKey = process.env.TRANSLATOR_KEY;
const translatorRegion = process.env.TRANSLATOR_REGION;
const speechKey = process.env.SPEECH_KEY;
const speechRegion = process.env.SPEECH_REGION;
```

**工作原理：**
- Node.js 的 `process.env` 会自动读取：
  - **本地**：从 `local.settings.json`
  - **Azure**：从 Azure Portal 的应用程序设置

## ✨ 优势

### ✅ 本地开发
- 快速配置，无需访问 Azure Portal
- `local.settings.json` 在 `.gitignore` 中，不会泄露
- 可以使用测试密钥

### ✅ 生产部署
- **密钥不在代码中**：Git 历史中不会有密钥
- **随时更新**：在 Azure Portal 更新密钥，无需重新部署
- **多环境支持**：开发、测试、生产使用不同密钥
- **团队协作**：团队成员无法看到生产密钥

## 📝 最佳实践

1. **分离密钥**
   ```
   本地开发 → 使用测试/开发密钥
   Azure 部署 → 使用生产密钥
   ```

2. **定期轮换**
   - Azure 提供 KEY 1 和 KEY 2
   - 轮换时先更新为 KEY 2，测试无误后删除 KEY 1
   - 重新生成 KEY 1 作为下次轮换的备用

3. **最小权限**
   - 只给予必要的权限
   - 使用 Azure RBAC 控制谁能查看/修改密钥

## 🔍 故障排查

### 问题：API 返回 401 或 403 错误

**检查清单：**
```
☐ Azure Portal 中是否已添加环境变量？
☐ 变量名是否正确？（区分大小写）
☐ 密钥是否有效？（未过期）
☐ 区域设置是否正确？
☐ 保存后是否等待配置生效？（1-2 分钟）
```

### 问题：本地开发正常，Azure 部署后失败

**可能原因：**
```
❌ 忘记在 Azure Portal 配置环境变量
❌ 环境变量名称拼写错误
❌ 使用了本地密钥而不是生产密钥
```

**解决方法：**
```
1. 登录 Azure Portal
2. 打开 Static Web App → 配置 → 应用程序设置
3. 确认所有 4 个变量都已添加
4. 保存后等待 1-2 分钟
5. 重新测试应用
```

## 📚 相关文档

- [Azure Static Web Apps 环境变量](https://learn.microsoft.com/azure/static-web-apps/application-settings)
- [Azure Functions 应用设置](https://learn.microsoft.com/azure/azure-functions/functions-how-to-use-azure-function-app-settings)
- [Azure 密钥管理最佳实践](https://learn.microsoft.com/azure/key-vault/general/best-practices)
