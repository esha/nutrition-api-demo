'use strict';

var express = require('express');
var logfmt = require('logfmt');
var request = require('request');
var app = express();
var api = process.env.API || 'https://nutrition-api.esha.com';
var apiStaging = process.env.API_STAGING || 'https://esha-nutrition.azure-api.net';
var key = process.env.APIKEY;
var keyStaging = process.env.API_STAGINGKEY;
var allNutrients = '&n=0,1,2,3,4,5,6,16,17,18,19,20,21,22,23,25,26,29,30,31,' +
    '32,33,34,35,36,37,38,39,40,41,43,44,45,47,48,49,50,52,53,54,55,56,57,' +
    '58,59,60,61,71,83,84,91,92,111,116,127,135,148,169,182,183,198,' +
    '205,207,208,209,210,211,212,213,' +
    '510,521,524,525,526,550,554,555,556,557,562,563,565,1001,1004,1005';
var allTags = '&usda-core,brands,restaurant,'+
    'usda,CNF,uk_foods,fndds,'+
    'recipe,foodservice,industrial_ingredients,'+
    'esha-core,new_world_pasta';

function log(...msgs) {
    console.log(...msgs);
    return msgs[msgs.length-1];
}

function getParam(url, name, alt) {
    var re = new RegExp('(\\?|&)'+name+'=(\\w+)'),
        match = url.match(re);
    return match ? match[2] : alt;
}

function toApi(url, staging) {
    var version = getParam(url, 'version'),
        _api = staging ? apiStaging : api;
    if (version) {
        _api += '/;rev='+version;
        url.replace('version='+version, '');
    }
    url = staging ? url.replace('/api-staging', _api) :
                    url.replace('/api', _api);
    url += url.indexOf('?') > 0 ? '&' : '?';
    if (url.indexOf('localhost') > 0) {
        url += allNutrients;
    }
    var _key = getParam(url, 'apikey', staging ? keyStaging : key);
    return log('Proxying request:', {
        url: url,
        headers: {
            'Ocp-Apim-Subscription-Key': _key
        }
    });
}

if (!key) {
    console.error('You must define a valid APIKEY environment variable.');
    process.exit(1);
} else {
    log('Main APIKEY:', key);
    log('Staging APIKEY:', keyStaging);
}
log('Main API:', api);
log('Staging API:', apiStaging);

app.use(logfmt.requestLogger());

app.get('/api/*', function(req, res) {
    request(toApi(req.originalUrl)).pipe(res);
});
app.post('/api/*', function(req, res) {
    req.pipe(request.post(toApi(req.originalUrl))).pipe(res);
});
app.get('/api-staging/*', function(req, res) {
    request(toApi(req.originalUrl, true)).pipe(res);
});
app.post('/api-staging/*', function(req, res) {
    req.pipe(request.post(toApi(req.originalUrl, true))).pipe(res);
});

log('Serving from:', __dirname);
app.use(express.static(__dirname));

app.listen(process.env.PORT || 3000);
