'use strict';
function _debug(o, key) {
    var fn = o[key];
    o[key] = function() {
        console.log(key, 'arguments', arguments);
        var ret = fn.apply(this, Array.prototype.slice.call(arguments));
        if (ret !== undefined) {
            console.debug(key, 'return', ret);
            return ret;
        }
    };
}
function debug(o) {
    for (var key in o) {
        if (typeof o[key] === 'function') {
            _debug(o, key);
        }
    }
}
//debug(window.app);
//debug(window.Clone);
//debug(window.Values);
