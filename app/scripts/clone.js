(function(window, document) {
    'use strict';

    var none = document.createElement('style');
    none.innerHTML = '[clone] { display: none }';
    document.head.appendChild(none);

    Object.defineProperty(HTMLElement.prototype, 'clone', {
        value: function clone(insert, fill) {
            if (!insert || typeof insert === 'object') {
                fill = insert;
                insert = this.getAttribute('insert') || 'last';
            }
            return _.main(this, insert, fill);
        }
    });

    document.addEventListener('DOMContentLoaded', function() {
        var x = document.querySelectorAll('[clone]');
        for (var i=0,m=x.length; i<m; i++) {
            _.init(x[i]);
        }
        document.head.removeChild(none);
    });

    var _ = window.Clone = {
        init: function(el) {
            var newRoot = el.children.length > 1,
                node = newRoot ? document.createElement('div')
                              : document.createDocumentFragment();
            for (var i=0,m=el.childNodes.length; i<m; i++) {
                node.appendChild(el.childNodes[i].cloneNode(true));
            }
            el.innerHTML = '';
            el.classList.add('noClones');
            Object.defineProperty(el, 'cloneSource', {
                value: node,
                writeable: true
            });
        },
        main: function(target, insert, values) {
            var find = target.getAttribute('clone'),
                source = (find && document.querySelector(find)) || target;
            insert = _.insert[insert] || insert;
            if (source && insert.call) {
                if (!Array.isArray(values)) {
                    values = [values];
                }
                var ret = [];
                for (var i=0, m=values.length; i<m; i++) {
                    ret.push(_.clone(target, source, insert, values[i]));
                }
                target.classList.toggle('noClones', !values.length);
                _.index(target);
                return ret.length === 1 ? ret[0] : ret;
            }
        },
        clone: function(target, source, insert, values) {
            var clone = (source.cloneSource || source).cloneNode(true),
                root = clone.classList ? clone : clone.children[0];
            if (root) {
                root.classList.add('cloned');
            }
            if (values) {
                _.values(clone, values, root);
            }
            insert.call(target, clone);
            if (window.CustomEvent) {
                var e = new CustomEvent('cloned', { bubbles:true });
                e.clone = clone;
                e.source = source;
                e.insert = insert;
                e.values = values;
                target.dispatchEvent(e);
            }
            return clone;
        },
        insert: {
            first: function(dom){ this.insertBefore(dom, this.childNodes[0]); },
            last: function(dom){ this.appendChild(dom); }
        },
        values: function(el, values, root) {
            if (typeof values === 'function') {
                values.call(el, el);
            } else if (typeof el.values === 'function') {
                el.values(values);
            } else if (el.children.length) {
                for (var i=0,m=el.children.length; i<m; i++) {
                    _.values(el.children[i], values);
                }
            }
            if (root) {
                Object.defineProperty(root, 'cloneValues', {value:values});
            }
        },
        index: function(el) {
            var all = el.querySelectorAll('.cloned');
            for (var i=0,m=all.length; i<m; i++) {
                all[i].setAttribute('index', i);
            }
        }
    };
            
})(window, document);