(function ($) {
    $.fn.actual = function(dim, val, ignoreHeight) {
        var $that = this,
            $displayChangedElems = $([]),
            $hiddenParents, $lastHidden, result;

        if (ignoreHeight) {
            $that
                .data('dim-height', $that[0].style.height).css('height', 'auto')
                .data('dim-min-height', $that[0].style.minHeight).css('min-height', '0')
                .data('dim-max-height', $that[0].style.maxHeight).css('max-height', 'none');
        }

        if ($that.is(':visible')) {
            result = (val === undefined) ? $that[dim]() : $that[dim](val);
        } else {
            // Находим всех скрытых предков
            $hiddenParents = $that.parents().filter(':hidden');

            // Определяем последний скрытый элемент
            $lastHidden = $hiddenParents.last();

            if (!$lastHidden.length) {
                $lastHidden = $that;
            }

            // Изменяем стили
            $lastHidden
                .data('dim-visibility', $lastHidden[0].style.visibility).css('visibility', 'hidden')
                .data('dim-position', $lastHidden[0].style.position).css('position', 'absolute');

            $hiddenParents.add($that).each(function() {
                var $this = $(this);

                if ($this.is(':hidden')) {
                    // Изменяем свойство display на block для всех скрытых элементов
                    $displayChangedElems = $displayChangedElems.add($this.data('dim-display', this.style.display).css('display', 'block'));
                }
            });

            // Получаем размерность
            result = (val === undefined) ? $that[dim]() : $that[dim](val);

            // Восстанавливаем стили
            $lastHidden
                .css('visibility', $lastHidden.data('dim-visibility')).removeData('dim-visibility')
                .css('position', $lastHidden.data('dim-position')).removeData('dim-position');

            $displayChangedElems.add($that).each(function() {
                var $this = $(this);

                $this.css('display', $this.data('dim-display')).removeData('dim-display');
            });
        }

        if (ignoreHeight) {
            $that
                .css('height', $that.data('dim-height')).removeData('dim-height')
                .css('min-height', $that.data('dim-min-height')).removeData('dim-min-height')
                .css('max-height', $that.data('dim-max-height')).removeData('dim-max-height');
        }

        return result;
    };
}(jQuery));