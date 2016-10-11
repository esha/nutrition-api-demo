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
    var allNutrients = '&n=0,1,2,3,4,5,6,16,17,18,19,20,21,22,23,25,26,29,30,31,'+
        '32,33,34,35,36,37,38,39,40,41,43,44,45,47,48,49,50,52,53,54,55,56,57,'+
        '58,59,60,61,71,83,84,91,92,111,116,127,135,137,169,182,183,198,208,510,'+
        '521,524,525,526,550,554,555,556,557,562,563,565,1001,1004,1005';
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
