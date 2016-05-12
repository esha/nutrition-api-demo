(function(Eventi, HTML, ajax, store, Clone, Posterior) {
    'use strict';

    var _ = window.app = {
        api: new Posterior({
            url: '/api',
            debug: true,

            '@food': {
                url: '/food/{0}',
                cache: true
            },
            '@foodunits': {
                url: '/food-units',
                saveResult: true,
                auto: true,
                then: function(list) {
                    return _.toIdHash(list, 'foodunits');
                }
            },
            '@nutrients': {
                url: '/nutrients',
                saveResult: true,
                auto: true,
                then: function(list) {
                    return _.toIdHash(list, 'nutrients');
                }
            },
            '@search': {
                url: '/foods?query={query}&count={count}&start={start}&spell={spell}',
                requires: ['app.api.foodunits']
            },
            '@analysis': {
                method: 'POST',
                url: '/analysis',
                requires: ['app.api.nutrients', 'app.api.foodunits']
            }
        }),
        toIdHash: function(list, saveAs) {
            var hash = {};
            list.forEach(function(member) {
                hash[member.id] = member;
            });
            if (saveAs) {
                _[saveAs] = hash;
            }
            return hash;
        },
        base: '/api',
        paths: {
            nutrients: '/nutrients',
            analysis: '/analysis'
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
            _.api.search(params).then(function(results) {
                _.results(results, _.foodunits);
                _.controls(results);
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
                item.units = item.units.map(function(unit) {
                    return units[unit] || unit;
                });
            });
            items.clone(results.items);

            var feedback = all.query('#feedback'),
                url = HTML.values('url'),
                start = url && url.match(/start=(\d+)/);
            results.start = start && parseInt(start[1]) || 0;
            results.end = results.start + results.items.length - 1;
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
                    items.query('.food').each(function(item, i) {
                        var values = _.items[i],
                            unit = item.query('[name=unit]');
                        Clone.init(unit);
                        unit.clone(values.units);
                        unit.value = values.unit.id;
                    });
                    store('list', _.items);
                }, 100);
            }
            HTML.query('.api').values({ method:'POST (request body)', url:'/analysis'});
            store('json', _.analysisBody());
        },
        add: function() {
            _.items.push(this.cloneValues);
            Eventi.fire.location('#list');
        },
        view: function() {
            var id = this.cloneValues.id;
            console.log(this.cloneValues);
            Eventi.fire.location('#food/'+id);
            _.api.food(id);
        },
        update: function(e) {
            var index = this.getAttribute('index'),
                values = _.items[index],
                name = e.target.getAttribute('name'),
                value = e.target.value;
            values[name] = name === 'unit' ? _.foodunits[value] : value;
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
                            result.value = Math.round(result.value * 10) / 10;
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
            var container = HTML.query('.show-'+path.substring(1)+' [clone]').only(0);
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

            HTML.query('.api').values({
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

    Eventi.alias('location');
    Eventi.on(window, {
        'location@`#(nutrients|foodunits)`': _.resource,
        'location@#json': _.json,
        'location@#query={query}': _.search,
        'location@list': _.list,
        'location@#analysis': _.analysis,
        'search': _.search,
        'items:add<.food>': _.add,
        'items:view<.food>': _.view,
        'items:remove<.food>': _.remove,
        'items:clear': _.clear,
        'items:analysis': _.analyze,
        'page': _.page,
        'options': _.options,
        'change<.food>': _.update
    });
    _.preprocess('nutrients');
    _.preprocess('foodunits');

})(window.Eventi, document.documentElement, jQuery.ajax, window.store, window.Clone, window.Posterior);