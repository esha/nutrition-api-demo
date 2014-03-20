'use strict';

var express = require("express");
var logfmt = require("logfmt");
var request = require('request')
var app = express();
var api = 'http://api.esha.com';
var key = '2s35wsxke74rcut8jqapbkyf';

function toApi(url) {
    url = url.replace('/api', api);
    url += url.indexOf('?') > 0 ? '&' : '?';
    url += 'apikey='+key;
    return url;
}

app.use(logfmt.requestLogger());

app.get('/api/*', function(req, res) {
   request(toApi(req.originalUrl)).pipe(res);
});
app.post('/api/analysis', function(req, res) {
    req.pipe(request.post(toApi(req.originalUrl))).pipe(res);
});

app.use(express.static(__dirname + '/'));

app.listen(process.env.PORT || 3000);
