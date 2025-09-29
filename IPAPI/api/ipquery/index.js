module.exports = async function (context, req) {
    try {
        // 获取查询参数中的IP地址
        const ip = req.query.ip || '';
        
        // 构建ip-api.com查询URL
        const defaultFields = [
            'status', 'message', 'query', 'country', 'countryCode', 
            'city', 'zip', 'lat', 'lon', 'timezone',
            'isp', 'org', 'as', 'asname', 'mobile', 'proxy', 'hosting'
        ].join(',');

        const apiUrl = ip 
            ? `http://ip-api.com/json/${ip}?fields=${defaultFields}`
            : `http://ip-api.com/json?fields=${defaultFields}`;

        // 使用Node.js内置的fetch（Node.js 18+）
        
        // 调用ip-api.com
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'IPAPI-Azure-Function/1.0'
            },
            timeout: 10000
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // 返回JSON数据，添加CORS头
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: data
        };

    } catch (error) {
        context.log.error('IP查询错误:', error);
        
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                status: 'fail',
                message: `查询失败: ${error.message}`
            }
        };
    }
};