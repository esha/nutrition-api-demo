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
        search: function(e, path, query) {
            var params = HTML.query('#params',1).values(),
                input = HTML.query('input[name=query]');
            if (query) {
                params.query = query;
                input.value = decodeURIComponent(query);
            } else {
                params.query = encodeURIComponent(input.value);
            }
            if (params.query) {
                path = '#query='+params.query;
                if (location.hash !== path) {
                    Eventi.fire.location(path);
                }
            } else {
                input.focus();
            }
            Eventi.on('^foodunits', function(e, units) {
                _.ajax('search', params).then(function(results) {
                    _.results(results, units);
                });
            });
        },
        results: function(results, units) {
            var all = HTML.query('#results'),
                items = all.query('[clone]').only(0);
            items.innerHTML = '';
            results.items.forEach(function(item) {
                item.unit = units[item.unit] || item.unit;
            });
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
            var container = HTML.query('.view-'+path.substring(1)+' [clone]').only(0);
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

    Eventi.types('search', 'clear','location');
    Eventi.fy(window.EventTarget.prototype);
    Eventi.on.location(/#(nutrients|foodunits)/, _.resource);
    Eventi.on.location('#json', _.json);
    Eventi.on.location('#query={query}', _.search);
    Eventi.on.search(_.search);

    // preload and hash these resources singleton events
    _.ajax('foodunits').then(function(units) {
        var key = {};
        units.forEach(function(unit) {
            key[unit.id] = unit;
        });
        Eventi.fire('^foodunits', key);
    });
    _.ajax('nutrients').then(function(nutrients) {
        var key = {};
        nutrients.forEach(function(nutrient) {
            key[nutrient.id] = nutrient;
        });
        Eventi.fire('^nutrients', key);
    });

})(window.Eventi, document.documentElement, jQuery.ajax, window.store);