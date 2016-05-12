'use strict';

var express = require('express');
var logfmt = require('logfmt');
var request = require('request');
var app = express();
var api = 'http://api.esha.com';
//var api = 'http://api-staging.esha.com';
//var api = 'http://localhost:8080';
var key = process.env.APIKEY;

function toApi(url) {
    url = url.replace('/api', api);
    url += url.indexOf('?') > 0 ? '&' : '?';
    url += 'apikey='+key;
    return url;
}

if (!key) {
    console.error('You must define a valid APIKEY environment variable.');
    process.exit(1);
} else {
    console.log('Using APIKEY:', key);
}
console.log('Using API: ', api);

app.use(logfmt.requestLogger());

app.get('/api/*', function(req, res) {
    request(toApi(req.originalUrl)).pipe(res);
});
app.post('/api/analysis', function(req, res) {
    req.pipe(request.post(toApi(req.originalUrl))).pipe(res);
});

app.use(express.static(__dirname + '/'));

app.listen(process.env.PORT || 3000);
