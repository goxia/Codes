// 备用解决方案：使用支持HTTPS的API服务
// 将此代码放在 js/app-alternative.js 中作为备选方案

class IPQueryAppAlternative {
    // ... 其他代码保持不变 ...
    
    async queryIP(ip = '') {
        // 使用支持HTTPS的免费IP查询服务
        const apis = [
            {
                name: 'ipapi.co',
                getUrl: (ip) => ip 
                    ? `https://ipapi.co/${ip}/json/`
                    : `https://ipapi.co/json/`,
                transformData: (data) => ({
                    status: 'success',
                    query: data.ip,
                    country: data.country_name,
                    countryCode: data.country_code,
                    city: data.city,
                    zip: data.postal,
                    lat: data.latitude,
                    lon: data.longitude,
                    timezone: data.timezone,
                    isp: data.org,
                    org: data.org,
                    as: data.asn,
                    asname: data.org
                })
            },
            {
                name: 'ipwhois.app',
                getUrl: (ip) => ip 
                    ? `https://ipwhois.app/json/${ip}`
                    : `https://ipwhois.app/json/`,
                transformData: (data) => ({
                    status: data.success ? 'success' : 'fail',
                    query: data.ip,
                    country: data.country,
                    countryCode: data.country_code,
                    city: data.city,
                    zip: '',
                    lat: data.latitude,
                    lon: data.longitude,
                    timezone: data.timezone_name,
                    isp: data.isp,
                    org: data.org,
                    as: data.asn,
                    asname: data.org
                })
            }
        ];

        for (const api of apis) {
            try {
                const url = api.getUrl(ip);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }

                const rawData = await response.json();
                const data = api.transformData(rawData);
                
                if (data.status === 'success') {
                    return data;
                } else {
                    throw new Error('API返回失败状态');
                }
            } catch (error) {
                console.log(`${api.name} API失败:`, error.message);
                // 继续尝试下一个API
            }
        }

        throw new Error('所有API服务都不可用，请稍后重试');
    }
}

// 使用说明：
// 将 js/app.js 中的 IPQueryApp 替换为 IPQueryAppAlternative
// 或者在 index.html 中引用这个文件而不是 app.js