(function(Eventi, document, location) {
    'use strict';

    var _ = window.View = {
        list: [],
        define: function(name, re) {
            _.list.push({
                name: name,
                re: re instanceof RegExp ? re : new RegExp(re || name)
            });
            _.style.innerHTML += _.rules(name);
        },
        rules: function(name) {
            return '.view-'+name+
                 ', .'+name+'-on .hide-'+name+' { display: none !important; }\n'+
                   '.'+name+'-on .view-'+name+' { display: block !important; }\n'+
                   '.'+name+'-on span.view-'+name+
                 ', .'+name+'-on a.view-'+name+
                 ', .'+name+'-on input.view-'+name+
                 ', .'+name+'-on button.view-'+name+
                 ', .'+name+'-on select.view-'+name+
                 ', .'+name+'-on label.view-'+name+
                 ', .'+name+'-on img.view-'+name+' { display: inline-block !important; }\n';
        },
        update: function(path) {
            var url = path || location.pathname + location.search + location.hash,
                start = true;
            _.list.forEach(function(view) {
                var show = view.re.test(url);
                _.toggle(view.name, show);
                if (show) {
                    start = false;
                }
            });
            _.toggle('start', start);
        },
        toggle: function(name, on) {
            document.body.classList.toggle(name+'-on', on);
        }
    };

    var meta = document.querySelector('meta[name=view]');
    if (meta) {
        var style = _.style = document.createElement('style'),
            definitions = meta.getAttribute('content') || '';
        definitions.split(' ').forEach(function(view) {
            _.define.apply(_, view.split('='));
        });
        _.define('start');
        document.head.appendChild(style);
        Eventi.on(_, 'location', function view(e, path) {
            _.update(path);
        });
    }

})(window.Eventi, document, window.location);
