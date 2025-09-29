// Azure Function to proxy ip-api.com requests
// This solves the HTTPS/HTTP mixed content issue

const https = require('https');
const http = require('http');

module.exports = async function (context, req) {
    context.log('IP Query proxy function triggered');
    
    // Set CORS headers
    context.res = {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    };
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }
    
    try {
        // Get IP from query parameter or use client IP
        const targetIP = req.query.ip || '';
        
        // Build ip-api.com URL
        const defaultFields = [
            'status', 'message', 'query', 'country', 'countryCode', 
            'city', 'zip', 'lat', 'lon', 'timezone',
            'isp', 'org', 'as', 'asname', 'mobile', 'proxy', 'hosting'
        ].join(',');
        
        const apiUrl = targetIP 
            ? `http://ip-api.com/json/${targetIP}?fields=${defaultFields}`
            : `http://ip-api.com/json?fields=${defaultFields}`;
        
        // Make HTTP request to ip-api.com
        const data = await makeHttpRequest(apiUrl);
        
        context.res.status = 200;
        context.res.body = data;
        
    } catch (error) {
        context.log.error('Error calling ip-api.com:', error);
        context.res.status = 500;
        context.res.body = {
            status: 'fail',
            message: 'Internal proxy error: ' + error.message
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
                    reject(new Error('Invalid JSON response'));
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