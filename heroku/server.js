'use strict';

var express = require('express');
var logfmt = require('logfmt');
var request = require('request');
var app = express();
var api = process.env.API || 'http://api.esha.com';
var apiStaging = process.env.API_STAGING || 'http://api-staging.esha.com';
var key = process.env.APIKEY;
var keyStaging = process.env.API_STAGINGKEY;

if (apiStaging.indexOf('http://localhost') === 0) {
    var allNutrients = '&n=';
    for (var i=0; i<208; i++) {
        allNutrients += i+',';
    }
    allNutrients += '510,521,524,525,526,550,554,555,556,557,562,563,565,1001,1004,1005';
}

function toApi(url, staging) {
    url = staging ? url.replace('/api-staging', apiStaging) :
                    url.replace('/api', api);
    url += url.indexOf('?') > 0 ? '&' : '?';
    if (url.indexOf('apikey') < 0) {
        url += 'apikey='+(staging ? keyStaging : key);
    }
    if (allNutrients) {
        url += allNutrients;
    }
    console.log('Proxy for: '+url);
    return url;
}

if (!key) {
    console.error('You must define a valid APIKEY environment variable.');
    process.exit(1);
} else {
    console.log('Main APIKEY:', key);
    console.log('Staging APIKEY:', keyStaging);
}
console.log('Main API:', api);
console.log('Staging API:', apiStaging);

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

app.use(express.static(__dirname + '/'));

app.listen(process.env.PORT || 3000);
