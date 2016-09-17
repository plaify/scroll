(function ($) {
    $.fn.actual = function(dim, ignoreHeight) {
        var clone, styles, result;

        if (this.is(':visible') && ignoreHeight === undefined) {
            result = this[dim]();
        } else {
            styles = {
                position: 'absolute',
                top: '-9999px',
                visibility: 'hidden'
            };

            if (ignoreHeight) {
                styles.height = 'auto';
                styles['min-height'] = 'none';
                styles['max-height'] = 'none';
            }

            clone = this.clone().css(styles).appendTo('body');
            result = clone[dim]();

            clone.remove();
        }

        return result;
    };
}(jQuery));