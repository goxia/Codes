const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS
app.use(cors());

// 解析JSON请求体
app.use(express.json());

// 提供静态文件服务
app.use(express.static(path.join(__dirname)));

// API路由 - 代理ip-api.com请求
app.get('/api/ip-query', async (req, res) => {
    try {
        const targetIP = req.query.ip || '';
        
        // 构建ip-api.com查询字段
        const defaultFields = [
            'status', 'message', 'query', 'country', 'countryCode', 
            'city', 'zip', 'lat', 'lon', 'timezone',
            'isp', 'org', 'as', 'asname', 'mobile', 'proxy', 'hosting'
        ].join(',');
        
        const apiUrl = targetIP 
            ? `http://ip-api.com/json/${targetIP}?fields=${defaultFields}`
            : `http://ip-api.com/json?fields=${defaultFields}`;
        
        console.log('代理请求到:', apiUrl);
        
        // 从服务器端发起HTTP请求（绕过浏览器CORS限制）
        const response = await axios.get(apiUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'IP-Query-App/1.0.0'
            }
        });
        
        // 返回JSON响应
        res.json(response.data);
        
    } catch (error) {
        console.error('API代理错误:', error.message);
        
        res.status(500).json({
            status: 'fail',
            message: `代理请求失败: ${error.message}`
        });
    }
});

// 健康检查路由
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 IP查询应用运行在端口 ${PORT}`);
    console.log(`📱 访问地址: http://localhost:${PORT}`);
    console.log(`🔍 API端点: http://localhost:${PORT}/api/ip-query`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('💤 服务器正在关闭...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('💤 服务器正在关闭...');
    process.exit(0);
});