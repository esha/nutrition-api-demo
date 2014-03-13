(function(Eventi, HTML, ajax, store) {
    'use strict';
    var _ = window.app = {
        base: 'http://api.esha.com',
        apikeyToBeHidden: '',
        paths: {
            nutrients: '/nutrients',
            foodunits: '/food-units',
            analysis: '/analysis',
            search: '/foods'
        },
        path: function(name) {
            var url = _.base + _.paths[name] + '?apikey=2s35wsxke74rcut8jqapbkyf';
            console.log('TODO: set up proxy server to hide apikey');
            return url;
        },
        param: function(url, key, val) {
            return !val && val !== 0 && val !== false ? url :
                url + (url.indexOf('?')>0 ? '&':'?') + key + '=' + val;
        },
        search: function() {
            var params = HTML.query('#params',1).values(),
                input = HTML.query('input[name=query]');
            params.query = input.value;
            if (params.query) {
                Eventi.fire.location('#results');
            } else {
                input.focus();
            }
            _.ajax('search', params).then(_.results);
        },
        results: function(results) {
            var all = HTML.query('#results'),
                items = all.query('[clone]').only(0);
            items.innerHTML = '';
            items.clone(results.items);
        },
        json: function(e) {
            var json = store('json');
            HTML.query('pre[name="json"]').innerHTML = json ? JSON.stringify(json, null, 2) : '';
            if (e.type !== 'location') {
                Eventi.fire.location('#json');
            }
        },
        resource: function(e, path, name) {
            _.ajax(name).then(function(response) {
                _.resourceLoaded(path, response);
            });
        },
        resourceLoaded: function(path, response) {
            var container = HTML.query('[view="'+path+'"] [clone]').only(0);
            container.innerHTML = '';
            container.clone(response);
        },
        ajax: function(name, data, method) {
            var url = _.path(name);
            if (data && method !== 'post') {
                for (var key in data) {
                    url = _.param(url, key, data[key]);
                }
                data = null;
            }
            var opts = {
                method: method || 'get',
                url: url,
                data: data
            };
            HTML.query('#api').values(opts);
            return ajax(opts).then(function(response) {
                store('json', response);
                return response;
            });
        }
    };

    Eventi.types('clear','location');
    Eventi.fy(window.EventTarget.prototype);
    Eventi.on.location(/#(nutrients|foodunits)/, _.resource);
    Eventi.on.location('#json', _.json);

})(window.Eventi, document.documentElement, jQuery.ajax, window.store);