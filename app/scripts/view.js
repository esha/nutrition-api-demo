(function(Eventi, HTML) {
    'use strict';

    HTML.head.add('style').innerHTML =
        '[view] { display: none } '+
        '[view].shown { display: block; }';

    Eventi.on('location', function() {
        var url = location.href,
            none = [],
            show = [],
            hide = [];

        HTML.query('[view]').each(function(el) {
            var on = el.getAttribute('view');
            if (!on) {
                none.push(el);
            } else if (url.indexOf(on) >= 0) {
                show.push(el);
            } else {
                hide.push(el);
            }
        });

        if (show.length) {
            hide = hide.concat(none);
        } else {
            show = none;
        }
        HTML.ify(hide).each('classList.remove', 'shown');
        HTML.ify(show).each('classList.add', 'shown');
    });

})(window.Eventi, document.documentElement);