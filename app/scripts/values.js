(function(window) {
    'use strict';

    Object.defineProperty(HTMLElement.prototype, 'values', {
        value: function values(name, vals) {
            switch (arguments.length) {
                case 0:
                    return this.querySelector(_.selector()) ? _.getAll(this) : _.get(this);
                case 1:
                    return _[typeof name === 'object' ? 'setAll' : 'getByName'](this, name);
                default:
                    return _.setByName(this, name, vals);
            }
        }
    });

    var _ = window.Values = {
        selector: function(name) {
            return (name && '[name="'+name+'"],[index="'+name+'"]') ||
                   '[name],[index]';
        },
        attribute: function(el) {
            return el.getAttribute('name') || el.getAttribute('index');
        },
        indexRE: /^[0-9]+$/,
        getAll: function(el, vals) {
            for (var i=0, m=el.children.length; i<m; i++) {
                var child = el.children[i],
                    attr = _.attribute(child),
                    parent = !!child.querySelector(_.selector());
                if (attr) {
                    if (!vals) {
                        vals = _.indexRE.test(attr) ? [] : {};
                    }
                    vals[attr] = parent ? _.getAll(child) : _.get(child, attr);
                } else if (parent) {
                    vals = _.getAll(child, vals);
                }
            }
            return vals;
        },
        getByName: function(el, name) {
            name = name+'';
            var kids = _.endpoints(el);
            while (kids.length) {
                var child = kids.shift();
                if (name === _.fullName(child, el) ||
                    name === _.attribute(child)) {
                    return child.querySelector(_.selector()) ?
                        _.getAll(child) : _.get(child, name);
                }
            }
        },
        get: function(el, name) {
            var keys = [el.getAttribute('read'), el.type, el.nodeName.toLowerCase()],
                reader = _.conf.call(el, keys, _.read),
                val = reader.call(el, name);
            if (typeof val === 'string') {
                keys = [el.getAttribute('parse'), name, el.type];
                var parse = _.conf.call(el, keys, _.parse);
                val = parse.call(el, val, name);
            }
            return val;
        },
        parse: {
            'default': function(s) {
                try {
                    return JSON.parse(s);
                } catch (e) {
                    return s;
                }
            }
        },
        read: {
            checkbox: function() {
                var name = this.getAttribute('name'),
                    els = this.parentNode.querySelectorAll(_.selector(name)),
                    vals = [];
                for (var i=0,m=els.length; i<m; i++) {
                    if (els[i].checked){ vals.push(els[i].value); }
                }
                return this.type === 'radio' || els.length === 1 ? vals[0] : vals;
            },
            radio: 'checkbox',
            input: function(){ return this.value; },
            textarea: 'input',
            select: function() {
                var label = this.getAttribute('label') !== 'false',
                    opts = this.querySelectorAll('option'),
                    vals = [];
                for (var i=0,m=opts.length; i<m; i++) {
                    var o = opts[i];
                    if (o.selected) {
                        vals.push(label ? { value: o.value, label: o.label }
                                        : o.value);
                    }
                }
                return this.hasAttribute('multiple') ? vals : vals[0];
            },
            'default': function(name) {
                return (name && this.getAttribute('data-'+name) ||
                                this.getAttribute(name)) ||
                       this.innerText;
            }
        },
        endpoints: function(el) {
            var named = el.querySelectorAll(_.selector()),
                ends = [];
            for (var i=0,m=named.length; i<m; i++) {
                if (!named[i].querySelector(_.selector())) {
                    ends.push(named[i]);
                }
            }
            if (!ends.length && _.attribute(el)) {
                ends.push(el);
            }
            return ends;
        },
        fullName: function(el, context) {
            var attrs = [_.attribute(el)];
            while (el.parentNode &&
                   el.parentNode !== context &&
                   el.parentNode.getAttribute) {
                attrs.unshift(_.attribute(el = el.parentNode));
            }
            var name = '',
                addDot = false;
            while (attrs.length) {
                var attr = attrs.pop();
                if (attr) {
                    if (_.indexRE.test(attr)) {
                        name += '['+attr+']';
                        addDot = false;
                    } else {
                        if (addDot) {
                            name += '.';
                        }
                        name += attr;
                        addDot = true;
                    }
                }
            }
            return name;
        },
        setAll: function(el, vals) {
            var set = _.endpoints(el);
            for (var i=0; i<set.length; i++) {
                var end = set[i],
                    name = _.fullName(end, el),
                    val = _.resolve(name, vals);
                if (val !== undefined) {
                    _.set(end, val, name);
                } else if (end === el) {
                    for (name in vals) {
                        val = vals[name];
                        _.set(el, val, name);
                    }
                } else {
                    set.splice(i--, 1);
                }
            }
            return set;
        },
        setByName: function(el, name, vals) {
            var els = el.querySelectorAll(_.selector(name)),
                fn = typeof vals === 'object' ? 'setAll' : 'set';
            for (var i=0,m=els.length; i<m; i++) {
                _[fn](els[i], vals);
            }
            return els;
        },
        set: function(el, val, name) {
            var keys = [el.getAttribute('write'), el.type, el.nodeName.toLowerCase()],
                writer = _.conf.call(el, keys, _.write);
            if (val && val.value) {
                val = val.value;
            }
            if (typeof val !== 'string') {
                keys = [el.getAttribute('stringify'),
                        val !== undefined && val !== null ? val.constructor.name : 'empty'];
                var stringify = _.conf.call(el, keys, _.stringify);
                val = stringify.call(el, val, name);
            }
            writer.call(el, val, name);
        },
        stringify: {
            Object: function(o){ return JSON.stringify(o); },
            empty: function(){ return ''; },
            Date: 'Object',//TODO: support formatters like moment.js
            Array: 'Object',
            'default': function(v){ return v+''; }
        },
        write: {
            checkbox: function(val) {
                var vals = Array.isArray(val) ? val : val.split(',');
                this.checked = vals.indexOf(this.value) >= 0;
            },
            radio: 'checkbox',
            input: function(val){ this.value = val; },
            textarea: 'input',
            select: function(val) {
                if (this.hasAttribute('multiple')) {
                    var vals = Array.isArray(val) ? val : val.split(','),
                        opts = this.querySelectorAll('option');
                    for (var i=0,m=opts.length; i<m; i++) {
                        if (vals.indexOf(opts[i].value) >= 0) {
                            opts[i].selected = true;
                        }
                    }
                } else {
                    this.value = val;
                }
            },
            'default': function(val, name) {
                var re = name && new RegExp('{{'+name+'}}','g'),
                    onlyAttr = false;
                for (var i=0,m=this.attributes.length; i<m; i++) {
                    var attr = this.attributes[i];
                    if (re && re.test(attr.value)) {
                        attr.value = attr.value.replace(re, val);
                    } else if (attr.name === name || attr.name === 'data-'+name) {
                        attr.value = val;
                        onlyAttr = true;
                    }
                }
                if (!onlyAttr) {
                    var text = this.innerHTML;
                    this.innerHTML = re && re.test(text) ? text.replace(re, val) : val;
                }
            }
        },
        conf: function(keys, props) {
            var contexts = [props, this, window];
            for (var i=0, m=keys.length; i<m; i++) {
                for (var j=0, n=contexts.length; j<n; j++) {
                    if (keys[j]) {
                        var val = _.resolve(keys[i], contexts[j]);
                        if (typeof val === 'string') {
                            val = contexts[0][val];// can redirect to a configured fn
                        }
                        if (typeof val === 'function') {
                            return val;
                        }
                    }
                }
            }
            return props['default'];
        },
        resolve: function(reference, context) {
            context = context || window;
            reference = reference+'';
            var val = context[reference];
            if (val === undefined && reference) {
                var index = 0;
                while (true) {
                    var dot = reference.indexOf('.', index),
                        ctx,
                        ref;
                    if (dot > 0) {
                        ctx = reference.substring(0, dot);
                        ref = reference.substring(dot+1);
                        index = dot+1;
                    } else {
                        var bracket = reference.indexOf('[', index);
                        if (bracket >= 0) {
                            ctx = reference.substring(0, bracket);
                            ref = reference.substring(bracket);
                            index = bracket+1;
                        } else {
                            break;
                        }
                    }
                    if (ctx in context) {
                        if (ref.charAt(0) === '[') {
                            ref = ref.substring(1, ref.indexOf(']'));
                        }
                        val = _.resolve(ref, context[ctx]);
                        if (val !== undefined) {
                            return val;
                        }
                        console.log(ref, ctx, context, val);
                    }
                }
            }
            return val;
        }
    };

})(window);