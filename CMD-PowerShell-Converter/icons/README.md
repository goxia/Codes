# 创建PWA图标的说明

由于无法直接生成图像文件，请按照以下说明创建应用图标：

## 图标要求

您需要创建以下尺寸的PNG图标文件，并保存在 `icons/` 目录中：

### 必需的图标文件：
- `icon-72x72.png` - 72x72像素
- `icon-96x96.png` - 96x96像素  
- `icon-128x128.png` - 128x128像素
- `icon-144x144.png` - 144x144像素
- `icon-152x152.png` - 152x152像素
- `icon-192x192.png` - 192x192像素
- `icon-384x384.png` - 384x384像素
- `icon-512x512.png` - 512x512像素
- `favicon-16x16.png` - 16x16像素
- `favicon-32x32.png` - 32x32像素
- `apple-touch-icon.png` - 180x180像素

## 设计建议

### 图标设计理念：
- **主题**：终端/命令行界面
- **颜色**：蓝色主调 (#2196F3)，体现现代感
- **元素**：可包含终端窗口、箭头(转换)、CMD和PS标识

### 具体设计建议：
1. **背景**：圆角矩形，蓝色渐变
2. **前景**：白色终端图标或文字"CMD⇄PS"
3. **风格**：现代、简洁、清晰

## 在线工具推荐

如果您需要快速创建图标，可以使用以下在线工具：

1. **PWA Builder** - https://www.pwabuilder.com/
2. **Favicon Generator** - https://favicon.io/
3. **PWA Icon Generator** - https://tools.crawlink.com/tools/pwa-icon-generator/
4. **RealFaviconGenerator** - https://realfavicongenerator.net/

## 临时解决方案

在没有自定义图标的情况下，您可以：

1. 使用浏览器默认图标（应用仍可正常工作）
2. 从开源图标库获取相似图标
3. 使用字母图标生成器创建简单的文字图标

## 验证图标

创建图标后，请确保：
- 所有文件都保存在正确的路径
- 文件名与manifest.json中的定义一致
- 图标在不同尺寸下都清晰可见
- 背景色与主题色协调

完成图标创建后，您的PWA应用就可以完美支持安装功能了！