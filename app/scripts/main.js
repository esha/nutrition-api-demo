(function(Eventi, HTML, ajax, store) {
    'use strict';

    var _ = window.app = {
        base: 'http://api.esha.com',
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
        items: store('list')||[],
        list: function() {
            var all = HTML.query('#list'),
                items = all.query('[clone]').only(0);
            if (items.children.length !== _.items.length) {
                setTimeout(function() {
                    items.innerHTML = '';
                    items.clone(_.items);
                    store('list', _.items);
                }, 100);
            }
            HTML.query('#api').values({url:'n/a',method:'n/a'});
            store('json', _.analysisBody());
        },
        add: function() {
            var values = this.parentNode.cloneValues;
            _.items.push(values);
            Eventi.fire.location('#list');
        },
        remove: function() {
            var index = this.parentNode.getAttribute('index');
            _.items.splice(index, 1);
            _.list();
        },
        clear: function() {
            _.items = [];
            _.list();
            store.remove('analysis');
        },
        analysisBody: function() {
            var body = { items: [] };
            _.items.forEach(function(item) {
                body.items.push({
                    id: item.id,
                    quantity: item.quantity,
                    unit: item.unit.id
                });
            });
            return body;
        },
        analyze: function() {
            _.ajax('analysis', JSON.stringify(_.analysisBody()), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).done(function(response) {
                console.log(response);
            }).fail(function() {
                //TODO: get proxy running so we don't need to fake this
                var response = {
                    name: 'TODO: get proxy up so this is not fake',
                    items: [{
                        id: 'urn:uuid:17dbb668-f3f4-4822-8566-f46496887edc',
                        description: 'Broccoli, fresh',
                        quantity: 0.5,
                        unit: 'urn:uuid:dfad1d25-17ff-4201-bba0-0711e8b88c65',
                        modified: '2011-10-04'
                    }],
                    results: [{
                        nutrient: 'urn:uuid:a4d01e46-5df2-4cb3-ad2c-6b438e79e5b9',
                        value: 15.47
                    }]
                };
                if (!_.items.length) {
                    response.items = [];
                    response.results[0].value = 0;
                }
                store('json', response);
                Eventi.on('^foodunits', function(e, units) {
                    response.items.forEach(function(item) {
                        item.unit = units[item.unit] || item.unit;
                    });
                    Eventi.on('^nutrients', function(e, nutrients) {
                        response.results.forEach(function(result) {
                            result.nutrient = nutrients[result.nutrient] || result.nutrient;
                        });
                        store('analysis', response);
                        Eventi.fire.location('#analysis');
                    });
                });
            });
        },
        analysis: function() {
            var response = store('analysis');
            if (!response) {
                return Eventi.fire.location('#list');
            }
            setTimeout(function() {
                var el = HTML.query('#analysis'),
                    values = el.query('[clone].values'),
                    items = el.query('[clone].items');
                values.innerHTML = '';
                items.innerHTML = '';
                values.clone(response.results);
                items.clone(response.items);
            }, 100);
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
        ajax: function(name, data, opts) {
            var url = _.path(name);
            if (data && !(opts && opts.method === 'POST')) {
                for (var key in data) {
                    url = _.param(url, key, data[key]);
                }
                data = null;
            }
            if (!opts) {
                opts = { method: 'GET' };
            }
            opts.url = url;
            opts.data = data;

            HTML.query('#api').values(opts);
            return ajax(opts).then(function(response) {
                store('json', response);
                return response;
            });
        },
        preprocess: function(resource) {
            var clear = setTimeout(function() {
                console.log('reloading page');
                location.reload();
            }, 1000);
            ajax(_.path(resource)).done(function(list) {
                clearTimeout(clear);
                var hash = {};
                list.forEach(function(member) {
                    hash[member.id] = member;
                });
                Eventi.fire('^'+resource, hash);
            });
        }
    };

    Eventi.types('search','clear','location');
    Eventi.fy(window.EventTarget.prototype);
    Eventi.on.location(/#(nutrients|foodunits)/, _.resource);
    Eventi.on.location('#json', _.json);
    Eventi.on.location('#query={query}', _.search);
    Eventi.on.location('#list', _.list);
    Eventi.on.location('#analysis', _.analysis);
    Eventi.on.search(_.search);
    Eventi.on('items:add', '.food', _.add);
    Eventi.on('items:remove', '.food', _.remove);
    Eventi.on('items:clear', _.clear);
    Eventi.on('items:analysis', _.analyze);
    _.preprocess('nutrients');
    _.preprocess('foodunits');

})(window.Eventi, document.documentElement, jQuery.ajax, window.store);