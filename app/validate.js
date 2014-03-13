/**
 * Copyright (c) 2012, ESHA Research
 *
 * HTML5 form validation polyfill, and then some.
 *
 * @version 0.1
 * @name validate
 * @requires jQuery
 * @uses trigger
 * @author Nathan Bubna
 */
;(function($, window, document) {

    var validate = window.validate = {
        // natural extension points
        type: {
            number: /^\-?\d*(\.\d+)?$/,
            email: /^[a-zA-Z0-9.!#$%&'*+-\/=?\^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
            url: /^http.[^\s]+$/i
        },
        fn: {
            required: function(value) {
                return !$.trim(value);
            },
            pattern: function(value, pattern) {
                return value && !value.match(new RegExp('^'+pattern+'$'));
            },
            equals: function(value, other) {
                return value != validate.valueOf(other);
            },
            maxlength: function(value, maxlength) {
                return value.length > parseInt(maxlength);
            },
            minlength: function(value, minlength) {
                return value && value.length < parseInt(minlength);
            },
            min: function(value, min) {
                return validate.parse(value) < validate.parse(min);
            },
            max: function(value, max) {
                return validate.parse(value) > validate.parse(max);
            },
            step: function(value, step) {
                // % operator is inconsistent with floats, convert to ints first
                var decimal = step.indexOf('.');
                if (decimal >= 0) {
                    var power = step.length - decimal - 1,
                        factor = Math.pow(10, power); 
                }
                step = Math.round(parseFloat(step) * power);
                var remainder = Math.round(value * power) % step;
                return !isNaN(remainder) && remainder !== 0;
            }
        },
        classes: {
            required: 'valueMissing',
            pattern: 'patternMismatch',
            equals: 'notEqual',
            maxlength: 'tooLong',
            minlength: 'tooShort',
            min: 'rangeUnderflow',
            max: 'rangeOverflow',
            step: 'stepMismatch'
        },
        field: '[type=number],[type=email],[type=url],'+//types
               '[required],[pattern],[maxlength],[min],[max],[step],'+// standards
               '[equals],[minlength]',// extensions
        form: 'form,[form],.form',// not everyone wants <form> elements
        restricted: '[restrict]',

        // internal functions
        //debug: true,
        valueOf: function(string) {
            if (string && string.charAt(0) === '$') {// e.g. min="$(#minimum)"
                var el = $(string.substring(2, string.length-1));
                string = el.val() || el.attr('value') || el.text();
            }
            return string;
        },
        parse: function(string) {
            return parseFloat(validate.valueOf(string));
        },
        check: function(el, event) {
            var no = el.attr('novalidate');
            if (!no) return true;
            if (no === 'true' || no === 'novalidate') return false;
            if (no.indexOf('!') === 0) return $.inArray(event, no.substring(1).split()) !== -1;
            return $.inArray(event, no.split(' ')) === -1;
        },
        one: function(el, event) {
            if (!validate.check(el, event)) return true;

            var type = validate.type[el.attr('type')],
                value = el.val() || el.attr('value') || '',
                valid = true;
            if (type) {
                valid = !value || !!value.match(type);
                el.toggleClass('typeMismatch', !valid);
            }
            for (var attrName in validate.fn) {
                var attrValue = el.attr(attrName);
                if (attrValue) {
                    var _class = validate.classes[attrName],
                        failed = validate.fn[attrName](value, attrValue);
                    if (failed) valid = false;
                    el.toggleClass(_class, failed);
                    if (validate.debug) console.log('validate.'+attrName, attrValue, value, failed);
                }
            }
            el.toggleClass('invalid', !valid);
            if (valid) el.data('lastValid', value);
            if (validate.debug) console.log('validate', el, valid, event);
            return valid;
        },
        all: function(form, event) {
            if (!validate.check(form, event)) return true;

            var valid = true;
            form.find(validate.field).each(function() {
                if (!validate.one($(this), event)) {
                    valid = false;
                }
            });
            form.toggleClass('invalid', !valid)
                .trigger(valid ? 'valid' : 'invalid');
            if (!valid) {
                var el = form.find('.invalid:visible').first();
                if (el.length) validate.goTo(el);
            }
            if (validate.debug) console.log('validate', form, valid, event);
            return valid;
        },
        goTo: function(el) {
            var page = $('html,body'),
                win = Math.min(page[0].clientHeight, page[1].clientHeight),
                doc = Math.max(page[0].scrollHeight, page[1].scrollHeight),
    		    offset = el.offset().top,
    		    scrollTop = Math.max(0, Math.min(doc-win, offset-(win/2)));
    		page.animate({ scrollTop: scrollTop }, {
    		    complete: function(){ el.focus(); },
    		    duration: 'slow',
    		    easing: 'swing'
    		});
    	},

        // event listeners
        ready: function() {
            $(validate.form).each(function(){ validate.all($(this), 'ready'); });
            $('[required]').attr('aria-required', true);
        },
        validate: function(e, event) {
            if (e.keyCode === 9) return;// don't validate when tabbing
            var el = $(e.target),
                valid = true;
            event = event && typeof event === "string" ? event : e.type;
            if (el.is(validate.field)) {
                valid = validate.one(el, event);
            } else if (event === 'submit' || event === 'validate') {
                valid = validate.all(el.closest(validate.form), event);
            }
            return valid;
        },
        restrict: function(e) {
            var el = $(e.target);
            if (el.hasClass('invalid')) {
                var was = el.data('lastValid'),
                    is = el.val() || el.attr('value');
                el.val(el.data('lastValid')).trigger('restricted', [is]);
                setTimeout(function(){ el.focus(); }, 0);
                if (validate.debug) console.log('validate.restrict', el, is, was);
                return false;
            }
        }
    };

    $(document)
    .ready(validate.ready)
    .on('keyup val submit validate', validate.validate)
    .on('focusout', validate.restricted, validate.restrict);

    // notify when values are programmatically set
    validate.valFn = $.fn.val;
    $.fn.val = function(val, quiet) {
        var ret = validate.valFn.apply(this, arguments);
        if (arguments.length && quiet !== false) this.trigger('val');
        return ret;
    };

})(jQuery, window, document);