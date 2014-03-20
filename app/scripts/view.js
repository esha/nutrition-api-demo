(function(Eventi, document, location) {
    'use strict';

    var views = [];
    views.define = function(name, re) {
        views.push({
            name: name,
            re: re instanceof RegExp ? re : new RegExp(re || name)
        });
        views.style.innerHTML += views.rule(name);
    };
    views.rule = function(name) {
        return '.view-'+name+
             ', .'+name+' .hide-'+name+' { display: none; }\n'+
               '.'+name+' .view-'+name+' { display: block; }\n'+
               '.'+name+' span.view-'+name+
             ', .'+name+' a.view-'+name+
             ', .'+name+' input.view-'+name+
             ', .'+name+' button.view-'+name+
             ', .'+name+' select.view-'+name+
             ', .'+name+' label.view-'+name+
             ', .'+name+' img.view-'+name+' { display: inline-block; }\n';
    };
    views.update = function(path) {
        var url = path || location.pathname + location.search + location.hash,
            start = true;
        for (var i=0, m=views.length; i<m; i++) {
            var view = views[i],
                show = view.re.test(url);
            document.body.classList.toggle(view.name, show);
            if (show) {
                start = false;
            }
        }
        document.body.classList.toggle('start', start);
    };

    var meta = document.querySelector('meta[name=views]');
    if (meta) {
        var style = views.style = document.createElement('style'),
            definitions = meta.getAttribute('content') || '';
        definitions.split(' ').forEach(function(view) {
            views.define.apply(views, view.split('='));
        });
        views.define('start');
        document.head.appendChild(style);
        Object.defineProperty(document, 'views', {value:views});
        Eventi.on(views, 'location', function updateView(e, path) {
            views.update(path);
        });
    }

})(window.Eventi, document, window.location);
