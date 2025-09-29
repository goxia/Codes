const http = require('http');

module.exports = async function (context, req) {
    context.log('IP Query proxy function processed a request.');
    
    // Handle CORS
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };
        return;
    }
    
    try {
        const targetIP = req.query.ip || '';
        
        const defaultFields = [
            'status', 'message', 'query', 'country', 'countryCode', 
            'city', 'zip', 'lat', 'lon', 'timezone',
            'isp', 'org', 'as', 'asname', 'mobile', 'proxy', 'hosting'
        ].join(',');
        
        const apiUrl = targetIP 
            ? `http://ip-api.com/json/${targetIP}?fields=${defaultFields}`
            : `http://ip-api.com/json?fields=${defaultFields}`;
        
        const data = await makeHttpRequest(apiUrl);
        
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: data
        };
        
    } catch (error) {
        context.log.error('Error:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                status: 'fail',
                message: error.message
            }
        };
    }
};

function makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Invalid JSON response from ip-api.com'));
                }
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}