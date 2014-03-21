(function(Eventi, HTML, ajax, store) {
    'use strict';

    var _ = window.app = {
        base: '/api',
        paths: {
            nutrients: '/nutrients',
            foodunits: '/food-units',
            analysis: '/analysis',
            search: '/foods'
        },
        path: function(path) {
            return _.base + (_.paths[path] || path);
        },
        param: function(url, key, val) {
            return !val && val !== 0 && val !== false ? url :
                url + (url.indexOf('?')>0 ? '&':'?') + key + '=' + val;
        },
        search: function(e, path, query) {
            var options = HTML.query('#options',1),
                params = options.classList.contains('hidden') ? {} : options.values(),
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
                HTML.query('#results').values('query', params.query);
            } else {
                input.focus();
            }
            _.query('search', params);
        },
        query: function(name, params) {
            Eventi.on('^foodunits', function(e, units) {
                _.ajax(name, params).then(function(results) {
                    _.results(results, units);
                    _.controls(results);
                });
            });
        },
        controls: function(results) {
            var pages = Object.keys(results).filter(function(key) {
                return key.indexOf('_page') > 0;
            });
            HTML.query('[click=page]').each(function(el) {
                el.classList.toggle('hidden', !results.total || pages.indexOf(el.id+'_page') < 0);
            });
        },
        page: function(e) {
            var results = store('json'),
                page = e.target.id+'_page',
                url = results && results[page];
            if (url) {
                _.query(url);
            }
        },
        options: function() {
            HTML.query('#options').classList.toggle('hidden');
        },
        results: function(results, units) {
            var all = HTML.query('#results'),
                items = all.query('[clone]').only(0);
            items.innerHTML = '';
            results.items.forEach(function(item) {
                item.unit = units[item.unit] || item.unit;
            });
            items.clone(results.items);

            var feedback = all.query('#feedback');
            feedback.classList.toggle('hidden', !results.items.length);
            feedback.values(results);

            var param = HTML.query('input[name=query]').value;
            all.classList.toggle('misspelled', results.query !== param);
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
        ajax: function(path, data, opts) {
            var url = _.path(path);
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

            HTML.query('#api').values({
                url: opts.url.replace(_.base, ''),
                method: opts.method
            });
            return ajax(opts).then(function(response) {
                store('json', response);
                return response;
            });
        },
        preprocess: function(resource) {
            ajax(_.path(resource)).done(function(list) {
                var hash = {};
                list.forEach(function(member) {
                    hash[member.id] = member;
                });
                Eventi.fire('^'+resource, hash);
            });
        }
    };

    Eventi.types('search','clear','location');
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
    Eventi.on('page', _.page);
    Eventi.on('options', _.options);
    _.preprocess('nutrients');
    _.preprocess('foodunits');

})(window.Eventi, document.documentElement, jQuery.ajax, window.store);