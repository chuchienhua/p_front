const { createProxyMiddleware } = require('http-proxy-middleware');
const os = require('os');

//預設的proxy設定
const config = {
    '/api/kh_pbtc_server': 'https://tpiot.ccpgp.com/',
};

//開發者自定義 //192.168.102.191
if ('MI759' === os.hostname()) {
    config['/api/kh_pbtc_server'] = 'http://localhost:10010/';
} else if ('MI212' === os.hostname().slice(0, 5)) {
    config['/api/kh_pbtc_server'] = 'http://localhost:10010/';
} else if ('MI696' === os.hostname()) {
    config['/api/kh_pbtc_server'] = 'http://localhost:10010/';
} else if ('MI698' === os.hostname()) {
    config['/api/kh_pbtc_server'] = 'http://localhost:10010/';
}

if ('MI597' === os.hostname()) {
    config['/pbtc-schedule'] = { target: 'http://192.168.8.128:40112/'};
    
}

const app = app => {
    Object.keys(config).forEach(path => {
        if ('string' === typeof config[path]) {
            app.use(path, createProxyMiddleware({ target: config[path] }));
        } else {
            app.use(path, createProxyMiddleware(config[path]));
        }
    });
};

module.exports = app;