const { app } = require('@azure/functions');

// 导入所有函数
require('./functions/ipquery');

app.setup();