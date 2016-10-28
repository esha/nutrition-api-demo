(function(D, Eventi, store, Clone, Posterior, Vista) {
    'use strict';

    var apikey = (function() {
            var match = location.search.match(/apikey=(\w+)/);
            return match ? match[1] : store('apikey');
        })(),
        addKey = function(url) {
            return apikey ? url + '?apikey='+apikey : url;
        };
    var staging = location.toString().indexOf('staging') > 0,
        unitsAPI = staging ? 'app.api.units' : 'app.api.foodunits';
    var _ = window.app = {
        api: new Posterior({
            url: '/api'+(staging ? '-staging' : ''),
            debug: true,
            throttle: { key: 'staging', ms: 510 },// allow ~2 calls/second
            requestData: function(data) {
                _.loading(true);
                _.saveCommunications('request', data, this);
            },
            load: function() {
                _.saveCommunications('response', this.response, this.cfg);
                _.loading(false);
            },
            failure: function(e){ _.error(e); },

            '@service' : {
                url: '/',
                auto: true,
                then: function(service) {
                    D.query('[name=implementation_version]').innerHTML = service.implementation_version;
                    return service;
                }
            },
            '@foodunits': {
                url: '/food-units',
                saveResult: true,
                responseData: function(list) {
                    return _.buildResource(list, 'foodunits');
                }
            },
            '@units': {
                url: '/units',
                saveResult: true,
                responseData: function(list) {
                    return _.buildResource(list, 'units');
                }
            },
            '@nutrients': {
                url: '/nutrients',
                saveResult: true,
                responseData: function(list) {
                    return _.buildResource(list, 'nutrients');
                }
            },
            '@search': {
                requires: [unitsAPI],
                url: '/foods?query={query}&count={count}&start={start}&spell={spell}'
            },
            '@view': {
                requires: [unitsAPI, 'app.api.nutrients'],
                url: addKey('/food/{0}')
            },
            '@analyze': {
                requires: ['app.api.nutrients', unitsAPI],
                method: 'POST',
                headers: {
                    'Content-Type': 'application/vnd.com.esha.data.Foods+json'
                },
                url: addKey('/analysis')
            },
            '@recommend': {
                requires: ['app.api.nutrients', 'app.api.units'],
                method: 'POST',
                headers: {
                    'Content-Type': 'application/vnd.com.esha.data.PersonalProfile+json'
                },
                url: addKey('/recommendations'),
            }
        }),

        saveCommunications: function(direction, data, cfg) {
            var coms = {
                direction: direction,
                body: data,
                method: cfg.method || 'GET',
                url: Posterior.api
                        .resolve(cfg.url, cfg.data, null, false)
                        .replace(_.base, '')
            };
            if (direction === 'response') {
                var xhr = cfg.xhr;
                coms.headers = xhr.responseHeaders;
                coms.status = xhr.status;
            } else {
                coms.headers = cfg.headers;
            }
            store(direction, coms);
            _.updateAPI();
        },
        _loading: 0,
        loading: function(active) {
            _._loading += active ? 1 : -1;
            Vista.toggle('loading', _._loading > 0);
        },
        buildResource: function(list, saveAs) {
            var hash = {};
            list.forEach(function(member) {
                hash[member.id] = member;
            });
            _[saveAs] = hash;
            // save network coms too
            store(saveAs+'.response', store('response'));
            store(saveAs+'.request', store('request'));
            hash.__list__ = list;
            return hash;
        },

        service: function() {
            _.api.service().then(function() {
                Eventi.fire.location('#response');
            });
        },
        search: function(e, path, query) {
            var options = D.query('#options',1),
                params = options.classList.contains('hidden') ? {} : options.values(),
                input = D.query('input[name=query]');
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
                D.query('#results').values('query', params.query);
            } else {
                input.focus();
            }
            _.api.search(params).then(_.queryResults);
        },
        queryResults: function(results) {
            _.results(results);
            _.controls(results);
        },
        controls: function(results) {
            D.queryAll('[click="page"]').each(function(el) {
                el.url = results[el.id+'_page'];
                el.classList.toggle('hidden', !el.url);
            });
        },
        page: function(e) {
            _.api.extend({ url: e.target.url })()
                .then(_.queryResults);
        },
        options: function() {
            D.query('#options').classList.toggle('hidden');
        },
        results: function(results) {
            var all = D.query('#results'),
                items = all.query('[clone]');
            items.innerHTML = '';
            results.items.forEach(_.processUnits);
            items.clone(results.items);

            var feedback = all.query('#feedback'),
                url = D.documentElement.values('url'),
                start = url && url.match(/start=(\d+)/);
            results.start = start && parseInt(start[1]) || 0;
            results.end = results.start + results.items.length - 1;
            feedback.classList.toggle('hidden', !results.items.length);
            feedback.values(results);

            var param = D.query('input[name=query]').value;
            all.classList.toggle('misspelled', results.query !== param);
        },
        items: store('list')||[],
        list: function() {
            var all = D.query('#list'),
                items = all.query('[clone]');
            if (items.children.length !== _.items.length) {
                setTimeout(function() {
                    items.innerHTML = '';
                    items.clone(_.items);
                    items.queryAll('.food').each(function(item, i) {
                        var values = _.items[i],
                            unit = item.query('[name=unit]');
                        Clone.init(unit);
                        unit.clone(values.units);
                        unit.value = values.unit.id;
                    });
                    store('list', _.items);
                }, 100);
            }
        },
        add: function() {
            _.items.push(this.cloneValues);
            Eventi.fire.location('#list');
        },
        prepExternal: function(vals) {
            var external = D.query('#external'),
                units = external.query('select[name=unit]');
            if (!vals || !vals.quantity) {
                vals = {
                    quantity: 1,
                    calories: '',
                    input: '',
                    unit: 'urn:uuid:85562e85-ba37-4e4a-8400-da43170204a7'//Each
                };
            }
            _.api.units().then(function() {
                units.clone(_.units.__list__);
                external.values(vals);
                units.value = vals.unit;
            });
        },
        externalBaseUri: 'external_',
        external: function() {
            var external = D.query('#external'),
                unit = _.units[external.query('[name=unit]').value],
                food = {
                    id: external.values('id'),
                    description: external.values('description'),
                    quantity: external.values('quantity'),
                    unit: unit,
                    nutrient_data: [{
                        nutrient: external.values('nutrient'),
                        value: external.values('value')
                    }],
                    product: '-not in ESHA db-',
                    units: [unit]
                };
            _.items.push(food);
            Eventi.fire.location('#list');
        },
        view: function(e, path, id) {
            if (id) {
                _.api.view(id).then(function viewFood(food) {
                    var view = D.query('#view'),
                        values = view.query('[clone].values');
                    _.processUnits(food);
                    food.units = food.units.map(function(unit) {
                        return unit.description;
                    }).join(', ');
                    _.ensureDefined(food, ['group','supplier','product']);
                    view.values(food);
                    values.innerHTML = '';
                    food.nutrient_data.forEach(_.processNutrientDatum);
                    values.clone(food.nutrient_data);
                }).catch(_.error);
            } else {
                id = this.cloneValues.id;
                if (id.startsWith('urn:uuid:')) {
                    Eventi.fire.location('#view/'+id);
                } else {
                    Eventi.fire.location('#list');
                }
            }
        },
        ensureDefined: function(obj, keys) {
            keys.forEach(function(key) {
                if (!(key in obj)) {
                    obj[key] = null;
                }
            });
        },
        // should handle both foods and recommendations
        processUnits: function(obj) {
            var units = _.units||_.foodunits;
            obj.unit = units[obj.unitId || obj.unit] || obj.unit;
            if (obj.units) {
                obj.units = obj.units.map(function(unit) {
                    return units[unit] || unit;
                });
            }
        },
        processNutrientDatum: function(datum) {
            if (typeof datum.value === 'number') {
                datum.value = Math.round(datum.value * 10) / 10;
            }
            datum.nutrient = _.nutrients[datum.nutrient] || datum.nutrient;
        },
        update: function(e) {
            var index = this.getAttribute('index'),
                values = _.items[index],
                name = e.target.getAttribute('name'),
                value = e.target.value;
            values[name] = name === 'unit' ? _.units[value] : value;
        },
        remove: function() {
            var index = this.nearest('[index]').getAttribute('index');
            _.items.splice(index, 1);
            _.list();
        },
        clear: function() {
            _.items = [];
            _.list();
        },
        analyze: function() {
            var foodlist = { items: [] };
            _.items.forEach(function(item) {
                var food = {
                    id: item.id,
                    quantity: item.quantity,
                    unit: item.unit.id
                };
                if (item.nutrient_data) {
                    food.description = item.description;
                    food.nutrient_data = item.nutrient_data;
                }
                foodlist.items.push(food);
            });
            _.api.analyze(foodlist).then(_.analysis);
        },
        analysis: function(response) {
            response.items.forEach(function(item) {
                item.unit = (_.units||_.foodunits)[item.unit] || item.unit;
            });
            response.results.forEach(_.processNutrientDatum);
            var el = D.query('#analysis'),
                values = el.query('[clone].values'),
                items = el.query('[clone].items');
            values.innerHTML = '';
            items.innerHTML = '';
            values.clone(response.results);
            items.clone(response.items);
        },
        recommend: function() {
            var $profile = D.query('#profile'),
                profile = $profile.xValue;
            if (profile.sex) {
                store('lastProfile', profile);
            } else if (store.has('lastProfile')) {
                profile = store('lastProfile');
                $profile.xValue = profile;
            }
            if (profile.age) {
                profile['ageIn'+profile.ageUnit] = profile.age;
            }
            if (profile.height) {
                profile['heightIn'+profile.heightUnit] = profile.height;
            }
            if (profile.weight) {
                profile['weightIn'+profile.weightUnit] = profile.weight;
            }
            // these extra fields are harmless, but misleading
            delete profile.age;
            delete profile.ageUnit;
            delete profile.height;
            delete profile.heightUnit;
            delete profile.weight;
            delete profile.weightUnit;
            delete profile.bodyMassIndex;
            // these are just noisy
            if (!profile.pregnancyDurationInWeeks) {
                delete profile.pregnancyDurationInWeeks;
            }
            if (!profile.lactationDurationInMonths) {
                delete profile.lactationDurationInMonths;
            }
            if (!profile.physicalActivityLevelCategory) {
                delete profile.physicalActivityLevelCategory;
            }
            _.api.recommend(profile).then(_.recommendations);
        },
        recommendations: function(response) {
            response.recommendations.forEach(function(rec) {
                _.processNutrientDatum(rec);
                _.processUnits(rec);
            });
            var $recs = D.query('#recs');
            $recs.xValue = response;
            D.query('[name=bodyMassIndex]').value = response.profile.bodyMassIndex;
            D.query('[name=physicalActivityLevelCategory]').value =
                response.profile.physicalActivityLevelCategory;
            var list = $recs.query('[clone]');
            list.innerHTML = '';
            list.clone(response.recommendations);

            var $profile = D.query('#profile'),
                profile = $profile.xValue;
            if (!profile.age) {
                profile.age = response.profile.ageInMonths;
                profile.ageUnit = 'Months';
            }
            if (!profile.weight) {
                profile.weight = response.profile.weightInKilograms;
                profile.weightUnit = 'Kilograms';
            }
            if (!profile.height) {
                profile.height = response.profile.heightInMeters;
                profile.heightUnit = 'Meters';
            }
            $profile.xValue = profile;
        },
        network: function(direction, e) {
            var coms = store(direction);
            coms.body = JSON.stringify(coms.body, null, 2);
            if (coms.body.length < 3) {
                coms.body = '';
            }
            coms.headers = JSON.stringify(coms.headers, null, 1)
                .replace(/",?/g, '')// quotes and commas
                .substring(2).replace('\n}','\n')// parentheses
            ;
            D.query('[name="network"]').values(coms);
            _.updateAPI(coms);
            if (e.type !== 'location') {
                Eventi.fire.location('#'+direction);
            }
        },
        updateAPI: function(request) {
            D.query('.api').values(request || store('request'));
        },
        error: function(e) {
            var response = store('response'),
                message = response.body && response.body.messages ?
                    response.body.messages[0] :
                    { text: e.type === 'location' ? '' : e };
            message.status = response.status;
            D.query('[name=error]').values(message);
            if (!e || e.type !== 'location') {
                Eventi.fire.location('#error');
            }
        },
        resource: function(e, path, name) {
            _.api[name]().then(function(response) {
                var container = D.query('[vista="'+name+'"] [clone]');
                container.innerHTML = '';
                container.clone(response.__list__);
                // restore cached network coms
                store('response', store(name+'.response'));
                store('request', store(name+'.request'));
                _.updateAPI();
            });
        }
    };

    Eventi.alias('location');
    Eventi.on(window, {
        'location@#service': _.service,
        'location@`#(nutrients|units|foodunits)`': _.resource,
        'location@#request': _.network.bind(_, 'request'),
        'location@#response': _.network.bind(_, 'response'),
        'location@#query={query}': _.search,
        'location@#list': _.list,
        'location@#analysis': _.analyze,
        'location@#recommendations': _.recommend,
        'location@#profile+recommendations': _.recommend,
        'location@#view/{uri}': _.view,
        'location@#external': _.prepExternal,
        'location@#error': _.error,
        'search': _.search,
        'recommend': _.recommend,
        'items:add<.food>': _.add,
        'items:external<.food>': _.external,
        'items:view<.food>': _.view,
        'items:remove<.food>': _.remove,
        'items:clear': _.clear,
        'page': _.page,
        'options': _.options,
        'change<.food>': _.update
    });

})(document, window.Eventi, window.store, window.Clone, window.Posterior, window.Vista);