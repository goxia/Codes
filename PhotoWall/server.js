const express = require('express');
const fs = require('fs');
const path = require('path');
const convert = require('heic-convert');

const app = express();
const PORT = 3000;

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// HEIC图片动态转换
app.get('/Photos/*', async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.path);
    const ext = path.extname(filePath).toLowerCase();
    
    // 如果是HEIC文件，转换为JPEG
    if (ext === '.heic') {
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }
      
      try {
        // 读取HEIC文件
        const inputBuffer = fs.readFileSync(filePath);
        
        // 使用heic-convert转换HEIC到JPEG
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.9
        });
        
        res.type('image/jpeg');
        res.send(outputBuffer);
      } catch (convertError) {
        console.error('HEIC conversion error:', convertError);
        // 如果转换失败，返回占位图
        res.status(500).send('HEIC conversion failed');
      }
    } else {
      // 其他格式直接返回
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
      }
      res.sendFile(filePath);
    }
  } catch (error) {
    console.error('Error serving photo:', error);
    res.status(500).send('Error processing image');
  }
});

// 获取照片列表API
app.get('/api/photos', (req, res) => {
  const photosDir = path.join(__dirname, 'Photos');
  const photos = [];

  try {
    // 遍历年份目录
    const years = fs.readdirSync(photosDir).filter(item => {
      return fs.statSync(path.join(photosDir, item)).isDirectory();
    });

    years.forEach(year => {
      const yearPath = path.join(photosDir, year);
      const months = fs.readdirSync(yearPath).filter(item => {
        return fs.statSync(path.join(yearPath, item)).isDirectory();
      });

      months.forEach(month => {
        const monthPath = path.join(yearPath, month);
        const files = fs.readdirSync(monthPath);

        files.forEach(file => {
          const ext = path.extname(file).toLowerCase();
          // 处理图片和视频文件
          if (['.jpg', '.jpeg', '.png', '.gif', '.heic', '.webp'].includes(ext)) {
            photos.push({
              filename: file,
              path: `/Photos/${year}/${month}/${file}`,
              year: year,
              month: month,
              date: file.substring(0, 8), // 从文件名提取日期
              type: 'image'
            });
          } else if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
            photos.push({
              filename: file,
              path: `/Photos/${year}/${month}/${file}`,
              year: year,
              month: month,
              date: file.substring(0, 8),
              type: 'video'
            });
          }
        });
      });
    });

    // 按日期倒序排列
    photos.sort((a, b) => b.filename.localeCompare(a.filename));
    res.json(photos);
  } catch (error) {
    console.error('Error reading photos:', error);
    res.status(500).json({ error: 'Failed to read photos' });
  }
});

// 获取原始文件用于EXIF读取（特别是HEIC文件）
app.get('/api/original/*', async (req, res) => {
  try {
    // 从 /api/original/Photos/... 提取实际路径
    const filePath = path.join(__dirname, req.path.replace('/api/original', ''));
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    
    // 读取并返回原始文件（包含完整EXIF）
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // 设置正确的Content-Type
    const mimeTypes = {
      '.heic': 'image/heic',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    res.type(mimeTypes[ext] || 'application/octet-stream');
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error serving original file:', error);
    res.status(500).send('Error reading original file');
  }
});

app.listen(PORT, () => {
  console.log(`PhotoWall server is running at http://localhost:${PORT}`);
});
