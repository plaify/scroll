$.fn.scroll = function(options) {
    var self = {},
        $that = this;

    /*** Настройки ***/
    var _settings = $.extend({
        height: $that.actual('innerHeight'),
        minHeight: +$that.css('min-height').slice(0, -2) || 0,
        maxHeight: +$that.css('max-height').slice(0, -2) || 500,
        adaptiveHeight: false,
        toggleHeight: null,
        minToggleHeight: 30,
        maxToggleHeight: null,
        adaptiveToggleHeight: true,
        orientation: 'top',
        wheelSpeed: 1,
        scrollHandler: null
    }, options);

    /*** Переменные ***/
    var _scroll = 0,
        _maxScroll = null,
        _isMobile = null,
        _wheelTimeout = null,
        _animated = false,
        _centerModeFlag = false,
        _dom = {
            wrap: null,
            inner: null,
            scrollbar: null,
            toggle: null
        };

    /*** Методы ***/

    // Инициализация
    var _init = function() {
        var ch = $that.actual('innerHeight', undefined, true);

        // Формируем обертку
        _createWrap();

        if (_settings.adaptiveHeight) {
            // Определяем высоту блока в режими адаптивности
            _settings.height = _nValue(ch, _settings.minHeight, _settings.maxHeight);
        }

        // Определяем максимальное значение скролла
        _maxScroll = _nValue(ch - _settings.height, 0);

        // Устанавливаем высоту обертки и самого блока
        _setHeight(_settings.height);

        // Устанавливаем высоту бегунка
        _setToggleHeight(ch);

        // Переносим паддинги
        _dom.inner.css('padding', _getPadding($that));
        $that.css('padding', 0);

        // Позиционируем содержимое
        _dom.inner.css(_settings.orientation, 0);
        _dom.toggle.css(_settings.orientation, 0);

        // Определяем устройство
        _isMobile = _checkMobile();

        // Устанавливаем обработчики
        if (_isMobile) {
            $that.on('touchstart.scroll', _startScrollMobile);
        } else {
            $that.on('wheel.scroll', _wheel);
            _dom.toggle.on('mousedown.scroll', _startScroll);
        }

        // Обновляем разметку
        $that.html(_dom.wrap);
    };

    // Сформировать обертку
    var _createWrap = function() {
        _dom.wrap =
            $('<div class="content-with-scroll">' +
                '<div class="content-with-scroll-inner">' +
                $that.html() +
                '</div>' +
                '<div class="scrollbar">' +
                '<div class="scrollbar-toggle"></div>' +
                '</div>' +
                '</div>');
        _dom.scrollbar = _dom.wrap.find('.scrollbar');
        _dom.toggle = _dom.scrollbar.find('.scrollbar-toggle');
        _dom.inner = _dom.wrap.find('.content-with-scroll-inner');
    };

    // Установить высоту
    var _setHeight = function(height) {
        _settings.height = height;

        _dom.wrap.height(_settings.height);
        $that.innerHeight(_settings.height);
    };

    // Установить высоту бегунка в зависимости от высоты содержимого
    var _setToggleHeight = function(ch) {
        var sbh = _dom.scrollbar.actual('height');

        if (_maxScroll === 0) {
            _dom.toggle.height(0);
        } else if (_settings.adaptiveToggleHeight) {
            _dom.toggle.height(_nValue(sbh * (sbh / ch), _settings.minToggleHeight, _settings.maxToggleHeight));
        } else {
            _dom.toggle.height(sbh > _settings.toggleHeight ? _settings.toggleHeight : sbh);
        }
    };

    ///////////////////// Скролл ///////////////////////////

    // Обработчик события wheel
    var _wheel = function(e) {
        e = e.originalEvent;
        e.preventDefault();
        e.stopPropagation();

        if (_maxScroll === 0) return;

        _doScroll(_getDelta(e) * _settings.wheelSpeed);

        _dom.scrollbar.addClass('active');

        clearTimeout(_wheelTimeout);
        _wheelTimeout = setTimeout(function() {
            _dom.scrollbar.removeClass('active');
        }, 300);
    };

    // Обработчик перемещения бегунка
    var _startScroll = function(e) {
        e.originalEvent.preventDefault();

        var pageY = e.pageY,
            $window = $(window),
            k = (_dom.inner.actual('innerHeight') - _settings.height) / (_dom.scrollbar.actual('height') - _dom.toggle.actual('height')),
            delta;

        clearTimeout(_wheelTimeout);
        _dom.scrollbar.addClass('active');

        $window.on('mousemove.scroll', function(e) {
            e.preventDefault();

            delta = (e.pageY - pageY) * k;
            pageY = e.pageY;

            _doScroll(delta);
        });

        $window.on('mouseup.scroll', function(e) {
            _dom.scrollbar.removeClass('active');
            $window.off('mouseup.scroll');
            $window.off('mousemove.scroll');
        });
    };

    // Обработчик события touchstart
    var _startScrollMobile = function(e) {
        e = e.originalEvent;
        e.preventDefault();

        var pageY = e.touches[0].pageY,
            $window = $(window),
            k = (_dom.inner.actual('innerHeight') - _settings.height) / (_dom.scrollbar.actual('height') - _dom.toggle.actual('height')),
            delta;

        _dom.scrollbar.addClass('active');

        $window.on('touchmove.scroll', function(e) {
            e = e.originalEvent;
            e.preventDefault();

            delta = (pageY - e.touches[0].pageY) * k;
            pageY = e.touches[0].pageY;

            _doScroll(delta * _settings.wheelSpeed);
        });

        $window.on('touchend.scroll', function() {
            _dom.scrollbar.removeClass('active');
            $window.off('touchend.scroll');
            $window.off('touchmove.scroll');
        });
    };

    // Проскроллить на delta пикселей
    var _doScroll = function(delta, duration) {
        if (_animated || _centerModeFlag) return;

        duration = duration || 0;
        delta = _settings.orientation === 'bottom' ? -delta : delta;

        var val =  _nValue(_scroll + delta, 0, _maxScroll),
            propsInner = {},
            propsToggle = {};

        propsInner[_settings.orientation] = -val;
        propsToggle[_settings.orientation] = (val / _maxScroll) * (_dom.scrollbar.actual('height') - _dom.toggle.actual('height'));

        _dom.toggle.animate(propsToggle, duration);
        _dom.inner.animate(propsInner, {
            duration: duration,
            start: function() {
                _animated = true;
            },
            step: function(now) {
                if (-now !== _scroll) {
                    _scroll = -now;

                    // Вызов callback функции
                    if (typeof _settings.scrollHandler === 'function') {
                        _settings.scrollHandler(_getScroll());
                    }
                }
            },
            complete: function() {
                _animated = false;
            }
        });
    };

    /////////////////// Обновление /////////////////////////

    // Обновить
    var _update = function(orientation) {
        var ch = _dom.inner.actual('innerHeight'),
            delta = ch - _settings.height - _maxScroll;

        if (_settings.adaptiveHeight) {
            _updateHeight(undefined, true);
        }

        // Изменяем максимальный скролл
        _maxScroll = _nValue(ch - _settings.height, 0);

        if (_centerModeFlag) {
            _updateCenter();
        }

        // Пересчитываем высоту бегунка
        _setToggleHeight(ch);

        // Обновляем позицию скролла
        if (orientation === _settings.orientation) {
            // Скроллим, если позиция изменения данных совпадает с ориентацией
            _doScroll(_settings.orientation === 'top' ? delta : -delta);
        } else {
            // Производим фиктивный скролл
            _doScroll(0);
        }
    };

    // Изменить высоту
    var _updateHeight = function(height, updateOnlyHeight) {
        if (height === undefined && !_settings.adaptiveHeight) return;

        var ch = _dom.inner.actual('innerHeight');

        if (_settings.adaptiveHeight) {
            // Высота адаптивна
            _settings.height = _nValue(ch, _settings.minHeight, _settings.maxHeight);
        } else {
            // Высота неадаптивна
            _settings.height = height;
        }

        // Изменяем высоту обертки
        _setHeight(_settings.height);

        // Если установлен флаг updateOnlyHeight, выходим из функции
        if (updateOnlyHeight) return;

        _maxScroll = _nValue(ch - _settings.height, 0);

        if (_centerModeFlag) {
            _updateCenter();
        }

        // Изменяем высоту тоглера
        _setToggleHeight(ch);

        // Производим фиктивный скролл, чтобы изменить позицию бегунка
        _doScroll(0);
    };

    /////////////// Получение информации ///////////////////

    // Получить ориентацию элемента относительно текущего положения скролла
    var _getElemOrientation = function($elem) {
        var info = _getElemInfo($elem),
            scroll = _getScroll(),
            result = 'in';

        if (info.top + info.height < scroll.top) {
            result = 'top';
        } else if (info.bottom + info.height < scroll.bottom) {
            result = 'bottom';
        }

        return result;
    };

    // Получить информацию об элемента
    var _getElemInfo = function($elem) {
        var pos = $elem.position(),
            height = $elem.actual('outerHeight', true);

        return {
            top: pos.top,
            bottom: _maxScroll + _settings.height - pos.top - height,
            height: height
        };
    };

    // Определение дельты по событию
    var _getDelta = function(e) {
        var delta = e.deltaY;

        if (typeof delta === 'undefined') {
            // OS X Safari
            delta = -1 * e.wheelDeltaY / 6;
        }

        if (e.deltaMode && e.deltaMode === 1) {
            // Firefox in deltaMode 1: Line scrolling
            delta *= 15;
        }

        if (isNaN(delta)) {
            // IE in some mouse drivers
            delta = 0;
        }

        return delta;
    };

    // Получить координаты скролла
    var _getScroll = function() {
        var result = {};

        if (_settings.orientation === 'top') {
            result.top = _scroll;
            result.bottom = _maxScroll - _scroll;
        } else {
            result.top = _maxScroll - _scroll;
            result.bottom = _scroll;
        }

        return result;
    };

    ////////////////// Центрирование ///////////////////////

    // Установить/Сбросить режим центрирования
    var _centerMode = function(flag) {
        var ch = _dom.inner.actual('innerHeight');

        if (flag) {
            _centerModeFlag = true;
            _updateCenter();
        } else {
            _centerModeFlag = false;
            _dom.inner.css(_settings.orientation, 0);
        }
    };

    // Отцентрировать содержимое
    var _centerContent = function() {
        _dom.inner.css(_settings.orientation, (_settings.height - _dom.inner.actual('innerHeight')) / 2);
    };

    // Проверить центрирование
    var _updateCenter = function() {
        if (_maxScroll === 0) {
            _centerContent();
        } else {
            _centerMode(false);
        }
    };

    ////////////// Вспомогательные функции /////////////////

    // Нормирование значений
    var _nValue = function(val, min, max) {
        if ( (min || min === 0) && (max || max === 0) && min > max) {
            min = [max, max = min][0];  // swap
        }

        if (min || min === 0) {
            val = (val < min) ? min : val;
        }

        if (max || max === 0) {
            val = (val > max) ? max : val;
        }

        return val;
    };

    // Получить внутрений отступ
    var _getPadding = function($elem) {
        var padding = [
            $elem.css('padding-top'),
            $elem.css('padding-right'),
            $elem.css('padding-bottom'),
            $elem.css('padding-top')
        ];

        return padding.join(' ');
    };

    // Проверка мобильного устройства
    var _checkMobile = function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    /*** API ***/

    // Обновить
    self.update = _update;

    // Разрушить
    self.destroy = function() {
        var $window = $(window);

        // Снятие обработчиков
        if (_isMobile) {
            $that.off('touchstart.scroll');
            $window.off('touchend.scroll');
            $window.off('touchmove.scroll');
        } else {
            $that.off('wheel.scroll');
            _dom.toggle.off('mousedown.scroll');
            $window.off('mouseup.scroll');
            $window.off('mousemove.scroll');
        }

        // Разрушение таймера
        clearTimeout(_wheelTimeout);
    };

    // Проскроллить вверх
    self.scrollTop = function(duration) {
        _doScroll(-_maxScroll, duration);
    };

    // Проскроллить вниз
    self.scrollBottom = function(duration) {
        _doScroll(_maxScroll, duration);
    };

    // Проскроллить к конкретному элементу
    self.scrollTo = function(elem, align, duration) {
        var $elem = _dom.inner.find(elem),
            info, delta;

        // Выходим, если элемент не найден
        if (!$elem.length) return;

        // Получаем информацию об элементе
        info = _getElemInfo($elem);

        if (align === 'center' && info.height < _settings.height) {

            if (_settings.orientation === 'top') {
                delta = info.top - (_settings.height - info.height) / 2 - _scroll;
            } else {
                delta = _scroll - (info.bottom - (_settings.height - info.height) / 2);
            }

        } else {

            if (_settings.orientation === 'top') {
                delta = info.top - _scroll;
            } else {
                delta = _scroll - (_maxScroll - info.top);
            }

        }

        duration = typeof align === 'number' ? align : duration;

        _doScroll(delta, duration);
    };

    // Общий метод скролла
    self.scroll = _doScroll;

    // Установить/Сбросить режим центрирования
    self.centerMode = _centerMode;

    // Получить текущее положение скролла
    self.getScroll = _getScroll;

    // Изменить высоту
    self.changeHeight = _updateHeight;

    // Заменить содержимое
    self.replaceContent = function(html) {
        var $html = $(html);

        _dom.inner.html($html);
        _update();

        return $html;
    };

    // Вставить содержимое сверху
    self.addTop = function(html) {
        var $html = $(html);

        _dom.inner.prepend($html);
        _update('top');

        return $html;
    };

    // Вставить содержимое снизу
    self.addBottom = function(html) {
        var $html = $(html);

        _dom.inner.append($html);
        _update('bottom');

        return $html;
    };

    // Вставить содержимое перед элементом
    self.addBefore = function(html, elem, ignoreOrientation) {
        var $html = $(html),
            $elem = _dom.inner.find(elem),
            orientation;

        if (!$elem.length) return;

        if (!ignoreOrientation) {
            orientation = _getElemOrientation($elem);
            orientation = orientation === 'in' ? 'top' : orientation;
        }

        $elem.before($html);
        _update(orientation);

        return $html;
    };

    // Вставить содержимое после элемента
    self.addAfter = function(html, elem, ignoreOrientation) {
        var $html = $(html),
            $elem = _dom.inner.find(elem),
            orientation;

        if (!$elem.length) return;

        if (!ignoreOrientation) {
            orientation = _getElemOrientation($elem);
            orientation = orientation === 'in' ? 'bottom' : orientation;
        }

        $elem.after($html);
        _update(orientation);

        return $html;
    };

    _init();
    return self;
};