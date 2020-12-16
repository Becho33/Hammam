try {;
    (function($, window, document, undefined) {
        var drag, state, e;
        drag = {
            start: 0,
            startX: 0,
            startY: 0,
            current: 0,
            currentX: 0,
            currentY: 0,
            offsetX: 0,
            offsetY: 0,
            distance: null,
            startTime: 0,
            endTime: 0,
            updatedX: 0,
            targetEl: null
        };
        state = {
            isTouch: false,
            isScrolling: false,
            isSwiping: false,
            direction: false,
            inMotion: false
        };
        e = {
            _onDragStart: null,
            _onDragMove: null,
            _onDragEnd: null,
            _transitionEnd: null,
            _resizer: null,
            _responsiveCall: null,
            _goToLoop: null,
            _checkVisibile: null
        };

        function Owl(element, options) {
            this.settings = null;
            this.options = $.extend({}, Owl.Defaults, options);
            this.$element = $(element);
            this.drag = $.extend({}, drag);
            this.state = $.extend({}, state);
            this.e = $.extend({}, e);
            this._plugins = {};
            this._supress = {};
            this._current = null;
            this._speed = null;
            this._coordinates = [];
            this._breakpoint = null;
            this._width = null;
            this._items = [];
            this._clones = [];
            this._mergers = [];
            this._invalidated = {};
            this._pipe = [];
            $.each(Owl.Plugins, $.proxy(function(key, plugin) {
                this._plugins[key[0].toLowerCase() + key.slice(1)] = new plugin(this);
            }, this));
            $.each(Owl.Pipe, $.proxy(function(priority, worker) {
                this._pipe.push({
                    'filter': worker.filter,
                    'run': $.proxy(worker.run, this)
                });
            }, this));
            this.setup();
            this.initialize();
        }
        Owl.Defaults = {
            items: 3,
            loop: false,
            center: false,
            mouseDrag: true,
            touchDrag: true,
            pullDrag: true,
            freeDrag: false,
            margin: 0,
            stagePadding: 0,
            merge: false,
            mergeFit: true,
            autoWidth: false,
            startPosition: 0,
            rtl: false,
            smartSpeed: 250,
            fluidSpeed: false,
            dragEndSpeed: false,
            responsive: {},
            responsiveRefreshRate: 200,
            responsiveBaseElement: window,
            responsiveClass: false,
            fallbackEasing: 'swing',
            info: false,
            nestedItemSelector: false,
            itemElement: 'div',
            stageElement: 'div',
            themeClass: 'owl-theme',
            baseClass: 'owl-carousel',
            itemClass: 'owl-item',
            centerClass: 'center',
            activeClass: 'active'
        };
        Owl.Width = {
            Default: 'default',
            Inner: 'inner',
            Outer: 'outer'
        };
        Owl.Plugins = {};
        Owl.Pipe = [{
            filter: ['width', 'items', 'settings'],
            run: function(cache) {
                cache.current = this._items && this._items[this.relative(this._current)];
            }
        }, {
            filter: ['items', 'settings'],
            run: function() {
                var cached = this._clones,
                    clones = this.$stage.children('.cloned');
                if (clones.length !== cached.length || (!this.settings.loop && cached.length > 0)) {
                    this.$stage.children('.cloned').remove();
                    this._clones = [];
                }
            }
        }, {
            filter: ['items', 'settings'],
            run: function() {
                var i, n, clones = this._clones,
                    items = this._items,
                    delta = this.settings.loop ? clones.length - Math.max(this.settings.items * 2, 4) : 0;
                for (i = 0, n = Math.abs(delta / 2); i < n; i++) {
                    if (delta > 0) {
                        this.$stage.children().eq(items.length + clones.length - 1).remove();
                        clones.pop();
                        this.$stage.children().eq(0).remove();
                        clones.pop();
                    } else {
                        clones.push(clones.length / 2);
                        this.$stage.append(items[clones[clones.length - 1]].clone().addClass('cloned'));
                        clones.push(items.length - 1 - (clones.length - 1) / 2);
                        this.$stage.prepend(items[clones[clones.length - 1]].clone().addClass('cloned'));
                    }
                }
            }
        }, {
            filter: ['width', 'items', 'settings'],
            run: function() {
                var rtl = (this.settings.rtl ? 1 : -1),
                    width = (this.width() / this.settings.items).toFixed(3),
                    coordinate = 0,
                    merge, i, n;
                this._coordinates = [];
                for (i = 0, n = this._clones.length + this._items.length; i < n; i++) {
                    merge = this._mergers[this.relative(i)];
                    merge = (this.settings.mergeFit && Math.min(merge, this.settings.items)) || merge;
                    coordinate += (this.settings.autoWidth ? this._items[this.relative(i)].width() + this.settings.margin : width * merge) * rtl;
                    this._coordinates.push(coordinate);
                }
            }
        }, {
            filter: ['width', 'items', 'settings'],
            run: function() {
                var i, n, width = (this.width() / this.settings.items).toFixed(3),
                    css = {
                        'width': Math.abs(this._coordinates[this._coordinates.length - 1]) + this.settings.stagePadding * 2,
                        'padding-left': this.settings.stagePadding || '',
                        'padding-right': this.settings.stagePadding || ''
                    };
                this.$stage.css(css);
                css = {
                    'width': this.settings.autoWidth ? 'auto' : width - this.settings.margin
                };
                css[this.settings.rtl ? 'margin-left' : 'margin-right'] = this.settings.margin;
                if (!this.settings.autoWidth && $.grep(this._mergers, function(v) {
                        return v > 1
                    }).length > 0) {
                    for (i = 0, n = this._coordinates.length; i < n; i++) {
                        css.width = Math.abs(this._coordinates[i]) - Math.abs(this._coordinates[i - 1] || 0) - this.settings.margin;
                        this.$stage.children().eq(i).css(css);
                    }
                } else {
                    this.$stage.children().css(css);
                }
            }
        }, {
            filter: ['width', 'items', 'settings'],
            run: function(cache) {
                cache.current && this.reset(this.$stage.children().index(cache.current));
            }
        }, {
            filter: ['position'],
            run: function() {
                this.animate(this.coordinates(this._current));
            }
        }, {
            filter: ['width', 'position', 'items', 'settings'],
            run: function() {
                var rtl = this.settings.rtl ? 1 : -1,
                    padding = this.settings.stagePadding * 2,
                    begin = this.coordinates(this.current()) + padding,
                    end = begin + this.width() * rtl,
                    inner, outer, matches = [],
                    i, n;
                for (i = 0, n = this._coordinates.length; i < n; i++) {
                    inner = this._coordinates[i - 1] || 0;
                    outer = Math.abs(this._coordinates[i]) + padding * rtl;
                    if ((this.op(inner, '<=', begin) && (this.op(inner, '>', end))) || (this.op(outer, '<', begin) && this.op(outer, '>', end))) {
                        matches.push(i);
                    }
                }
                this.$stage.children('.' + this.settings.activeClass).removeClass(this.settings.activeClass);
                this.$stage.children(':eq(' + matches.join('), :eq(') + ')').addClass(this.settings.activeClass);
                if (this.settings.center) {
                    this.$stage.children('.' + this.settings.centerClass).removeClass(this.settings.centerClass);
                    this.$stage.children().eq(this.current()).addClass(this.settings.centerClass);
                }
            }
        }];
        Owl.prototype.initialize = function() {
            this.trigger('initialize');
            this.$element.addClass(this.settings.baseClass).addClass(this.settings.themeClass).toggleClass('owl-rtl', this.settings.rtl);
            this.browserSupport();
            if (this.settings.autoWidth && this.state.imagesLoaded !== true) {
                var imgs, nestedSelector, width;
                imgs = this.$element.find('img');
                nestedSelector = this.settings.nestedItemSelector ? '.' + this.settings.nestedItemSelector : undefined;
                width = this.$element.children(nestedSelector).width();
                if (imgs.length && width <= 0) {
                    this.preloadAutoWidthImages(imgs);
                    return false;
                }
            }
            this.$element.addClass('owl-loading');
            this.$stage = $('<' + this.settings.stageElement + ' class="owl-stage"/>').wrap('<div class="owl-stage-outer">');
            this.$element.append(this.$stage.parent());
            this.replace(this.$element.children().not(this.$stage.parent()));
            this._width = this.$element.width();
            this.refresh();
            this.$element.removeClass('owl-loading').addClass('owl-loaded');
            this.eventsCall();
            this.internalEvents();
            this.addTriggerableEvents();
            this.trigger('initialized');
        };
        Owl.prototype.setup = function() {
            var viewport = this.viewport(),
                overwrites = this.options.responsive,
                match = -1,
                settings = null;
            if (!overwrites) {
                settings = $.extend({}, this.options);
            } else {
                $.each(overwrites, function(breakpoint) {
                    if (breakpoint <= viewport && breakpoint > match) {
                        match = Number(breakpoint);
                    }
                });
                settings = $.extend({}, this.options, overwrites[match]);
                delete settings.responsive;
                if (settings.responsiveClass) {
                    this.$element.attr('class', function(i, c) {
                        return c.replace(/\b owl-responsive-\S+/g, '');
                    }).addClass('owl-responsive-' + match);
                }
            }
            if (this.settings === null || this._breakpoint !== match) {
                this.trigger('change', {
                    property: {
                        name: 'settings',
                        value: settings
                    }
                });
                this._breakpoint = match;
                this.settings = settings;
                this.invalidate('settings');
                this.trigger('changed', {
                    property: {
                        name: 'settings',
                        value: this.settings
                    }
                });
            }
        };
        Owl.prototype.optionsLogic = function() {
            this.$element.toggleClass('owl-center', this.settings.center);
            if (this.settings.loop && this._items.length < this.settings.items) {
                this.settings.loop = false;
            }
            if (this.settings.autoWidth) {
                this.settings.stagePadding = false;
                this.settings.merge = false;
            }
        };
        Owl.prototype.prepare = function(item) {
            var event = this.trigger('prepare', {
                content: item
            });
            if (!event.data) {
                event.data = $('<' + this.settings.itemElement + '/>').addClass(this.settings.itemClass).append(item)
            }
            this.trigger('prepared', {
                content: event.data
            });
            return event.data;
        };
        Owl.prototype.update = function() {
            var i = 0,
                n = this._pipe.length,
                filter = $.proxy(function(p) {
                    return this[p]
                }, this._invalidated),
                cache = {};
            while (i < n) {
                if (this._invalidated.all || $.grep(this._pipe[i].filter, filter).length > 0) {
                    this._pipe[i].run(cache);
                }
                i++;
            }
            this._invalidated = {};
        };
        Owl.prototype.width = function(dimension) {
            dimension = dimension || Owl.Width.Default;
            switch (dimension) {
                case Owl.Width.Inner:
                case Owl.Width.Outer:
                    return this._width;
                default:
                    return this._width - this.settings.stagePadding * 2 + this.settings.margin;
            }
        };
        Owl.prototype.refresh = function() {
            if (this._items.length === 0) {
                return false;
            }
            var start = new Date().getTime();
            this.trigger('refresh');
            this.setup();
            this.optionsLogic();
            this.$stage.addClass('owl-refresh');
            this.update();
            this.$stage.removeClass('owl-refresh');
            this.state.orientation = window.orientation;
            this.watchVisibility();
            this.trigger('refreshed');
        };
        Owl.prototype.eventsCall = function() {
            this.e._onDragStart = $.proxy(function(e) {
                this.onDragStart(e);
            }, this);
            this.e._onDragMove = $.proxy(function(e) {
                this.onDragMove(e);
            }, this);
            this.e._onDragEnd = $.proxy(function(e) {
                this.onDragEnd(e);
            }, this);
            this.e._onResize = $.proxy(function(e) {
                this.onResize(e);
            }, this);
            this.e._transitionEnd = $.proxy(function(e) {
                this.transitionEnd(e);
            }, this);
            this.e._preventClick = $.proxy(function(e) {
                this.preventClick(e);
            }, this);
        };
        Owl.prototype.onThrottledResize = function() {
            window.clearTimeout(this.resizeTimer);
            this.resizeTimer = window.setTimeout(this.e._onResize, this.settings.responsiveRefreshRate);
        };
        Owl.prototype.onResize = function() {
            if (!this._items.length) {
                return false;
            }
            if (this._width === this.$element.width()) {
                return false;
            }
            if (this.trigger('resize').isDefaultPrevented()) {
                return false;
            }
            this._width = this.$element.width();
            this.invalidate('width');
            this.refresh();
            this.trigger('resized');
        };
        Owl.prototype.eventsRouter = function(event) {
            var type = event.type;
            if (type === "mousedown" || type === "touchstart") {
                this.onDragStart(event);
            } else if (type === "mousemove" || type === "touchmove") {
                this.onDragMove(event);
            } else if (type === "mouseup" || type === "touchend") {
                this.onDragEnd(event);
            } else if (type === "touchcancel") {
                this.onDragEnd(event);
            }
        };
        Owl.prototype.internalEvents = function() {
            var isTouch = isTouchSupport(),
                isTouchIE = isTouchSupportIE();
            if (this.settings.mouseDrag) {
                this.$stage.on('mousedown', $.proxy(function(event) {
                    this.eventsRouter(event)
                }, this));
                this.$stage.on('dragstart', function() {
                    return false
                });
                this.$stage.get(0).onselectstart = function() {
                    return false
                };
            } else {
                this.$element.addClass('owl-text-select-on');
            }
            if (this.settings.touchDrag && !isTouchIE) {
                this.$stage.on('touchstart touchcancel', $.proxy(function(event) {
                    this.eventsRouter(event)
                }, this));
            }
            if (this.transitionEndVendor) {
                this.on(this.$stage.get(0), this.transitionEndVendor, this.e._transitionEnd, false);
            }
            if (this.settings.responsive !== false) {
                this.on(window, 'resize', $.proxy(this.onThrottledResize, this));
            }
        };
        Owl.prototype.onDragStart = function(event) {
            var ev, isTouchEvent, pageX, pageY, animatedPos;
            ev = event.originalEvent || event || window.event;
            if (ev.which === 3 || this.state.isTouch) {
                return false;
            }
            if (ev.type === 'mousedown') {
                this.$stage.addClass('owl-grab');
            }
            this.trigger('drag');
            this.drag.startTime = new Date().getTime();
            this.speed(0);
            this.state.isTouch = true;
            this.state.isScrolling = false;
            this.state.isSwiping = false;
            this.drag.distance = 0;
            pageX = getTouches(ev).x;
            pageY = getTouches(ev).y;
            this.drag.offsetX = this.$stage.position().left;
            this.drag.offsetY = this.$stage.position().top;
            if (this.settings.rtl) {
                this.drag.offsetX = this.$stage.position().left + this.$stage.width() - this.width() +
                    this.settings.margin;
            }
            if (this.state.inMotion && this.support3d) {
                animatedPos = this.getTransformProperty();
                this.drag.offsetX = animatedPos;
                this.animate(animatedPos);
                this.state.inMotion = true;
            } else if (this.state.inMotion && !this.support3d) {
                this.state.inMotion = false;
                return false;
            }
            this.drag.startX = pageX - this.drag.offsetX;
            this.drag.startY = pageY - this.drag.offsetY;
            this.drag.start = pageX - this.drag.startX;
            this.drag.targetEl = ev.target || ev.srcElement;
            this.drag.updatedX = this.drag.start;
            if (this.drag.targetEl.tagName === "IMG" || this.drag.targetEl.tagName === "A") {
                this.drag.targetEl.draggable = false;
            }
            $(document).on('mousemove.owl.dragEvents mouseup.owl.dragEvents touchmove.owl.dragEvents touchend.owl.dragEvents', $.proxy(function(event) {
                this.eventsRouter(event)
            }, this));
        };
        Owl.prototype.onDragMove = function(event) {
            var ev, isTouchEvent, pageX, pageY, minValue, maxValue, pull;
            if (!this.state.isTouch) {
                return;
            }
            if (this.state.isScrolling) {
                return;
            }
            ev = event.originalEvent || event || window.event;
            pageX = getTouches(ev).x;
            pageY = getTouches(ev).y;
            this.drag.currentX = pageX - this.drag.startX;
            this.drag.currentY = pageY - this.drag.startY;
            this.drag.distance = this.drag.currentX - this.drag.offsetX;
            if (this.drag.distance < 0) {
                this.state.direction = this.settings.rtl ? 'right' : 'left';
            } else if (this.drag.distance > 0) {
                this.state.direction = this.settings.rtl ? 'left' : 'right';
            }
            if (this.settings.loop) {
                if (this.op(this.drag.currentX, '>', this.coordinates(this.minimum())) && this.state.direction === 'right') {
                    this.drag.currentX -= (this.settings.center && this.coordinates(0)) - this.coordinates(this._items.length);
                } else if (this.op(this.drag.currentX, '<', this.coordinates(this.maximum())) && this.state.direction === 'left') {
                    this.drag.currentX += (this.settings.center && this.coordinates(0)) - this.coordinates(this._items.length);
                }
            } else {
                minValue = this.settings.rtl ? this.coordinates(this.maximum()) : this.coordinates(this.minimum());
                maxValue = this.settings.rtl ? this.coordinates(this.minimum()) : this.coordinates(this.maximum());
                pull = this.settings.pullDrag ? this.drag.distance / 5 : 0;
                this.drag.currentX = Math.max(Math.min(this.drag.currentX, minValue + pull), maxValue + pull);
            }
            if ((this.drag.distance > 8 || this.drag.distance < -8)) {
                if (ev.preventDefault !== undefined) {
                    ev.preventDefault();
                } else {
                    ev.returnValue = false;
                }
                this.state.isSwiping = true;
            }
            this.drag.updatedX = this.drag.currentX;
            if ((this.drag.currentY > 16 || this.drag.currentY < -16) && this.state.isSwiping === false) {
                this.state.isScrolling = true;
                this.drag.updatedX = this.drag.start;
            }
            this.animate(this.drag.updatedX);
        };
        Owl.prototype.onDragEnd = function(event) {
            var compareTimes, distanceAbs, closest;
            if (!this.state.isTouch) {
                return;
            }
            if (event.type === 'mouseup') {
                this.$stage.removeClass('owl-grab');
            }
            this.trigger('dragged');
            this.drag.targetEl.removeAttribute("draggable");
            this.state.isTouch = false;
            this.state.isScrolling = false;
            this.state.isSwiping = false;
            if (this.drag.distance === 0 && this.state.inMotion !== true) {
                this.state.inMotion = false;
                return false;
            }
            this.drag.endTime = new Date().getTime();
            compareTimes = this.drag.endTime - this.drag.startTime;
            distanceAbs = Math.abs(this.drag.distance);
            if (distanceAbs > 3 || compareTimes > 300) {
                this.removeClick(this.drag.targetEl);
            }
            closest = this.closest(this.drag.updatedX);
            this.speed(this.settings.dragEndSpeed || this.settings.smartSpeed);
            this.current(closest);
            this.invalidate('position');
            this.update();
            if (!this.settings.pullDrag && this.drag.updatedX === this.coordinates(closest)) {
                this.transitionEnd();
            }
            this.drag.distance = 0;
            $(document).off('.owl.dragEvents');
        };
        Owl.prototype.removeClick = function(target) {
            this.drag.targetEl = target;
            $(target).on('click.preventClick', this.e._preventClick);
            window.setTimeout(function() {
                $(target).off('click.preventClick');
            }, 300);
        };
        Owl.prototype.preventClick = function(ev) {
            if (ev.preventDefault) {
                ev.preventDefault();
            } else {
                ev.returnValue = false;
            }
            if (ev.stopPropagation) {
                ev.stopPropagation();
            }
            $(ev.target).off('click.preventClick');
        };
        Owl.prototype.getTransformProperty = function() {
            var transform, matrix3d;
            transform = window.getComputedStyle(this.$stage.get(0), null).getPropertyValue(this.vendorName + 'transform');
            transform = transform.replace(/matrix(3d)?\(|\)/g, '').split(',');
            matrix3d = transform.length === 16;
            return matrix3d !== true ? transform[4] : transform[12];
        };
        Owl.prototype.closest = function(coordinate) {
            var position = -1,
                pull = 30,
                width = this.width(),
                coordinates = this.coordinates();
            if (!this.settings.freeDrag) {
                $.each(coordinates, $.proxy(function(index, value) {
                    if (coordinate > value - pull && coordinate < value + pull) {
                        position = index;
                    } else if (this.op(coordinate, '<', value) && this.op(coordinate, '>', coordinates[index + 1] || value - width)) {
                        position = this.state.direction === 'left' ? index + 1 : index;
                    }
                    return position === -1;
                }, this));
            }
            if (!this.settings.loop) {
                if (this.op(coordinate, '>', coordinates[this.minimum()])) {
                    position = coordinate = this.minimum();
                } else if (this.op(coordinate, '<', coordinates[this.maximum()])) {
                    position = coordinate = this.maximum();
                }
            }
            return position;
        };
        Owl.prototype.animate = function(coordinate) {
            this.trigger('translate');
            this.state.inMotion = this.speed() > 0;
            if (this.support3d) {
                this.$stage.css({
                    transform: 'translate3d(' + coordinate + 'px' + ',0px, 0px)',
                    transition: (this.speed() / 1000) + 's'
                });
            } else if (this.state.isTouch) {
                this.$stage.css({
                    left: coordinate + 'px'
                });
            } else {
                this.$stage.animate({
                    left: coordinate
                }, this.speed() / 1000, this.settings.fallbackEasing, $.proxy(function() {
                    if (this.state.inMotion) {
                        this.transitionEnd();
                    }
                }, this));
            }
        };
        Owl.prototype.current = function(position) {
            if (position === undefined) {
                return this._current;
            }
            if (this._items.length === 0) {
                return undefined;
            }
            position = this.normalize(position);
            if (this._current !== position) {
                var event = this.trigger('change', {
                    property: {
                        name: 'position',
                        value: position
                    }
                });
                if (event.data !== undefined) {
                    position = this.normalize(event.data);
                }
                this._current = position;
                this.invalidate('position');
                this.trigger('changed', {
                    property: {
                        name: 'position',
                        value: this._current
                    }
                });
            }
            return this._current;
        };
        Owl.prototype.invalidate = function(part) {
            this._invalidated[part] = true;
        }
        Owl.prototype.reset = function(position) {
            position = this.normalize(position);
            if (position === undefined) {
                return;
            }
            this._speed = 0;
            this._current = position;
            this.suppress(['translate', 'translated']);
            this.animate(this.coordinates(position));
            this.release(['translate', 'translated']);
        };
        Owl.prototype.normalize = function(position, relative) {
            var n = (relative ? this._items.length : this._items.length + this._clones.length);
            if (!$.isNumeric(position) || n < 1) {
                return undefined;
            }
            if (this._clones.length) {
                position = ((position % n) + n) % n;
            } else {
                position = Math.max(this.minimum(relative), Math.min(this.maximum(relative), position));
            }
            return position;
        };
        Owl.prototype.relative = function(position) {
            position = this.normalize(position);
            position = position - this._clones.length / 2;
            return this.normalize(position, true);
        };
        Owl.prototype.maximum = function(relative) {
            var maximum, width, i = 0,
                coordinate, settings = this.settings;
            if (relative) {
                return this._items.length - 1;
            }
            if (!settings.loop && settings.center) {
                maximum = this._items.length - 1;
            } else if (!settings.loop && !settings.center) {
                maximum = this._items.length - settings.items;
            } else if (settings.loop || settings.center) {
                maximum = this._items.length + settings.items;
            } else if (settings.autoWidth || settings.merge) {
                revert = settings.rtl ? 1 : -1;
                width = this.$stage.width() - this.$element.width();
                while (coordinate = this.coordinates(i)) {
                    if (coordinate * revert >= width) {
                        break;
                    }
                    maximum = ++i;
                }
            } else {
                throw 'Can not detect maximum absolute position.'
            }
            return maximum;
        };
        Owl.prototype.minimum = function(relative) {
            if (relative) {
                return 0;
            }
            return this._clones.length / 2;
        };
        Owl.prototype.items = function(position) {
            if (position === undefined) {
                return this._items.slice();
            }
            position = this.normalize(position, true);
            return this._items[position];
        };
        Owl.prototype.mergers = function(position) {
            if (position === undefined) {
                return this._mergers.slice();
            }
            position = this.normalize(position, true);
            return this._mergers[position];
        };
        Owl.prototype.clones = function(position) {
            var odd = this._clones.length / 2,
                even = odd + this._items.length,
                map = function(index) {
                    return index % 2 === 0 ? even + index / 2 : odd - (index + 1) / 2
                };
            if (position === undefined) {
                return $.map(this._clones, function(v, i) {
                    return map(i)
                });
            }
            return $.map(this._clones, function(v, i) {
                return v === position ? map(i) : null
            });
        };
        Owl.prototype.speed = function(speed) {
            if (speed !== undefined) {
                this._speed = speed;
            }
            return this._speed;
        };
        Owl.prototype.coordinates = function(position) {
            var coordinate = null;
            if (position === undefined) {
                return $.map(this._coordinates, $.proxy(function(coordinate, index) {
                    return this.coordinates(index);
                }, this));
            }
            if (this.settings.center) {
                coordinate = this._coordinates[position];
                coordinate += (this.width() - coordinate + (this._coordinates[position - 1] || 0)) / 2 * (this.settings.rtl ? -1 : 1);
            } else {
                coordinate = this._coordinates[position - 1] || 0;
            }
            return coordinate;
        };
        Owl.prototype.duration = function(from, to, factor) {
            return Math.min(Math.max(Math.abs(to - from), 1), 6) * Math.abs((factor || this.settings.smartSpeed));
        };
        Owl.prototype.to = function(position, speed) {
            if (this.settings.loop) {
                var distance = position - this.relative(this.current()),
                    revert = this.current(),
                    before = this.current(),
                    after = this.current() + distance,
                    direction = before - after < 0 ? true : false,
                    items = this._clones.length + this._items.length;
                if (after < this.settings.items && direction === false) {
                    revert = before + this._items.length;
                    this.reset(revert);
                } else if (after >= items - this.settings.items && direction === true) {
                    revert = before - this._items.length;
                    this.reset(revert);
                }
                window.clearTimeout(this.e._goToLoop);
                this.e._goToLoop = window.setTimeout($.proxy(function() {
                    this.speed(this.duration(this.current(), revert + distance, speed));
                    this.current(revert + distance);
                    this.update();
                }, this), 30);
            } else {
                this.speed(this.duration(this.current(), position, speed));
                this.current(position);
                this.update();
            }
        };
        Owl.prototype.next = function(speed) {
            speed = speed || false;
            this.to(this.relative(this.current()) + 1, speed);
        };
        Owl.prototype.prev = function(speed) {
            speed = speed || false;
            this.to(this.relative(this.current()) - 1, speed);
        };
        Owl.prototype.transitionEnd = function(event) {
            if (event !== undefined) {
                event.stopPropagation();
                if ((event.target || event.srcElement || event.originalTarget) !== this.$stage.get(0)) {
                    return false;
                }
            }
            this.state.inMotion = false;
            this.trigger('translated');
        };
        Owl.prototype.viewport = function() {
            var width;
            if (this.options.responsiveBaseElement !== window) {
                width = $(this.options.responsiveBaseElement).width();
            } else if (window.innerWidth) {
                width = window.innerWidth;
            } else if (document.documentElement && document.documentElement.clientWidth) {
                width = document.documentElement.clientWidth;
            } else {
                throw 'Can not detect viewport width.';
            }
            return width;
        };
        Owl.prototype.replace = function(content) {
            this.$stage.empty();
            this._items = [];
            if (content) {
                content = (content instanceof jQuery) ? content : $(content);
            }
            if (this.settings.nestedItemSelector) {
                content = content.find('.' + this.settings.nestedItemSelector);
            }
            content.filter(function() {
                return this.nodeType === 1;
            }).each($.proxy(function(index, item) {
                item = this.prepare(item);
                this.$stage.append(item);
                this._items.push(item);
                this._mergers.push(item.find('[data-merge]').andSelf('[data-merge]').attr('data-merge') * 1 || 1);
            }, this));
            this.reset($.isNumeric(this.settings.startPosition) ? this.settings.startPosition : 0);
            this.invalidate('items');
        };
        Owl.prototype.add = function(content, position) {
            position = position === undefined ? this._items.length : this.normalize(position, true);
            this.trigger('add', {
                content: content,
                position: position
            });
            if (this._items.length === 0 || position === this._items.length) {
                this.$stage.append(content);
                this._items.push(content);
                this._mergers.push(content.find('[data-merge]').andSelf('[data-merge]').attr('data-merge') * 1 || 1);
            } else {
                this._items[position].before(content);
                this._items.splice(position, 0, content);
                this._mergers.splice(position, 0, content.find('[data-merge]').andSelf('[data-merge]').attr('data-merge') * 1 || 1);
            }
            this.invalidate('items');
            this.trigger('added', {
                content: content,
                position: position
            });
        };
        Owl.prototype.remove = function(position) {
            position = this.normalize(position, true);
            if (position === undefined) {
                return;
            }
            this.trigger('remove', {
                content: this._items[position],
                position: position
            });
            this._items[position].remove();
            this._items.splice(position, 1);
            this._mergers.splice(position, 1);
            this.invalidate('items');
            this.trigger('removed', {
                content: null,
                position: position
            });
        };
        Owl.prototype.addTriggerableEvents = function() {
            var handler = $.proxy(function(callback, event) {
                return $.proxy(function(e) {
                    if (e.relatedTarget !== this) {
                        this.suppress([event]);
                        callback.apply(this, [].slice.call(arguments, 1));
                        this.release([event]);
                    }
                }, this);
            }, this);
            $.each({
                'next': this.next,
                'prev': this.prev,
                'to': this.to,
                'destroy': this.destroy,
                'refresh': this.refresh,
                'replace': this.replace,
                'add': this.add,
                'remove': this.remove
            }, $.proxy(function(event, callback) {
                this.$element.on(event + '.owl.carousel', handler(callback, event + '.owl.carousel'));
            }, this));
        };
        Owl.prototype.watchVisibility = function() {
            if (!isElVisible(this.$element.get(0))) {
                this.$element.addClass('owl-hidden');
                window.clearInterval(this.e._checkVisibile);
                this.e._checkVisibile = window.setInterval($.proxy(checkVisible, this), 500);
            }

            function isElVisible(el) {
                return el.offsetWidth > 0 && el.offsetHeight > 0;
            }

            function checkVisible() {
                if (isElVisible(this.$element.get(0))) {
                    this.$element.removeClass('owl-hidden');
                    this.refresh();
                    window.clearInterval(this.e._checkVisibile);
                }
            }
        };
        Owl.prototype.preloadAutoWidthImages = function(imgs) {
            var loaded, that, $el, img;
            loaded = 0;
            that = this;
            imgs.each(function(i, el) {
                $el = $(el);
                img = new Image();
                img.onload = function() {
                    loaded++;
                    $el.attr('src', img.src);
                    $el.css('opacity', 1);
                    if (loaded >= imgs.length) {
                        that.state.imagesLoaded = true;
                        that.initialize();
                    }
                };
                img.src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-src-retina');
            });
        };
        Owl.prototype.destroy = function() {
            if (this.$element.hasClass(this.settings.themeClass)) {
                this.$element.removeClass(this.settings.themeClass);
            }
            if (this.settings.responsive !== false) {
                $(window).off('resize.owl.carousel');
            }
            if (this.transitionEndVendor) {
                this.off(this.$stage.get(0), this.transitionEndVendor, this.e._transitionEnd);
            }
            for (var i in this._plugins) {
                this._plugins[i].destroy();
            }
            if (this.settings.mouseDrag || this.settings.touchDrag) {
                this.$stage.off('mousedown touchstart touchcancel');
                $(document).off('.owl.dragEvents');
                this.$stage.get(0).onselectstart = function() {};
                this.$stage.off('dragstart', function() {
                    return false
                });
            }
            this.$element.off('.owl');
            this.$stage.children('.cloned').remove();
            this.e = null;
            this.$element.removeData('owlCarousel');
            this.$stage.children().contents().unwrap();
            this.$stage.children().unwrap();
            this.$stage.unwrap();
        };
        Owl.prototype.op = function(a, o, b) {
            var rtl = this.settings.rtl;
            switch (o) {
                case '<':
                    return rtl ? a > b : a < b;
                case '>':
                    return rtl ? a < b : a > b;
                case '>=':
                    return rtl ? a <= b : a >= b;
                case '<=':
                    return rtl ? a >= b : a <= b;
                default:
                    break;
            }
        };
        Owl.prototype.on = function(element, event, listener, capture) {
            if (element.addEventListener) {
                element.addEventListener(event, listener, capture);
            } else if (element.attachEvent) {
                element.attachEvent('on' + event, listener);
            }
        };
        Owl.prototype.off = function(element, event, listener, capture) {
            if (element.removeEventListener) {
                element.removeEventListener(event, listener, capture);
            } else if (element.detachEvent) {
                element.detachEvent('on' + event, listener);
            }
        };
        Owl.prototype.trigger = function(name, data, namespace) {
            var status = {
                    item: {
                        count: this._items.length,
                        index: this.current()
                    }
                },
                handler = $.camelCase($.grep(['on', name, namespace], function(v) {
                    return v
                }).join('-').toLowerCase()),
                event = $.Event([name, 'owl', namespace || 'carousel'].join('.').toLowerCase(), $.extend({
                    relatedTarget: this
                }, status, data));
            if (!this._supress[name]) {
                $.each(this._plugins, function(name, plugin) {
                    if (plugin.onTrigger) {
                        plugin.onTrigger(event);
                    }
                });
                this.$element.trigger(event);
                if (this.settings && typeof this.settings[handler] === 'function') {
                    this.settings[handler].apply(this, event);
                }
            }
            return event;
        };
        Owl.prototype.suppress = function(events) {
            $.each(events, $.proxy(function(index, event) {
                this._supress[event] = true;
            }, this));
        }
        Owl.prototype.release = function(events) {
            $.each(events, $.proxy(function(index, event) {
                delete this._supress[event];
            }, this));
        }
        Owl.prototype.browserSupport = function() {
            this.support3d = isPerspective();
            if (this.support3d) {
                this.transformVendor = isTransform();
                var endVendors = ['transitionend', 'webkitTransitionEnd', 'transitionend', 'oTransitionEnd'];
                this.transitionEndVendor = endVendors[isTransition()];
                this.vendorName = this.transformVendor.replace(/Transform/i, '');
                this.vendorName = this.vendorName !== '' ? '-' + this.vendorName.toLowerCase() + '-' : '';
            }
            this.state.orientation = window.orientation;
        };

        function getTouches(event) {
            if (event.touches !== undefined) {
                return {
                    x: event.touches[0].pageX,
                    y: event.touches[0].pageY
                };
            }
            if (event.touches === undefined) {
                if (event.pageX !== undefined) {
                    return {
                        x: event.pageX,
                        y: event.pageY
                    };
                }
                if (event.pageX === undefined) {
                    return {
                        x: event.clientX,
                        y: event.clientY
                    };
                }
            }
        }

        function isStyleSupported(array) {
            var p, s, fake = document.createElement('div'),
                list = array;
            for (p in list) {
                s = list[p];
                if (typeof fake.style[s] !== 'undefined') {
                    fake = null;
                    return [s, p];
                }
            }
            return [false];
        }

        function isTransition() {
            return isStyleSupported(['transition', 'WebkitTransition', 'MozTransition', 'OTransition'])[1];
        }

        function isTransform() {
            return isStyleSupported(['transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform'])[0];
        }

        function isPerspective() {
            return isStyleSupported(['perspective', 'webkitPerspective', 'MozPerspective', 'OPerspective', 'MsPerspective'])[0];
        }

        function isTouchSupport() {
            return 'ontouchstart' in window || !!(navigator.msMaxTouchPoints);
        }

        function isTouchSupportIE() {
            return window.navigator.msPointerEnabled;
        }
        $.fn.owlCarousel = function(options) {
            return this.each(function() {
                if (!$(this).data('owlCarousel')) {
                    $(this).data('owlCarousel', new Owl(this, options));
                }
            });
        };
        $.fn.owlCarousel.Constructor = Owl;
    })(window.Zepto || window.jQuery, window, document);;
    (function($, window, document, undefined) {
        var Lazy = function(carousel) {
            this._core = carousel;
            this._loaded = [];
            this._handlers = {
                'initialized.owl.carousel change.owl.carousel': $.proxy(function(e) {
                    if (!e.namespace) {
                        return;
                    }
                    if (!this._core.settings || !this._core.settings.lazyLoad) {
                        return;
                    }
                    if ((e.property && e.property.name == 'position') || e.type == 'initialized') {
                        var settings = this._core.settings,
                            n = (settings.center && Math.ceil(settings.items / 2) || settings.items),
                            i = ((settings.center && n * -1) || 0),
                            position = ((e.property && e.property.value) || this._core.current()) + i,
                            clones = this._core.clones().length,
                            load = $.proxy(function(i, v) {
                                this.load(v)
                            }, this);
                        while (i++ < n) {
                            this.load(clones / 2 + this._core.relative(position));
                            clones && $.each(this._core.clones(this._core.relative(position++)), load);
                        }
                    }
                }, this)
            };
            this._core.options = $.extend({}, Lazy.Defaults, this._core.options);
            this._core.$element.on(this._handlers);
        }
        Lazy.Defaults = {
            lazyLoad: false
        }
        Lazy.prototype.load = function(position) {
            var $item = this._core.$stage.children().eq(position),
                $elements = $item && $item.find('.owl-lazy');
            if (!$elements || $.inArray($item.get(0), this._loaded) > -1) {
                return;
            }
            $elements.each($.proxy(function(index, element) {
                var $element = $(element),
                    image, url = (window.devicePixelRatio > 1 && $element.attr('data-src-retina')) || $element.attr('data-src');
                this._core.trigger('load', {
                    element: $element,
                    url: url
                }, 'lazy');
                if ($element.is('img')) {
                    $element.one('load.owl.lazy', $.proxy(function() {
                        $element.css('opacity', 1);
                        this._core.trigger('loaded', {
                            element: $element,
                            url: url
                        }, 'lazy');
                    }, this)).attr('src', url);
                } else {
                    image = new Image();
                    image.onload = $.proxy(function() {
                        $element.css({
                            'background-image': 'url(' + url + ')',
                            'opacity': '1'
                        });
                        this._core.trigger('loaded', {
                            element: $element,
                            url: url
                        }, 'lazy');
                    }, this);
                    image.src = url;
                }
            }, this));
            this._loaded.push($item.get(0));
        }
        Lazy.prototype.destroy = function() {
            var handler, property;
            for (handler in this.handlers) {
                this._core.$element.off(handler, this.handlers[handler]);
            }
            for (property in Object.getOwnPropertyNames(this)) {
                typeof this[property] != 'function' && (this[property] = null);
            }
        }
        $.fn.owlCarousel.Constructor.Plugins.Lazy = Lazy;
    })(window.Zepto || window.jQuery, window, document);;
    (function($, window, document, undefined) {
        var AutoHeight = function(carousel) {
            this._core = carousel;
            this._handlers = {
                'initialized.owl.carousel': $.proxy(function() {
                    if (this._core.settings.autoHeight) {
                        this.update();
                    }
                }, this),
                'changed.owl.carousel': $.proxy(function(e) {
                    if (this._core.settings.autoHeight && e.property.name == 'position') {
                        this.update();
                    }
                }, this),
                'loaded.owl.lazy': $.proxy(function(e) {
                    if (this._core.settings.autoHeight && e.element.closest('.' + this._core.settings.itemClass) === this._core.$stage.children().eq(this._core.current())) {
                        this.update();
                    }
                }, this)
            };
            this._core.options = $.extend({}, AutoHeight.Defaults, this._core.options);
            this._core.$element.on(this._handlers);
        };
        AutoHeight.Defaults = {
            autoHeight: false,
            autoHeightClass: 'owl-height'
        };
        AutoHeight.prototype.update = function() {
            this._core.$stage.parent().height(this._core.$stage.children().eq(this._core.current()).height()).addClass(this._core.settings.autoHeightClass);
        };
        AutoHeight.prototype.destroy = function() {
            var handler, property;
            for (handler in this._handlers) {
                this._core.$element.off(handler, this._handlers[handler]);
            }
            for (property in Object.getOwnPropertyNames(this)) {
                typeof this[property] != 'function' && (this[property] = null);
            }
        };
        $.fn.owlCarousel.Constructor.Plugins.AutoHeight = AutoHeight;
    })(window.Zepto || window.jQuery, window, document);;
    (function($, window, document, undefined) {
        var Video = function(carousel) {
            this._core = carousel;
            this._videos = {};
            this._playing = null;
            this._fullscreen = false;
            this._handlers = {
                'resize.owl.carousel': $.proxy(function(e) {
                    if (this._core.settings.video && !this.isInFullScreen()) {
                        e.preventDefault();
                    }
                }, this),
                'refresh.owl.carousel changed.owl.carousel': $.proxy(function(e) {
                    if (this._playing) {
                        this.stop();
                    }
                }, this),
                'prepared.owl.carousel': $.proxy(function(e) {
                    var $element = $(e.content).find('.owl-video');
                    if ($element.length) {
                        $element.css('display', 'none');
                        this.fetch($element, $(e.content));
                    }
                }, this)
            };
            this._core.options = $.extend({}, Video.Defaults, this._core.options);
            this._core.$element.on(this._handlers);
            this._core.$element.on('click.owl.video', '.owl-video-play-icon', $.proxy(function(e) {
                this.play(e);
            }, this));
        };
        Video.Defaults = {
            video: false,
            videoHeight: false,
            videoWidth: false
        };
        Video.prototype.fetch = function(target, item) {
            var type = target.attr('data-vimeo-id') ? 'vimeo' : 'youtube',
                id = target.attr('data-vimeo-id') || target.attr('data-youtube-id'),
                width = target.attr('data-width') || this._core.settings.videoWidth,
                height = target.attr('data-height') || this._core.settings.videoHeight,
                url = target.attr('href');
            if (url) {
                id = url.match(/(http:|https:|)\/\/(player.|www.)?(vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com))\/(video\/|embed\/|watch\?v=|v\/)?([A-Za-z0-9._%-]*)(\&\S+)?/);
                if (id[3].indexOf('youtu') > -1) {
                    type = 'youtube';
                } else if (id[3].indexOf('vimeo') > -1) {
                    type = 'vimeo';
                } else {
                    throw new Error('Video URL not supported.');
                }
                id = id[6];
            } else {
                throw new Error('Missing video URL.');
            }
            this._videos[url] = {
                type: type,
                id: id,
                width: width,
                height: height
            };
            item.attr('data-video', url);
            this.thumbnail(target, this._videos[url]);
        };
        Video.prototype.thumbnail = function(target, video) {
            var tnLink, icon, path, dimensions = video.width && video.height ? 'style="width:' + video.width + 'px;height:' + video.height + 'px;"' : '',
                customTn = target.find('img'),
                srcType = 'src',
                lazyClass = '',
                settings = this._core.settings,
                create = function(path) {
                    icon = '<div class="owl-video-play-icon"></div>';
                    if (settings.lazyLoad) {
                        tnLink = '<div class="owl-video-tn ' + lazyClass + '" ' + srcType + '="' + path + '"></div>';
                    } else {
                        tnLink = '<div class="owl-video-tn" style="opacity:1;background-image:url(' + path + ')"></div>';
                    }
                    target.after(tnLink);
                    target.after(icon);
                };
            target.wrap('<div class="owl-video-wrapper"' + dimensions + '></div>');
            if (this._core.settings.lazyLoad) {
                srcType = 'data-src';
                lazyClass = 'owl-lazy';
            }
            if (customTn.length) {
                create(customTn.attr(srcType));
                customTn.remove();
                return false;
            }
            if (video.type === 'youtube') {
                path = "http://img.youtube.com/vi/" + video.id + "/hqdefault.jpg";
                create(path);
            } else if (video.type === 'vimeo') {
                $.ajax({
                    type: 'GET',
                    url: 'http://vimeo.com/api/v2/video/' + video.id + '.json',
                    jsonp: 'callback',
                    dataType: 'jsonp',
                    success: function(data) {
                        path = data[0].thumbnail_large;
                        create(path);
                    }
                });
            }
        };
        Video.prototype.stop = function() {
            this._core.trigger('stop', null, 'video');
            this._playing.find('.owl-video-frame').remove();
            this._playing.removeClass('owl-video-playing');
            this._playing = null;
        };
        Video.prototype.play = function(ev) {
            this._core.trigger('play', null, 'video');
            if (this._playing) {
                this.stop();
            }
            var target = $(ev.target || ev.srcElement),
                item = target.closest('.' + this._core.settings.itemClass),
                video = this._videos[item.attr('data-video')],
                width = video.width || '100%',
                height = video.height || this._core.$stage.height(),
                html, wrap;
            if (video.type === 'youtube') {
                html = '<iframe width="' + width + '" height="' + height + '" src="http://www.youtube.com/embed/' +
                    video.id + '?autoplay=1&v=' + video.id + '" frameborder="0" allowfullscreen></iframe>';
            } else if (video.type === 'vimeo') {
                html = '<iframe src="http://player.vimeo.com/video/' + video.id + '?autoplay=1" width="' + width +
                    '" height="' + height +
                    '" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
            }
            item.addClass('owl-video-playing');
            this._playing = item;
            wrap = $('<div style="height:' + height + 'px; width:' + width + 'px" class="owl-video-frame">' +
                html + '</div>');
            target.after(wrap);
        };
        Video.prototype.isInFullScreen = function() {
            var element = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
            if (element && $(element).parent().hasClass('owl-video-frame')) {
                this._core.speed(0);
                this._fullscreen = true;
            }
            if (element && this._fullscreen && this._playing) {
                return false;
            }
            if (this._fullscreen) {
                this._fullscreen = false;
                return false;
            }
            if (this._playing) {
                if (this._core.state.orientation !== window.orientation) {
                    this._core.state.orientation = window.orientation;
                    return false;
                }
            }
            return true;
        };
        Video.prototype.destroy = function() {
            var handler, property;
            this._core.$element.off('click.owl.video');
            for (handler in this._handlers) {
                this._core.$element.off(handler, this._handlers[handler]);
            }
            for (property in Object.getOwnPropertyNames(this)) {
                typeof this[property] != 'function' && (this[property] = null);
            }
        };
        $.fn.owlCarousel.Constructor.Plugins.Video = Video;
    })(window.Zepto || window.jQuery, window, document);;
    (function($, window, document, undefined) {
        var Animate = function(scope) {
            this.core = scope;
            this.core.options = $.extend({}, Animate.Defaults, this.core.options);
            this.swapping = true;
            this.previous = undefined;
            this.next = undefined;
            this.handlers = {
                'change.owl.carousel': $.proxy(function(e) {
                    if (e.property.name == 'position') {
                        this.previous = this.core.current();
                        this.next = e.property.value;
                    }
                }, this),
                'drag.owl.carousel dragged.owl.carousel translated.owl.carousel': $.proxy(function(e) {
                    this.swapping = e.type == 'translated';
                }, this),
                'translate.owl.carousel': $.proxy(function(e) {
                    if (this.swapping && (this.core.options.animateOut || this.core.options.animateIn)) {
                        this.swap();
                    }
                }, this)
            };
            this.core.$element.on(this.handlers);
        };
        Animate.Defaults = {
            animateOut: false,
            animateIn: false
        };
        Animate.prototype.swap = function() {
            if (this.core.settings.items !== 1 || !this.core.support3d) {
                return;
            }
            this.core.speed(0);
            var left, clear = $.proxy(this.clear, this),
                previous = this.core.$stage.children().eq(this.previous),
                next = this.core.$stage.children().eq(this.next),
                incoming = this.core.settings.animateIn,
                outgoing = this.core.settings.animateOut;
            if (this.core.current() === this.previous) {
                return;
            }
            if (outgoing) {
                left = this.core.coordinates(this.previous) - this.core.coordinates(this.next);
                previous.css({
                    'left': left + 'px'
                }).addClass('animated owl-animated-out').addClass(outgoing).one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', clear);
            }
            if (incoming) {
                next.addClass('animated owl-animated-in').addClass(incoming).one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', clear);
            }
        };
        Animate.prototype.clear = function(e) {
            $(e.target).css({
                'left': ''
            }).removeClass('animated owl-animated-out owl-animated-in').removeClass(this.core.settings.animateIn).removeClass(this.core.settings.animateOut);
            this.core.transitionEnd();
        }
        Animate.prototype.destroy = function() {
            var handler, property;
            for (handler in this.handlers) {
                this.core.$element.off(handler, this.handlers[handler]);
            }
            for (property in Object.getOwnPropertyNames(this)) {
                typeof this[property] != 'function' && (this[property] = null);
            }
        };
        $.fn.owlCarousel.Constructor.Plugins.Animate = Animate;
    })(window.Zepto || window.jQuery, window, document);;
    (function($, window, document, undefined) {
        var Autoplay = function(scope) {
            this.core = scope;
            this.core.options = $.extend({}, Autoplay.Defaults, this.core.options);
            this.handlers = {
                'translated.owl.carousel refreshed.owl.carousel': $.proxy(function() {
                    this.autoplay();
                }, this),
                'play.owl.autoplay': $.proxy(function(e, t, s) {
                    this.play(t, s);
                }, this),
                'stop.owl.autoplay': $.proxy(function() {
                    this.stop();
                }, this),
                'mouseover.owl.autoplay': $.proxy(function() {
                    if (this.core.settings.autoplayHoverPause) {
                        this.pause();
                    }
                }, this),
                'mouseleave.owl.autoplay': $.proxy(function() {
                    if (this.core.settings.autoplayHoverPause) {
                        this.autoplay();
                    }
                }, this)
            };
            this.core.$element.on(this.handlers);
        };
        Autoplay.Defaults = {
            autoplay: false,
            autoplayTimeout: 5000,
            autoplayHoverPause: false,
            autoplaySpeed: false
        };
        Autoplay.prototype.autoplay = function() {
            if (this.core.settings.autoplay && !this.core.state.videoPlay) {
                window.clearInterval(this.interval);
                this.interval = window.setInterval($.proxy(function() {
                    this.play();
                }, this), this.core.settings.autoplayTimeout);
            } else {
                window.clearInterval(this.interval);
            }
        };
        Autoplay.prototype.play = function(timeout, speed) {
            if (document.hidden === true) {
                return;
            }
            if (this.core.state.isTouch || this.core.state.isScrolling || this.core.state.isSwiping || this.core.state.inMotion) {
                return;
            }
            if (this.core.settings.autoplay === false) {
                window.clearInterval(this.interval);
                return;
            }
            this.core.next(this.core.settings.autoplaySpeed);
        };
        Autoplay.prototype.stop = function() {
            window.clearInterval(this.interval);
        };
        Autoplay.prototype.pause = function() {
            window.clearInterval(this.interval);
        };
        Autoplay.prototype.destroy = function() {
            var handler, property;
            window.clearInterval(this.interval);
            for (handler in this.handlers) {
                this.core.$element.off(handler, this.handlers[handler]);
            }
            for (property in Object.getOwnPropertyNames(this)) {
                typeof this[property] != 'function' && (this[property] = null);
            }
        };
        $.fn.owlCarousel.Constructor.Plugins.autoplay = Autoplay;
    })(window.Zepto || window.jQuery, window, document);;
    (function($, window, document, undefined) {
        'use strict';
        var Navigation = function(carousel) {
            this._core = carousel;
            this._initialized = false;
            this._pages = [];
            this._controls = {};
            this._templates = [];
            this.$element = this._core.$element;
            this._overrides = {
                next: this._core.next,
                prev: this._core.prev,
                to: this._core.to
            };
            this._handlers = {
                'prepared.owl.carousel': $.proxy(function(e) {
                    if (this._core.settings.dotsData) {
                        this._templates.push($(e.content).find('[data-dot]').andSelf('[data-dot]').attr('data-dot'));
                    }
                }, this),
                'add.owl.carousel': $.proxy(function(e) {
                    if (this._core.settings.dotsData) {
                        this._templates.splice(e.position, 0, $(e.content).find('[data-dot]').andSelf('[data-dot]').attr('data-dot'));
                    }
                }, this),
                'remove.owl.carousel prepared.owl.carousel': $.proxy(function(e) {
                    if (this._core.settings.dotsData) {
                        this._templates.splice(e.position, 1);
                    }
                }, this),
                'change.owl.carousel': $.proxy(function(e) {
                    if (e.property.name == 'position') {
                        if (!this._core.state.revert && !this._core.settings.loop && this._core.settings.navRewind) {
                            var current = this._core.current(),
                                maximum = this._core.maximum(),
                                minimum = this._core.minimum();
                            e.data = e.property.value > maximum ? current >= maximum ? minimum : maximum : e.property.value < minimum ? maximum : e.property.value;
                        }
                    }
                }, this),
                'changed.owl.carousel': $.proxy(function(e) {
                    if (e.property.name == 'position') {
                        this.draw();
                    }
                }, this),
                'refreshed.owl.carousel': $.proxy(function() {
                    if (!this._initialized) {
                        this.initialize();
                        this._initialized = true;
                    }
                    this._core.trigger('refresh', null, 'navigation');
                    this.update();
                    this.draw();
                    this._core.trigger('refreshed', null, 'navigation');
                }, this)
            };
            this._core.options = $.extend({}, Navigation.Defaults, this._core.options);
            this.$element.on(this._handlers);
        }
        Navigation.Defaults = {
            nav: false,
            navRewind: true,
            navText: ['prev', 'next'],
            navSpeed: false,
            navElement: 'div',
            navContainer: false,
            navContainerClass: 'owl-nav',
            navClass: ['owl-prev', 'owl-next'],
            slideBy: 1,
            dotClass: 'owl-dot',
            dotsClass: 'owl-dots',
            dots: true,
            dotsEach: false,
            dotData: false,
            dotsSpeed: false,
            dotsContainer: false,
            controlsClass: 'owl-controls'
        }
        Navigation.prototype.initialize = function() {
            var $container, override, options = this._core.settings;
            if (!options.dotsData) {
                this._templates = [$('<div>').addClass(options.dotClass).append($('<span>')).prop('outerHTML')];
            }
            if (!options.navContainer || !options.dotsContainer) {
                this._controls.$container = $('<div>').addClass(options.controlsClass).appendTo(this.$element);
            }
            this._controls.$indicators = options.dotsContainer ? $(options.dotsContainer) : $('<div>').hide().addClass(options.dotsClass).appendTo(this._controls.$container);
            this._controls.$indicators.on('click', 'div', $.proxy(function(e) {
                var index = $(e.target).parent().is(this._controls.$indicators) ? $(e.target).index() : $(e.target).parent().index();
                e.preventDefault();
                this.to(index, options.dotsSpeed);
            }, this));
            $container = options.navContainer ? $(options.navContainer) : $('<div>').addClass(options.navContainerClass).prependTo(this._controls.$container);
            this._controls.$next = $('<' + options.navElement + '>');
            this._controls.$previous = this._controls.$next.clone();
            this._controls.$previous.addClass(options.navClass[0]).html(options.navText[0]).hide().prependTo($container).on('click', $.proxy(function(e) {
                this.prev(options.navSpeed);
            }, this));
            this._controls.$next.addClass(options.navClass[1]).html(options.navText[1]).hide().appendTo($container).on('click', $.proxy(function(e) {
                this.next(options.navSpeed);
            }, this));
            for (override in this._overrides) {
                this._core[override] = $.proxy(this[override], this);
            }
        }
        Navigation.prototype.destroy = function() {
            var handler, control, property, override;
            for (handler in this._handlers) {
                this.$element.off(handler, this._handlers[handler]);
            }
            for (control in this._controls) {
                this._controls[control].remove();
            }
            for (override in this.overides) {
                this._core[override] = this._overrides[override];
            }
            for (property in Object.getOwnPropertyNames(this)) {
                typeof this[property] != 'function' && (this[property] = null);
            }
        }
        Navigation.prototype.update = function() {
            var i, j, k, options = this._core.settings,
                lower = this._core.clones().length / 2,
                upper = lower + this._core.items().length,
                size = options.center || options.autoWidth || options.dotData ? 1 : options.dotsEach || options.items;
            if (options.slideBy !== 'page') {
                options.slideBy = Math.min(options.slideBy, options.items);
            }
            if (options.dots || options.slideBy == 'page') {
                this._pages = [];
                for (i = lower, j = 0, k = 0; i < upper; i++) {
                    if (j >= size || j === 0) {
                        this._pages.push({
                            start: i - lower,
                            end: i - lower + size - 1
                        });
                        j = 0, ++k;
                    }
                    j += this._core.mergers(this._core.relative(i));
                }
            }
        }
        Navigation.prototype.draw = function() {
            var difference, i, html = '',
                options = this._core.settings,
                $items = this._core.$stage.children(),
                index = this._core.relative(this._core.current());
            if (options.nav && !options.loop && !options.navRewind) {
                this._controls.$previous.toggleClass('disabled', index <= 0);
                this._controls.$next.toggleClass('disabled', index >= this._core.maximum());
            }
            this._controls.$previous.toggle(options.nav);
            this._controls.$next.toggle(options.nav);
            if (options.dots) {
                difference = this._pages.length - this._controls.$indicators.children().length;
                if (options.dotData && difference !== 0) {
                    for (i = 0; i < this._controls.$indicators.children().length; i++) {
                        html += this._templates[this._core.relative(i)];
                    }
                    this._controls.$indicators.html(html);
                } else if (difference > 0) {
                    html = new Array(difference + 1).join(this._templates[0]);
                    this._controls.$indicators.append(html);
                } else if (difference < 0) {
                    this._controls.$indicators.children().slice(difference).remove();
                }
                this._controls.$indicators.find('.active').removeClass('active');
                this._controls.$indicators.children().eq($.inArray(this.current(), this._pages)).addClass('active');
            }
            this._controls.$indicators.toggle(options.dots);
        }
        Navigation.prototype.onTrigger = function(event) {
            var settings = this._core.settings;
            event.page = {
                index: $.inArray(this.current(), this._pages),
                count: this._pages.length,
                size: settings && (settings.center || settings.autoWidth || settings.dotData ? 1 : settings.dotsEach || settings.items)
            };
        }
        Navigation.prototype.current = function() {
            var index = this._core.relative(this._core.current());
            return $.grep(this._pages, function(o) {
                return o.start <= index && o.end >= index;
            }).pop();
        }
        Navigation.prototype.getPosition = function(successor) {
            var position, length, options = this._core.settings;
            if (options.slideBy == 'page') {
                position = $.inArray(this.current(), this._pages);
                length = this._pages.length;
                successor ? ++position : --position;
                position = this._pages[((position % length) + length) % length].start;
            } else {
                position = this._core.relative(this._core.current());
                length = this._core.items().length;
                successor ? position += options.slideBy : position -= options.slideBy;
            }
            return position;
        }
        Navigation.prototype.next = function(speed) {
            $.proxy(this._overrides.to, this._core)(this.getPosition(true), speed);
        }
        Navigation.prototype.prev = function(speed) {
            $.proxy(this._overrides.to, this._core)(this.getPosition(false), speed);
        }
        Navigation.prototype.to = function(position, speed, standard) {
            var length;
            if (!standard) {
                length = this._pages.length;
                $.proxy(this._overrides.to, this._core)(this._pages[((position % length) + length) % length].start, speed);
            } else {
                $.proxy(this._overrides.to, this._core)(position, speed);
            }
        }
        $.fn.owlCarousel.Constructor.Plugins.Navigation = Navigation;
    })(window.Zepto || window.jQuery, window, document);;
    (function($, window, document, undefined) {
        'use strict';
        var Hash = function(carousel) {
            this._core = carousel;
            this._hashes = {};
            this.$element = this._core.$element;
            this._handlers = {
                'initialized.owl.carousel': $.proxy(function() {
                    if (this._core.settings.startPosition == 'URLHash') {
                        $(window).trigger('hashchange.owl.navigation');
                    }
                }, this),
                'prepared.owl.carousel': $.proxy(function(e) {
                    var hash = $(e.content).find('[data-hash]').andSelf('[data-hash]').attr('data-hash');
                    this._hashes[hash] = e.content;
                }, this)
            };
            this._core.options = $.extend({}, Hash.Defaults, this._core.options);
            this.$element.on(this._handlers);
            $(window).on('hashchange.owl.navigation', $.proxy(function() {
                var hash = window.location.hash.substring(1),
                    items = this._core.$stage.children(),
                    position = this._hashes[hash] && items.index(this._hashes[hash]) || 0;
                if (!hash) {
                    return false;
                }
                this._core.to(position, false, true);
            }, this));
        }
        Hash.Defaults = {
            URLhashListener: false
        }
        Hash.prototype.destroy = function() {
            var handler, property;
            $(window).off('hashchange.owl.navigation');
            for (handler in this._handlers) {
                this._core.$element.off(handler, this._handlers[handler]);
            }
            for (property in Object.getOwnPropertyNames(this)) {
                typeof this[property] != 'function' && (this[property] = null);
            }
        }
        $.fn.owlCarousel.Constructor.Plugins.Hash = Hash;
    })(window.Zepto || window.jQuery, window, document);
} catch (e) {}
try {
    /*! modernizr 3.3.1 (Custom Build) | MIT *
     * https://modernizr.com/download/?-canvas-flexbox-objectfit-requestanimationframe-touchevents-mq-setclasses !*/
    ! function(e, n, t) {
        function r(e, n) {
            return typeof e === n
        }

        function o() {
            var e, n, t, o, i, s, a;
            for (var f in C)
                if (C.hasOwnProperty(f)) {
                    if (e = [], n = C[f], n.name && (e.push(n.name.toLowerCase()), n.options && n.options.aliases && n.options.aliases.length))
                        for (t = 0; t < n.options.aliases.length; t++) e.push(n.options.aliases[t].toLowerCase());
                    for (o = r(n.fn, "function") ? n.fn() : n.fn, i = 0; i < e.length; i++) s = e[i], a = s.split("."), 1 === a.length ? Modernizr[a[0]] = o : (!Modernizr[a[0]] || Modernizr[a[0]] instanceof Boolean || (Modernizr[a[0]] = new Boolean(Modernizr[a[0]])), Modernizr[a[0]][a[1]] = o), g.push((o ? "" : "no-") + a.join("-"))
                }
        }

        function i(e) {
            var n = _.className,
                t = Modernizr._config.classPrefix || "";
            if (S && (n = n.baseVal), Modernizr._config.enableJSClass) {
                var r = new RegExp("(^|\\s)" + t + "no-js(\\s|$)");
                n = n.replace(r, "$1" + t + "js$2")
            }
            Modernizr._config.enableClasses && (n += " " + t + e.join(" " + t), S ? _.className.baseVal = n : _.className = n)
        }

        function s() {
            return "function" != typeof n.createElement ? n.createElement(arguments[0]) : S ? n.createElementNS.call(n, "http://www.w3.org/2000/svg", arguments[0]) : n.createElement.apply(n, arguments)
        }

        function a() {
            var e = n.body;
            return e || (e = s(S ? "svg" : "body"), e.fake = !0), e
        }

        function f(e, t, r, o) {
            var i, f, u, l, c = "modernizr",
                d = s("div"),
                p = a();
            if (parseInt(r, 10))
                for (; r--;) u = s("div"), u.id = o ? o[r] : c + (r + 1), d.appendChild(u);
            return i = s("style"), i.type = "text/css", i.id = "s" + c, (p.fake ? p : d).appendChild(i), p.appendChild(d), i.styleSheet ? i.styleSheet.cssText = e : i.appendChild(n.createTextNode(e)), d.id = c, p.fake && (p.style.background = "", p.style.overflow = "hidden", l = _.style.overflow, _.style.overflow = "hidden", _.appendChild(p)), f = t(d, e), p.fake ? (p.parentNode.removeChild(p), _.style.overflow = l, _.offsetHeight) : d.parentNode.removeChild(d), !!f
        }

        function u(e) {
            return e.replace(/([a-z])-([a-z])/g, function(e, n, t) {
                return n + t.toUpperCase()
            }).replace(/^-/, "")
        }

        function l(e, n) {
            return !!~("" + e).indexOf(n)
        }

        function c(e, n) {
            return function() {
                return e.apply(n, arguments)
            }
        }

        function d(e, n, t) {
            var o;
            for (var i in e)
                if (e[i] in n) return t === !1 ? e[i] : (o = n[e[i]], r(o, "function") ? c(o, t || n) : o);
            return !1
        }

        function p(e) {
            return e.replace(/([A-Z])/g, function(e, n) {
                return "-" + n.toLowerCase()
            }).replace(/^ms-/, "-ms-")
        }

        function m(n, r) {
            var o = n.length;
            if ("CSS" in e && "supports" in e.CSS) {
                for (; o--;)
                    if (e.CSS.supports(p(n[o]), r)) return !0;
                return !1
            }
            if ("CSSSupportsRule" in e) {
                for (var i = []; o--;) i.push("(" + p(n[o]) + ":" + r + ")");
                return i = i.join(" or "), f("@supports (" + i + ") { #modernizr { position: absolute; } }", function(e) {
                    return "absolute" == getComputedStyle(e, null).position
                })
            }
            return t
        }

        function v(e, n, o, i) {
            function a() {
                c && (delete P.style, delete P.modElem)
            }
            if (i = r(i, "undefined") ? !1 : i, !r(o, "undefined")) {
                var f = m(e, o);
                if (!r(f, "undefined")) return f
            }
            for (var c, d, p, v, h, y = ["modernizr", "tspan", "samp"]; !P.style && y.length;) c = !0, P.modElem = s(y.shift()), P.style = P.modElem.style;
            for (p = e.length, d = 0; p > d; d++)
                if (v = e[d], h = P.style[v], l(v, "-") && (v = u(v)), P.style[v] !== t) {
                    if (i || r(o, "undefined")) return a(), "pfx" == n ? v : !0;
                    try {
                        P.style[v] = o
                    } catch (g) {}
                    if (P.style[v] != h) return a(), "pfx" == n ? v : !0
                }
            return a(), !1
        }

        function h(e, n, t, o, i) {
            var s = e.charAt(0).toUpperCase() + e.slice(1),
                a = (e + " " + T.join(s + " ") + s).split(" ");
            return r(n, "string") || r(n, "undefined") ? v(a, n, o, i) : (a = (e + " " + j.join(s + " ") + s).split(" "), d(a, n, t))
        }

        function y(e, n, r) {
            return h(e, t, t, n, r)
        }
        var g = [],
            C = [],
            x = {
                _version: "3.3.1",
                _config: {
                    classPrefix: "",
                    enableClasses: !0,
                    enableJSClass: !0,
                    usePrefixes: !0
                },
                _q: [],
                on: function(e, n) {
                    var t = this;
                    setTimeout(function() {
                        n(t[e])
                    }, 0)
                },
                addTest: function(e, n, t) {
                    C.push({
                        name: e,
                        fn: n,
                        options: t
                    })
                },
                addAsyncTest: function(e) {
                    C.push({
                        name: null,
                        fn: e
                    })
                }
            },
            Modernizr = function() {};
        Modernizr.prototype = x, Modernizr = new Modernizr;
        var _ = n.documentElement,
            S = "svg" === _.nodeName.toLowerCase();
        Modernizr.addTest("canvas", function() {
            var e = s("canvas");
            return !(!e.getContext || !e.getContext("2d"))
        });
        var b = function() {
            var n = e.matchMedia || e.msMatchMedia;
            return n ? function(e) {
                var t = n(e);
                return t && t.matches || !1
            } : function(n) {
                var t = !1;
                return f("@media " + n + " { #modernizr { position: absolute; } }", function(n) {
                    t = "absolute" == (e.getComputedStyle ? e.getComputedStyle(n, null) : n.currentStyle).position
                }), t
            }
        }();
        x.mq = b;
        var w = "Moz O ms Webkit",
            T = x._config.usePrefixes ? w.split(" ") : [];
        x._cssomPrefixes = T;
        var z = function(n) {
            var r, o = q.length,
                i = e.CSSRule;
            if ("undefined" == typeof i) return t;
            if (!n) return !1;
            if (n = n.replace(/^@/, ""), r = n.replace(/-/g, "_").toUpperCase() + "_RULE", r in i) return "@" + n;
            for (var s = 0; o > s; s++) {
                var a = q[s],
                    f = a.toUpperCase() + "_" + r;
                if (f in i) return "@-" + a.toLowerCase() + "-" + n
            }
            return !1
        };
        x.atRule = z;
        var j = x._config.usePrefixes ? w.toLowerCase().split(" ") : [];
        x._domPrefixes = j;
        var E = {
            elem: s("modernizr")
        };
        Modernizr._q.push(function() {
            delete E.elem
        });
        var P = {
            style: E.elem.style
        };
        Modernizr._q.unshift(function() {
            delete P.style
        }), x.testAllProps = h;
        var N = x.prefixed = function(e, n, t) {
            return 0 === e.indexOf("@") ? z(e) : (-1 != e.indexOf("-") && (e = u(e)), n ? h(e, n, t) : h(e, "pfx"))
        };
        Modernizr.addTest("requestanimationframe", !!N("requestAnimationFrame", e), {
            aliases: ["raf"]
        }), Modernizr.addTest("objectfit", !!N("objectFit"), {
            aliases: ["object-fit"]
        }), x.testAllProps = y, Modernizr.addTest("flexbox", y("flexBasis", "1px", !0));
        var q = x._config.usePrefixes ? " -webkit- -moz- -o- -ms- ".split(" ") : ["", ""];
        x._prefixes = q;
        var k = x.testStyles = f;
        Modernizr.addTest("touchevents", function() {
            var t;
            if ("ontouchstart" in e || e.DocumentTouch && n instanceof DocumentTouch) t = !0;
            else {
                var r = ["@media (", q.join("touch-enabled),("), "heartz", ")", "{#modernizr{top:9px;position:absolute}}"].join("");
                k(r, function(e) {
                    t = 9 === e.offsetTop
                })
            }
            return t
        }), o(), i(g), delete x.addTest, delete x.addAsyncTest;
        for (var A = 0; A < Modernizr._q.length; A++) Modernizr._q[A]();
        e.Modernizr = Modernizr
    }(window, document);
} catch (e) {}
try {
    /*! picturefill - v3.0.2 - 2016-02-12
     * https://scottjehl.github.io/picturefill/
     * Copyright (c) 2016 https://github.com/scottjehl/picturefill/blob/master/Authors.txt; Licensed MIT
     */
    ! function(a) {
        var b = navigator.userAgent;
        a.HTMLPictureElement && /ecko/.test(b) && b.match(/rv\:(\d+)/) && RegExp.$1 < 45 && addEventListener("resize", function() {
            var b, c = document.createElement("source"),
                d = function(a) {
                    var b, d, e = a.parentNode;
                    "PICTURE" === e.nodeName.toUpperCase() ? (b = c.cloneNode(), e.insertBefore(b, e.firstElementChild), setTimeout(function() {
                        e.removeChild(b)
                    })) : (!a._pfLastSize || a.offsetWidth > a._pfLastSize) && (a._pfLastSize = a.offsetWidth, d = a.sizes, a.sizes += ",100vw", setTimeout(function() {
                        a.sizes = d
                    }))
                },
                e = function() {
                    var a, b = document.querySelectorAll("picture > img, img[srcset][sizes]");
                    for (a = 0; a < b.length; a++) d(b[a])
                },
                f = function() {
                    clearTimeout(b), b = setTimeout(e, 99)
                },
                g = a.matchMedia && matchMedia("(orientation: landscape)"),
                h = function() {
                    f(), g && g.addListener && g.addListener(f)
                };
            return c.srcset = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", /^[c|i]|d$/.test(document.readyState || "") ? h() : document.addEventListener("DOMContentLoaded", h), f
        }())
    }(window),
    function(a, b, c) {
        "use strict";

        function d(a) {
            return " " === a || "	" === a || "\n" === a || "\f" === a || "\r" === a
        }

        function e(b, c) {
            var d = new a.Image;
            return d.onerror = function() {
                A[b] = !1, ba()
            }, d.onload = function() {
                A[b] = 1 === d.width, ba()
            }, d.src = c, "pending"
        }

        function f() {
            M = !1, P = a.devicePixelRatio, N = {}, O = {}, s.DPR = P || 1, Q.width = Math.max(a.innerWidth || 0, z.clientWidth), Q.height = Math.max(a.innerHeight || 0, z.clientHeight), Q.vw = Q.width / 100, Q.vh = Q.height / 100, r = [Q.height, Q.width, P].join("-"), Q.em = s.getEmValue(), Q.rem = Q.em
        }

        function g(a, b, c, d) {
            var e, f, g, h;
            return "saveData" === B.algorithm ? a > 2.7 ? h = c + 1 : (f = b - c, e = Math.pow(a - .6, 1.5), g = f * e, d && (g += .1 * e), h = a + g) : h = c > 1 ? Math.sqrt(a * b) : a, h > c
        }

        function h(a) {
            var b, c = s.getSet(a),
                d = !1;
            "pending" !== c && (d = r, c && (b = s.setRes(c), s.applySetCandidate(b, a))), a[s.ns].evaled = d
        }

        function i(a, b) {
            return a.res - b.res
        }

        function j(a, b, c) {
            var d;
            return !c && b && (c = a[s.ns].sets, c = c && c[c.length - 1]), d = k(b, c), d && (b = s.makeUrl(b), a[s.ns].curSrc = b, a[s.ns].curCan = d, d.res || aa(d, d.set.sizes)), d
        }

        function k(a, b) {
            var c, d, e;
            if (a && b)
                for (e = s.parseSet(b), a = s.makeUrl(a), c = 0; c < e.length; c++)
                    if (a === s.makeUrl(e[c].url)) {
                        d = e[c];
                        break
                    }
            return d
        }

        function l(a, b) {
            var c, d, e, f, g = a.getElementsByTagName("source");
            for (c = 0, d = g.length; d > c; c++) e = g[c], e[s.ns] = !0, f = e.getAttribute("srcset"), f && b.push({
                srcset: f,
                media: e.getAttribute("media"),
                type: e.getAttribute("type"),
                sizes: e.getAttribute("sizes")
            })
        }

        function m(a, b) {
            function c(b) {
                var c, d = b.exec(a.substring(m));
                return d ? (c = d[0], m += c.length, c) : void 0
            }

            function e() {
                var a, c, d, e, f, i, j, k, l, m = !1,
                    o = {};
                for (e = 0; e < h.length; e++) f = h[e], i = f[f.length - 1], j = f.substring(0, f.length - 1), k = parseInt(j, 10), l = parseFloat(j), X.test(j) && "w" === i ? ((a || c) && (m = !0), 0 === k ? m = !0 : a = k) : Y.test(j) && "x" === i ? ((a || c || d) && (m = !0), 0 > l ? m = !0 : c = l) : X.test(j) && "h" === i ? ((d || c) && (m = !0), 0 === k ? m = !0 : d = k) : m = !0;
                m || (o.url = g, a && (o.w = a), c && (o.d = c), d && (o.h = d), d || c || a || (o.d = 1), 1 === o.d && (b.has1x = !0), o.set = b, n.push(o))
            }

            function f() {
                for (c(T), i = "", j = "in descriptor";;) {
                    if (k = a.charAt(m), "in descriptor" === j)
                        if (d(k)) i && (h.push(i), i = "", j = "after descriptor");
                        else {
                            if ("," === k) return m += 1, i && h.push(i), void e();
                            if ("(" === k) i += k, j = "in parens";
                            else {
                                if ("" === k) return i && h.push(i), void e();
                                i += k
                            }
                        }
                    else if ("in parens" === j)
                        if (")" === k) i += k, j = "in descriptor";
                        else {
                            if ("" === k) return h.push(i), void e();
                            i += k
                        }
                    else if ("after descriptor" === j)
                        if (d(k));
                        else {
                            if ("" === k) return void e();
                            j = "in descriptor", m -= 1
                        }
                    m += 1
                }
            }
            for (var g, h, i, j, k, l = a.length, m = 0, n = [];;) {
                if (c(U), m >= l) return n;
                g = c(V), h = [], "," === g.slice(-1) ? (g = g.replace(W, ""), e()) : f()
            }
        }

        function n(a) {
            function b(a) {
                function b() {
                    f && (g.push(f), f = "")
                }

                function c() {
                    g[0] && (h.push(g), g = [])
                }
                for (var e, f = "", g = [], h = [], i = 0, j = 0, k = !1;;) {
                    if (e = a.charAt(j), "" === e) return b(), c(), h;
                    if (k) {
                        if ("*" === e && "/" === a[j + 1]) {
                            k = !1, j += 2, b();
                            continue
                        }
                        j += 1
                    } else {
                        if (d(e)) {
                            if (a.charAt(j - 1) && d(a.charAt(j - 1)) || !f) {
                                j += 1;
                                continue
                            }
                            if (0 === i) {
                                b(), j += 1;
                                continue
                            }
                            e = " "
                        } else if ("(" === e) i += 1;
                        else if (")" === e) i -= 1;
                        else {
                            if ("," === e) {
                                b(), c(), j += 1;
                                continue
                            }
                            if ("/" === e && "*" === a.charAt(j + 1)) {
                                k = !0, j += 2;
                                continue
                            }
                        }
                        f += e, j += 1
                    }
                }
            }

            function c(a) {
                return k.test(a) && parseFloat(a) >= 0 ? !0 : l.test(a) ? !0 : "0" === a || "-0" === a || "+0" === a ? !0 : !1
            }
            var e, f, g, h, i, j, k = /^(?:[+-]?[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?(?:ch|cm|em|ex|in|mm|pc|pt|px|rem|vh|vmin|vmax|vw)$/i,
                l = /^calc\((?:[0-9a-z \.\+\-\*\/\(\)]+)\)$/i;
            for (f = b(a), g = f.length, e = 0; g > e; e++)
                if (h = f[e], i = h[h.length - 1], c(i)) {
                    if (j = i, h.pop(), 0 === h.length) return j;
                    if (h = h.join(" "), s.matchesMedia(h)) return j
                }
            return "100vw"
        }
        b.createElement("picture");
        var o, p, q, r, s = {},
            t = !1,
            u = function() {},
            v = b.createElement("img"),
            w = v.getAttribute,
            x = v.setAttribute,
            y = v.removeAttribute,
            z = b.documentElement,
            A = {},
            B = {
                algorithm: ""
            },
            C = "data-pfsrc",
            D = C + "set",
            E = navigator.userAgent,
            F = /rident/.test(E) || /ecko/.test(E) && E.match(/rv\:(\d+)/) && RegExp.$1 > 35,
            G = "currentSrc",
            H = /\s+\+?\d+(e\d+)?w/,
            I = /(\([^)]+\))?\s*(.+)/,
            J = a.picturefillCFG,
            K = "position:absolute;left:0;visibility:hidden;display:block;padding:0;border:none;font-size:1em;width:1em;overflow:hidden;clip:rect(0px, 0px, 0px, 0px)",
            L = "font-size:100%!important;",
            M = !0,
            N = {},
            O = {},
            P = a.devicePixelRatio,
            Q = {
                px: 1,
                "in": 96
            },
            R = b.createElement("a"),
            S = !1,
            T = /^[ \t\n\r\u000c]+/,
            U = /^[, \t\n\r\u000c]+/,
            V = /^[^ \t\n\r\u000c]+/,
            W = /[,]+$/,
            X = /^\d+$/,
            Y = /^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/,
            Z = function(a, b, c, d) {
                a.addEventListener ? a.addEventListener(b, c, d || !1) : a.attachEvent && a.attachEvent("on" + b, c)
            },
            $ = function(a) {
                var b = {};
                return function(c) {
                    return c in b || (b[c] = a(c)), b[c]
                }
            },
            _ = function() {
                var a = /^([\d\.]+)(em|vw|px)$/,
                    b = function() {
                        for (var a = arguments, b = 0, c = a[0]; ++b in a;) c = c.replace(a[b], a[++b]);
                        return c
                    },
                    c = $(function(a) {
                        return "return " + b((a || "").toLowerCase(), /\band\b/g, "&&", /,/g, "||", /min-([a-z-\s]+):/g, "e.$1>=", /max-([a-z-\s]+):/g, "e.$1<=", /calc([^)]+)/g, "($1)", /(\d+[\.]*[\d]*)([a-z]+)/g, "($1 * e.$2)", /^(?!(e.[a-z]|[0-9\.&=|><\+\-\*\(\)\/])).*/gi, "") + ";"
                    });
                return function(b, d) {
                    var e;
                    if (!(b in N))
                        if (N[b] = !1, d && (e = b.match(a))) N[b] = e[1] * Q[e[2]];
                        else try {
                            N[b] = new Function("e", c(b))(Q)
                        } catch (f) {}
                    return N[b]
                }
            }(),
            aa = function(a, b) {
                return a.w ? (a.cWidth = s.calcListLength(b || "100vw"), a.res = a.w / a.cWidth) : a.res = a.d, a
            },
            ba = function(a) {
                if (t) {
                    var c, d, e, f = a || {};
                    if (f.elements && 1 === f.elements.nodeType && ("IMG" === f.elements.nodeName.toUpperCase() ? f.elements = [f.elements] : (f.context = f.elements, f.elements = null)), c = f.elements || s.qsa(f.context || b, f.reevaluate || f.reselect ? s.sel : s.selShort), e = c.length) {
                        for (s.setupRun(f), S = !0, d = 0; e > d; d++) s.fillImg(c[d], f);
                        s.teardownRun(f)
                    }
                }
            };
        o = a.console && console.warn ? function(a) {
            console.warn(a)
        } : u, G in v || (G = "src"), A["image/jpeg"] = !0, A["image/gif"] = !0, A["image/png"] = !0, A["image/svg+xml"] = b.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1"), s.ns = ("pf" + (new Date).getTime()).substr(0, 9), s.supSrcset = "srcset" in v, s.supSizes = "sizes" in v, s.supPicture = !!a.HTMLPictureElement, s.supSrcset && s.supPicture && !s.supSizes && ! function(a) {
            v.srcset = "data:,a", a.src = "data:,a", s.supSrcset = v.complete === a.complete, s.supPicture = s.supSrcset && s.supPicture
        }(b.createElement("img")), s.supSrcset && !s.supSizes ? ! function() {
            var a = "data:image/gif;base64,R0lGODlhAgABAPAAAP///wAAACH5BAAAAAAALAAAAAACAAEAAAICBAoAOw==",
                c = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
                d = b.createElement("img"),
                e = function() {
                    var a = d.width;
                    2 === a && (s.supSizes = !0), q = s.supSrcset && !s.supSizes, t = !0, setTimeout(ba)
                };
            d.onload = e, d.onerror = e, d.setAttribute("sizes", "9px"), d.srcset = c + " 1w," + a + " 9w", d.src = c
        }() : t = !0, s.selShort = "picture>img,img[srcset]", s.sel = s.selShort, s.cfg = B, s.DPR = P || 1, s.u = Q, s.types = A, s.setSize = u, s.makeUrl = $(function(a) {
            return R.href = a, R.href
        }), s.qsa = function(a, b) {
            return "querySelector" in a ? a.querySelectorAll(b) : []
        }, s.matchesMedia = function() {
            return a.matchMedia && (matchMedia("(min-width: 0.1em)") || {}).matches ? s.matchesMedia = function(a) {
                return !a || matchMedia(a).matches
            } : s.matchesMedia = s.mMQ, s.matchesMedia.apply(this, arguments)
        }, s.mMQ = function(a) {
            return a ? _(a) : !0
        }, s.calcLength = function(a) {
            var b = _(a, !0) || !1;
            return 0 > b && (b = !1), b
        }, s.supportsType = function(a) {
            return a ? A[a] : !0
        }, s.parseSize = $(function(a) {
            var b = (a || "").match(I);
            return {
                media: b && b[1],
                length: b && b[2]
            }
        }), s.parseSet = function(a) {
            return a.cands || (a.cands = m(a.srcset, a)), a.cands
        }, s.getEmValue = function() {
            var a;
            if (!p && (a = b.body)) {
                var c = b.createElement("div"),
                    d = z.style.cssText,
                    e = a.style.cssText;
                c.style.cssText = K, z.style.cssText = L, a.style.cssText = L, a.appendChild(c), p = c.offsetWidth, a.removeChild(c), p = parseFloat(p, 10), z.style.cssText = d, a.style.cssText = e
            }
            return p || 16
        }, s.calcListLength = function(a) {
            if (!(a in O) || B.uT) {
                var b = s.calcLength(n(a));
                O[a] = b ? b : Q.width
            }
            return O[a]
        }, s.setRes = function(a) {
            var b;
            if (a) {
                b = s.parseSet(a);
                for (var c = 0, d = b.length; d > c; c++) aa(b[c], a.sizes)
            }
            return b
        }, s.setRes.res = aa, s.applySetCandidate = function(a, b) {
            if (a.length) {
                var c, d, e, f, h, k, l, m, n, o = b[s.ns],
                    p = s.DPR;
                if (k = o.curSrc || b[G], l = o.curCan || j(b, k, a[0].set), l && l.set === a[0].set && (n = F && !b.complete && l.res - .1 > p, n || (l.cached = !0, l.res >= p && (h = l))), !h)
                    for (a.sort(i), f = a.length, h = a[f - 1], d = 0; f > d; d++)
                        if (c = a[d], c.res >= p) {
                            e = d - 1, h = a[e] && (n || k !== s.makeUrl(c.url)) && g(a[e].res, c.res, p, a[e].cached) ? a[e] : c;
                            break
                        }
                h && (m = s.makeUrl(h.url), o.curSrc = m, o.curCan = h, m !== k && s.setSrc(b, h), s.setSize(b))
            }
        }, s.setSrc = function(a, b) {
            var c;
            a.src = b.url, "image/svg+xml" === b.set.type && (c = a.style.width, a.style.width = a.offsetWidth + 1 + "px", a.offsetWidth + 1 && (a.style.width = c))
        }, s.getSet = function(a) {
            var b, c, d, e = !1,
                f = a[s.ns].sets;
            for (b = 0; b < f.length && !e; b++)
                if (c = f[b], c.srcset && s.matchesMedia(c.media) && (d = s.supportsType(c.type))) {
                    "pending" === d && (c = d), e = c;
                    break
                }
            return e
        }, s.parseSets = function(a, b, d) {
            var e, f, g, h, i = b && "PICTURE" === b.nodeName.toUpperCase(),
                j = a[s.ns];
            (j.src === c || d.src) && (j.src = w.call(a, "src"), j.src ? x.call(a, C, j.src) : y.call(a, C)), (j.srcset === c || d.srcset || !s.supSrcset || a.srcset) && (e = w.call(a, "srcset"), j.srcset = e, h = !0), j.sets = [], i && (j.pic = !0, l(b, j.sets)), j.srcset ? (f = {
                srcset: j.srcset,
                sizes: w.call(a, "sizes")
            }, j.sets.push(f), g = (q || j.src) && H.test(j.srcset || ""), g || !j.src || k(j.src, f) || f.has1x || (f.srcset += ", " + j.src, f.cands.push({
                url: j.src,
                d: 1,
                set: f
            }))) : j.src && j.sets.push({
                srcset: j.src,
                sizes: null
            }), j.curCan = null, j.curSrc = c, j.supported = !(i || f && !s.supSrcset || g && !s.supSizes), h && s.supSrcset && !j.supported && (e ? (x.call(a, D, e), a.srcset = "") : y.call(a, D)), j.supported && !j.srcset && (!j.src && a.src || a.src !== s.makeUrl(j.src)) && (null === j.src ? a.removeAttribute("src") : a.src = j.src), j.parsed = !0
        }, s.fillImg = function(a, b) {
            var c, d = b.reselect || b.reevaluate;
            a[s.ns] || (a[s.ns] = {}), c = a[s.ns], (d || c.evaled !== r) && ((!c.parsed || b.reevaluate) && s.parseSets(a, a.parentNode, b), c.supported ? c.evaled = r : h(a))
        }, s.setupRun = function() {
            (!S || M || P !== a.devicePixelRatio) && f()
        }, s.supPicture ? (ba = u, s.fillImg = u) : ! function() {
            var c, d = a.attachEvent ? /d$|^c/ : /d$|^c|^i/,
                e = function() {
                    var a = b.readyState || "";
                    f = setTimeout(e, "loading" === a ? 200 : 999), b.body && (s.fillImgs(), c = c || d.test(a), c && clearTimeout(f))
                },
                f = setTimeout(e, b.body ? 9 : 99),
                g = function(a, b) {
                    var c, d, e = function() {
                        var f = new Date - d;
                        b > f ? c = setTimeout(e, b - f) : (c = null, a())
                    };
                    return function() {
                        d = new Date, c || (c = setTimeout(e, b))
                    }
                },
                h = z.clientHeight,
                i = function() {
                    M = Math.max(a.innerWidth || 0, z.clientWidth) !== Q.width || z.clientHeight !== h, h = z.clientHeight, M && s.fillImgs()
                };
            Z(a, "resize", g(i, 99)), Z(b, "readystatechange", e)
        }(), s.picturefill = ba, s.fillImgs = ba, s.teardownRun = u, ba._ = s, a.picturefillCFG = {
            pf: s,
            push: function(a) {
                var b = a.shift();
                "function" == typeof s[b] ? s[b].apply(s, a) : (B[b] = a[0], S && s.fillImgs({
                    reselect: !0
                }))
            }
        };
        for (; J && J.length;) a.picturefillCFG.push(J.shift());
        a.picturefill = ba, "object" == typeof module && "object" == typeof module.exports ? module.exports = ba : "function" == typeof define && define.amd && define("picturefill", function() {
            return ba
        }), s.supPicture || (A["image/webp"] = e("image/webp", "data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAABBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQADADQlpAADcAD++/1QAA=="))
    }(window, document);
} catch (e) {}
try {
    (function() {
        var options = {
            facebook: "218347128179393",
            whatsapp: "+905325419800",
            email: "info@kleopatra.com.tr",
            call: "+902425192505",
            company_logo_url: "//scontent.xx.fbcdn.net/v/t1.0-1/c154.33.412.412/s50x50/419949_379226555424782_953722616_n.jpg?oh=1689929447498abf88d4fab9c6474827&oe=59A34345",
            greeting_message: "Welcome To Kleopatra Turkish Bath Spa & Welness",
            call_to_action: "Message us",
            button_color: "#0095eb",
            position: "right",
            order: "facebook,whatsapp,call,email"
        };
        var proto = document.location.protocol,
            host = "whatshelp.io",
            url = proto + "//static." + host;
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = url + '/widget-send-button/js/init.js';
        s.onload = function() {
            WhWidgetSendButton.init(host, proto, options);
        };
        var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(s, x);
    })();
} catch (e) {}
try {
    $(function() {
        typeof $.fn.paraceviriciWidget == "function" && $("#W4348").paraceviriciWidget({
            widget: "boxline",
            wData: {
                category: 0,
                currency: "USD-EUR"
            },
            wSize: {
                wWidth: 200,
                wHeight: 20
            }
        });
    });
} catch (e) {}
try {
    window.ShakaSliderCaptions = [{
        "title": "",
        "text": "",
        "is_video": false
    }];
} catch (e) {}
try {
    /*!
     * Lightbox v2.8.1
     * by Lokesh Dhakar
     *
     * More info:
     * http://lokeshdhakar.com/projects/lightbox2/
     *
     * Copyright 2007, 2015 Lokesh Dhakar
     * Released under the MIT license
     * https://github.com/lokesh/lightbox2/blob/master/LICENSE
     */
    (function(root, factory) {
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (typeof exports === 'object') {
            module.exports = factory(require('jquery'));
        } else {
            root.lightbox = factory(root.jQuery);
        }
    }(this, function($) {
        function Lightbox(options) {
            this.album = [];
            this.currentImageIndex = void 0;
            this.init();
            this.options = $.extend({}, this.constructor.defaults);
            this.option(options);
        }
        Lightbox.defaults = {
            albumLabel: 'Image %1 of %2',
            alwaysShowNavOnTouchDevices: false,
            fadeDuration: 500,
            fitImagesInViewport: true,
            positionFromTop: 50,
            resizeDuration: 700,
            showImageNumberLabel: true,
            wrapAround: false
        };
        Lightbox.prototype.option = function(options) {
            $.extend(this.options, options);
        };
        Lightbox.prototype.imageCountLabel = function(currentImageNum, totalImages) {
            return this.options.albumLabel.replace(/%1/g, currentImageNum).replace(/%2/g, totalImages);
        };
        Lightbox.prototype.init = function() {
            this.enable();
            this.build();
        };
        Lightbox.prototype.enable = function() {
            var self = this;
            $('body').on('click', 'a[rel^=lightbox], area[rel^=lightbox], a[data-lightbox], area[data-lightbox]', function(event) {
                self.start($(event.currentTarget));
                return false;
            });
        };
        Lightbox.prototype.build = function() {
            var self = this;
            $('<div id="lightboxOverlay" class="lightboxOverlay"></div><div id="lightbox" class="lightbox"><div class="lb-outerContainer"><div class="lb-container"><img class="lb-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" /><div class="lb-nav"><a class="lb-prev" href="" ></a><a class="lb-next" href="" ></a></div><div class="lb-loader"><a class="lb-cancel"></a></div></div></div><div class="lb-dataContainer"><div class="lb-data"><div class="lb-details"><span class="lb-caption"></span><span class="lb-number"></span></div><div class="lb-closeContainer"><a class="lb-close"></a></div></div></div></div>').appendTo($('body'));
            this.$lightbox = $('#lightbox');
            this.$overlay = $('#lightboxOverlay');
            this.$outerContainer = this.$lightbox.find('.lb-outerContainer');
            this.$container = this.$lightbox.find('.lb-container');
            this.containerTopPadding = parseInt(this.$container.css('padding-top'), 10);
            this.containerRightPadding = parseInt(this.$container.css('padding-right'), 10);
            this.containerBottomPadding = parseInt(this.$container.css('padding-bottom'), 10);
            this.containerLeftPadding = parseInt(this.$container.css('padding-left'), 10);
            this.$overlay.hide().on('click', function() {
                self.end();
                return false;
            });
            this.$lightbox.hide().on('click', function(event) {
                if ($(event.target).attr('id') === 'lightbox') {
                    self.end();
                }
                return false;
            });
            this.$outerContainer.on('click', function(event) {
                if ($(event.target).attr('id') === 'lightbox') {
                    self.end();
                }
                return false;
            });
            this.$lightbox.find('.lb-prev').on('click', function() {
                if (self.currentImageIndex === 0) {
                    self.changeImage(self.album.length - 1);
                } else {
                    self.changeImage(self.currentImageIndex - 1);
                }
                return false;
            });
            this.$lightbox.find('.lb-next').on('click', function() {
                if (self.currentImageIndex === self.album.length - 1) {
                    self.changeImage(0);
                } else {
                    self.changeImage(self.currentImageIndex + 1);
                }
                return false;
            });
            this.$lightbox.find('.lb-loader, .lb-close').on('click', function() {
                self.end();
                return false;
            });
        };
        Lightbox.prototype.start = function($link) {
            var self = this;
            var $window = $(window);
            $window.on('resize', $.proxy(this.sizeOverlay, this));
            $('select, object, embed').css({
                visibility: 'hidden'
            });
            this.sizeOverlay();
            this.album = [];
            var imageNumber = 0;

            function addToAlbum($link) {
                self.album.push({
                    link: $link.attr('href'),
                    title: $link.attr('data-title') || $link.attr('title')
                });
            }
            var dataLightboxValue = $link.attr('data-lightbox');
            var $links;
            if (dataLightboxValue) {
                $links = $($link.prop('tagName') + '[data-lightbox="' + dataLightboxValue + '"]');
                for (var i = 0; i < $links.length; i = ++i) {
                    addToAlbum($($links[i]));
                    if ($links[i] === $link[0]) {
                        imageNumber = i;
                    }
                }
            } else {
                if ($link.attr('rel') === 'lightbox') {
                    addToAlbum($link);
                } else {
                    $links = $($link.prop('tagName') + '[rel="' + $link.attr('rel') + '"]');
                    for (var j = 0; j < $links.length; j = ++j) {
                        addToAlbum($($links[j]));
                        if ($links[j] === $link[0]) {
                            imageNumber = j;
                        }
                    }
                }
            }
            var top = $window.scrollTop() + this.options.positionFromTop;
            var left = $window.scrollLeft();
            this.$lightbox.css({
                top: top + 'px',
                left: left + 'px'
            }).fadeIn(this.options.fadeDuration);
            this.changeImage(imageNumber);
        };
        Lightbox.prototype.changeImage = function(imageNumber) {
            var self = this;
            this.disableKeyboardNav();
            var $image = this.$lightbox.find('.lb-image');
            this.$overlay.fadeIn(this.options.fadeDuration);
            $('.lb-loader').fadeIn('slow');
            this.$lightbox.find('.lb-image, .lb-nav, .lb-prev, .lb-next, .lb-dataContainer, .lb-numbers, .lb-caption').hide();
            this.$outerContainer.addClass('animating');
            var preloader = new Image();
            preloader.onload = function() {
                var $preloader;
                var imageHeight;
                var imageWidth;
                var maxImageHeight;
                var maxImageWidth;
                var windowHeight;
                var windowWidth;
                $image.attr('src', self.album[imageNumber].link);
                $preloader = $(preloader);
                $image.width(preloader.width);
                $image.height(preloader.height);
                if (self.options.fitImagesInViewport) {
                    windowWidth = $(window).width();
                    windowHeight = $(window).height();
                    maxImageWidth = windowWidth - self.containerLeftPadding - self.containerRightPadding - 20;
                    maxImageHeight = windowHeight - self.containerTopPadding - self.containerBottomPadding - 120;
                    if (self.options.maxWidth && self.options.maxWidth < maxImageWidth) {
                        maxImageWidth = self.options.maxWidth;
                    }
                    if (self.options.maxHeight && self.options.maxHeight < maxImageWidth) {
                        maxImageHeight = self.options.maxHeight;
                    }
                    if ((preloader.width > maxImageWidth) || (preloader.height > maxImageHeight)) {
                        if ((preloader.width / maxImageWidth) > (preloader.height / maxImageHeight)) {
                            imageWidth = maxImageWidth;
                            imageHeight = parseInt(preloader.height / (preloader.width / imageWidth), 10);
                            $image.width(imageWidth);
                            $image.height(imageHeight);
                        } else {
                            imageHeight = maxImageHeight;
                            imageWidth = parseInt(preloader.width / (preloader.height / imageHeight), 10);
                            $image.width(imageWidth);
                            $image.height(imageHeight);
                        }
                    }
                }
                self.sizeContainer($image.width(), $image.height());
            };
            preloader.src = this.album[imageNumber].link;
            this.currentImageIndex = imageNumber;
        };
        Lightbox.prototype.sizeOverlay = function() {
            this.$overlay.width($(window).width()).height($(document).height());
        };
        Lightbox.prototype.sizeContainer = function(imageWidth, imageHeight) {
            var self = this;
            var oldWidth = this.$outerContainer.outerWidth();
            var oldHeight = this.$outerContainer.outerHeight();
            var newWidth = imageWidth + this.containerLeftPadding + this.containerRightPadding;
            var newHeight = imageHeight + this.containerTopPadding + this.containerBottomPadding;

            function postResize() {
                self.$lightbox.find('.lb-dataContainer').width(newWidth);
                self.$lightbox.find('.lb-prevLink').height(newHeight);
                self.$lightbox.find('.lb-nextLink').height(newHeight);
                self.showImage();
            }
            if (oldWidth !== newWidth || oldHeight !== newHeight) {
                this.$outerContainer.animate({
                    width: newWidth,
                    height: newHeight
                }, this.options.resizeDuration, 'swing', function() {
                    postResize();
                });
            } else {
                postResize();
            }
        };
        Lightbox.prototype.showImage = function() {
            this.$lightbox.find('.lb-loader').stop(true).hide();
            this.$lightbox.find('.lb-image').fadeIn('slow');
            this.updateNav();
            this.updateDetails();
            this.preloadNeighboringImages();
            this.enableKeyboardNav();
        };
        Lightbox.prototype.updateNav = function() {
            var alwaysShowNav = false;
            try {
                document.createEvent('TouchEvent');
                alwaysShowNav = (this.options.alwaysShowNavOnTouchDevices) ? true : false;
            } catch (e) {}
            this.$lightbox.find('.lb-nav').show();
            if (this.album.length > 1) {
                if (this.options.wrapAround) {
                    if (alwaysShowNav) {
                        this.$lightbox.find('.lb-prev, .lb-next').css('opacity', '1');
                    }
                    this.$lightbox.find('.lb-prev, .lb-next').show();
                } else {
                    if (this.currentImageIndex > 0) {
                        this.$lightbox.find('.lb-prev').show();
                        if (alwaysShowNav) {
                            this.$lightbox.find('.lb-prev').css('opacity', '1');
                        }
                    }
                    if (this.currentImageIndex < this.album.length - 1) {
                        this.$lightbox.find('.lb-next').show();
                        if (alwaysShowNav) {
                            this.$lightbox.find('.lb-next').css('opacity', '1');
                        }
                    }
                }
            }
        };
        Lightbox.prototype.updateDetails = function() {
            var self = this;
            if (typeof this.album[this.currentImageIndex].title !== 'undefined' && this.album[this.currentImageIndex].title !== '') {
                this.$lightbox.find('.lb-caption').html(this.album[this.currentImageIndex].title).fadeIn('fast').find('a').on('click', function(event) {
                    if ($(this).attr('target') !== undefined) {
                        window.open($(this).attr('href'), $(this).attr('target'));
                    } else {
                        location.href = $(this).attr('href');
                    }
                });
            }
            if (this.album.length > 1 && this.options.showImageNumberLabel) {
                var labelText = this.imageCountLabel(this.currentImageIndex + 1, this.album.length);
                this.$lightbox.find('.lb-number').text(labelText).fadeIn('fast');
            } else {
                this.$lightbox.find('.lb-number').hide();
            }
            this.$outerContainer.removeClass('animating');
            this.$lightbox.find('.lb-dataContainer').fadeIn(this.options.resizeDuration, function() {
                return self.sizeOverlay();
            });
        };
        Lightbox.prototype.preloadNeighboringImages = function() {
            if (this.album.length > this.currentImageIndex + 1) {
                var preloadNext = new Image();
                preloadNext.src = this.album[this.currentImageIndex + 1].link;
            }
            if (this.currentImageIndex > 0) {
                var preloadPrev = new Image();
                preloadPrev.src = this.album[this.currentImageIndex - 1].link;
            }
        };
        Lightbox.prototype.enableKeyboardNav = function() {
            $(document).on('keyup.keyboard', $.proxy(this.keyboardAction, this));
        };
        Lightbox.prototype.disableKeyboardNav = function() {
            $(document).off('.keyboard');
        };
        Lightbox.prototype.keyboardAction = function(event) {
            var KEYCODE_ESC = 27;
            var KEYCODE_LEFTARROW = 37;
            var KEYCODE_RIGHTARROW = 39;
            var keycode = event.keyCode;
            var key = String.fromCharCode(keycode).toLowerCase();
            if (keycode === KEYCODE_ESC || key.match(/x|o|c/)) {
                this.end();
            } else if (key === 'p' || keycode === KEYCODE_LEFTARROW) {
                if (this.currentImageIndex !== 0) {
                    this.changeImage(this.currentImageIndex - 1);
                } else if (this.options.wrapAround && this.album.length > 1) {
                    this.changeImage(this.album.length - 1);
                }
            } else if (key === 'n' || keycode === KEYCODE_RIGHTARROW) {
                if (this.currentImageIndex !== this.album.length - 1) {
                    this.changeImage(this.currentImageIndex + 1);
                } else if (this.options.wrapAround && this.album.length > 1) {
                    this.changeImage(0);
                }
            }
        };
        Lightbox.prototype.end = function() {
            this.disableKeyboardNav();
            $(window).off('resize', this.sizeOverlay);
            this.$lightbox.fadeOut(this.options.fadeDuration);
            this.$overlay.fadeOut(this.options.fadeDuration);
            $('select, object, embed').css({
                visibility: 'visible'
            });
        };
        return new Lightbox();
    }));
} catch (e) {}
try {
    /*!
     * Isotope PACKAGED v3.0.6
     *
     * Licensed GPLv3 for open source use
     * or Isotope Commercial License for commercial use
     *
     * https://isotope.metafizzy.co
     * Copyright 2010-2018 Metafizzy
     */
    ! function(t, e) {
        "function" == typeof define && define.amd ? define("jquery-bridget/jquery-bridget", ["jquery"], function(i) {
            return e(t, i)
        }) : "object" == typeof module && module.exports ? module.exports = e(t, require("jquery")) : t.jQueryBridget = e(t, t.jQuery)
    }(window, function(t, e) {
        "use strict";

        function i(i, s, a) {
            function u(t, e, o) {
                var n, s = "$()." + i + '("' + e + '")';
                return t.each(function(t, u) {
                    var h = a.data(u, i);
                    if (!h) return void r(i + " not initialized. Cannot call methods, i.e. " + s);
                    var d = h[e];
                    if (!d || "_" == e.charAt(0)) return void r(s + " is not a valid method");
                    var l = d.apply(h, o);
                    n = void 0 === n ? l : n
                }), void 0 !== n ? n : t
            }

            function h(t, e) {
                t.each(function(t, o) {
                    var n = a.data(o, i);
                    n ? (n.option(e), n._init()) : (n = new s(o, e), a.data(o, i, n))
                })
            }
            a = a || e || t.jQuery, a && (s.prototype.option || (s.prototype.option = function(t) {
                a.isPlainObject(t) && (this.options = a.extend(!0, this.options, t))
            }), a.fn[i] = function(t) {
                if ("string" == typeof t) {
                    var e = n.call(arguments, 1);
                    return u(this, t, e)
                }
                return h(this, t), this
            }, o(a))
        }

        function o(t) {
            !t || t && t.bridget || (t.bridget = i)
        }
        var n = Array.prototype.slice,
            s = t.console,
            r = "undefined" == typeof s ? function() {} : function(t) {
                s.error(t)
            };
        return o(e || t.jQuery), i
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("ev-emitter/ev-emitter", e) : "object" == typeof module && module.exports ? module.exports = e() : t.EvEmitter = e()
    }("undefined" != typeof window ? window : this, function() {
        function t() {}
        var e = t.prototype;
        return e.on = function(t, e) {
            if (t && e) {
                var i = this._events = this._events || {},
                    o = i[t] = i[t] || [];
                return o.indexOf(e) == -1 && o.push(e), this
            }
        }, e.once = function(t, e) {
            if (t && e) {
                this.on(t, e);
                var i = this._onceEvents = this._onceEvents || {},
                    o = i[t] = i[t] || {};
                return o[e] = !0, this
            }
        }, e.off = function(t, e) {
            var i = this._events && this._events[t];
            if (i && i.length) {
                var o = i.indexOf(e);
                return o != -1 && i.splice(o, 1), this
            }
        }, e.emitEvent = function(t, e) {
            var i = this._events && this._events[t];
            if (i && i.length) {
                i = i.slice(0), e = e || [];
                for (var o = this._onceEvents && this._onceEvents[t], n = 0; n < i.length; n++) {
                    var s = i[n],
                        r = o && o[s];
                    r && (this.off(t, s), delete o[s]), s.apply(this, e)
                }
                return this
            }
        }, e.allOff = function() {
            delete this._events, delete this._onceEvents
        }, t
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("get-size/get-size", e) : "object" == typeof module && module.exports ? module.exports = e() : t.getSize = e()
    }(window, function() {
        "use strict";

        function t(t) {
            var e = parseFloat(t),
                i = t.indexOf("%") == -1 && !isNaN(e);
            return i && e
        }

        function e() {}

        function i() {
            for (var t = {
                    width: 0,
                    height: 0,
                    innerWidth: 0,
                    innerHeight: 0,
                    outerWidth: 0,
                    outerHeight: 0
                }, e = 0; e < h; e++) {
                var i = u[e];
                t[i] = 0
            }
            return t
        }

        function o(t) {
            var e = getComputedStyle(t);
            return e || a("Style returned " + e + ". Are you running this code in a hidden iframe on Firefox? See https://bit.ly/getsizebug1"), e
        }

        function n() {
            if (!d) {
                d = !0;
                var e = document.createElement("div");
                e.style.width = "200px", e.style.padding = "1px 2px 3px 4px", e.style.borderStyle = "solid", e.style.borderWidth = "1px 2px 3px 4px", e.style.boxSizing = "border-box";
                var i = document.body || document.documentElement;
                i.appendChild(e);
                var n = o(e);
                r = 200 == Math.round(t(n.width)), s.isBoxSizeOuter = r, i.removeChild(e)
            }
        }

        function s(e) {
            if (n(), "string" == typeof e && (e = document.querySelector(e)), e && "object" == typeof e && e.nodeType) {
                var s = o(e);
                if ("none" == s.display) return i();
                var a = {};
                a.width = e.offsetWidth, a.height = e.offsetHeight;
                for (var d = a.isBorderBox = "border-box" == s.boxSizing, l = 0; l < h; l++) {
                    var f = u[l],
                        c = s[f],
                        m = parseFloat(c);
                    a[f] = isNaN(m) ? 0 : m
                }
                var p = a.paddingLeft + a.paddingRight,
                    y = a.paddingTop + a.paddingBottom,
                    g = a.marginLeft + a.marginRight,
                    v = a.marginTop + a.marginBottom,
                    _ = a.borderLeftWidth + a.borderRightWidth,
                    z = a.borderTopWidth + a.borderBottomWidth,
                    I = d && r,
                    x = t(s.width);
                x !== !1 && (a.width = x + (I ? 0 : p + _));
                var S = t(s.height);
                return S !== !1 && (a.height = S + (I ? 0 : y + z)), a.innerWidth = a.width - (p + _), a.innerHeight = a.height - (y + z), a.outerWidth = a.width + g, a.outerHeight = a.height + v, a
            }
        }
        var r, a = "undefined" == typeof console ? e : function(t) {
                console.error(t)
            },
            u = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "marginLeft", "marginRight", "marginTop", "marginBottom", "borderLeftWidth", "borderRightWidth", "borderTopWidth", "borderBottomWidth"],
            h = u.length,
            d = !1;
        return s
    }),
    function(t, e) {
        "use strict";
        "function" == typeof define && define.amd ? define("desandro-matches-selector/matches-selector", e) : "object" == typeof module && module.exports ? module.exports = e() : t.matchesSelector = e()
    }(window, function() {
        "use strict";
        var t = function() {
            var t = window.Element.prototype;
            if (t.matches) return "matches";
            if (t.matchesSelector) return "matchesSelector";
            for (var e = ["webkit", "moz", "ms", "o"], i = 0; i < e.length; i++) {
                var o = e[i],
                    n = o + "MatchesSelector";
                if (t[n]) return n
            }
        }();
        return function(e, i) {
            return e[t](i)
        }
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("fizzy-ui-utils/utils", ["desandro-matches-selector/matches-selector"], function(i) {
            return e(t, i)
        }) : "object" == typeof module && module.exports ? module.exports = e(t, require("desandro-matches-selector")) : t.fizzyUIUtils = e(t, t.matchesSelector)
    }(window, function(t, e) {
        var i = {};
        i.extend = function(t, e) {
            for (var i in e) t[i] = e[i];
            return t
        }, i.modulo = function(t, e) {
            return (t % e + e) % e
        };
        var o = Array.prototype.slice;
        i.makeArray = function(t) {
            if (Array.isArray(t)) return t;
            if (null === t || void 0 === t) return [];
            var e = "object" == typeof t && "number" == typeof t.length;
            return e ? o.call(t) : [t]
        }, i.removeFrom = function(t, e) {
            var i = t.indexOf(e);
            i != -1 && t.splice(i, 1)
        }, i.getParent = function(t, i) {
            for (; t.parentNode && t != document.body;)
                if (t = t.parentNode, e(t, i)) return t
        }, i.getQueryElement = function(t) {
            return "string" == typeof t ? document.querySelector(t) : t
        }, i.handleEvent = function(t) {
            var e = "on" + t.type;
            this[e] && this[e](t)
        }, i.filterFindElements = function(t, o) {
            t = i.makeArray(t);
            var n = [];
            return t.forEach(function(t) {
                if (t instanceof HTMLElement) {
                    if (!o) return void n.push(t);
                    e(t, o) && n.push(t);
                    for (var i = t.querySelectorAll(o), s = 0; s < i.length; s++) n.push(i[s])
                }
            }), n
        }, i.debounceMethod = function(t, e, i) {
            i = i || 100;
            var o = t.prototype[e],
                n = e + "Timeout";
            t.prototype[e] = function() {
                var t = this[n];
                clearTimeout(t);
                var e = arguments,
                    s = this;
                this[n] = setTimeout(function() {
                    o.apply(s, e), delete s[n]
                }, i)
            }
        }, i.docReady = function(t) {
            var e = document.readyState;
            "complete" == e || "interactive" == e ? setTimeout(t) : document.addEventListener("DOMContentLoaded", t)
        }, i.toDashed = function(t) {
            return t.replace(/(.)([A-Z])/g, function(t, e, i) {
                return e + "-" + i
            }).toLowerCase()
        };
        var n = t.console;
        return i.htmlInit = function(e, o) {
            i.docReady(function() {
                var s = i.toDashed(o),
                    r = "data-" + s,
                    a = document.querySelectorAll("[" + r + "]"),
                    u = document.querySelectorAll(".js-" + s),
                    h = i.makeArray(a).concat(i.makeArray(u)),
                    d = r + "-options",
                    l = t.jQuery;
                h.forEach(function(t) {
                    var i, s = t.getAttribute(r) || t.getAttribute(d);
                    try {
                        i = s && JSON.parse(s)
                    } catch (a) {
                        return void(n && n.error("Error parsing " + r + " on " + t.className + ": " + a))
                    }
                    var u = new e(t, i);
                    l && l.data(t, o, u)
                })
            })
        }, i
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("outlayer/item", ["ev-emitter/ev-emitter", "get-size/get-size"], e) : "object" == typeof module && module.exports ? module.exports = e(require("ev-emitter"), require("get-size")) : (t.Outlayer = {}, t.Outlayer.Item = e(t.EvEmitter, t.getSize))
    }(window, function(t, e) {
        "use strict";

        function i(t) {
            for (var e in t) return !1;
            return e = null, !0
        }

        function o(t, e) {
            t && (this.element = t, this.layout = e, this.position = {
                x: 0,
                y: 0
            }, this._create())
        }

        function n(t) {
            return t.replace(/([A-Z])/g, function(t) {
                return "-" + t.toLowerCase()
            })
        }
        var s = document.documentElement.style,
            r = "string" == typeof s.transition ? "transition" : "WebkitTransition",
            a = "string" == typeof s.transform ? "transform" : "WebkitTransform",
            u = {
                WebkitTransition: "webkitTransitionEnd",
                transition: "transitionend"
            }[r],
            h = {
                transform: a,
                transition: r,
                transitionDuration: r + "Duration",
                transitionProperty: r + "Property",
                transitionDelay: r + "Delay"
            },
            d = o.prototype = Object.create(t.prototype);
        d.constructor = o, d._create = function() {
            this._transn = {
                ingProperties: {},
                clean: {},
                onEnd: {}
            }, this.css({
                position: "absolute"
            })
        }, d.handleEvent = function(t) {
            var e = "on" + t.type;
            this[e] && this[e](t)
        }, d.getSize = function() {
            this.size = e(this.element)
        }, d.css = function(t) {
            var e = this.element.style;
            for (var i in t) {
                var o = h[i] || i;
                e[o] = t[i]
            }
        }, d.getPosition = function() {
            var t = getComputedStyle(this.element),
                e = this.layout._getOption("originLeft"),
                i = this.layout._getOption("originTop"),
                o = t[e ? "left" : "right"],
                n = t[i ? "top" : "bottom"],
                s = parseFloat(o),
                r = parseFloat(n),
                a = this.layout.size;
            o.indexOf("%") != -1 && (s = s / 100 * a.width), n.indexOf("%") != -1 && (r = r / 100 * a.height), s = isNaN(s) ? 0 : s, r = isNaN(r) ? 0 : r, s -= e ? a.paddingLeft : a.paddingRight, r -= i ? a.paddingTop : a.paddingBottom, this.position.x = s, this.position.y = r
        }, d.layoutPosition = function() {
            var t = this.layout.size,
                e = {},
                i = this.layout._getOption("originLeft"),
                o = this.layout._getOption("originTop"),
                n = i ? "paddingLeft" : "paddingRight",
                s = i ? "left" : "right",
                r = i ? "right" : "left",
                a = this.position.x + t[n];
            e[s] = this.getXValue(a), e[r] = "";
            var u = o ? "paddingTop" : "paddingBottom",
                h = o ? "top" : "bottom",
                d = o ? "bottom" : "top",
                l = this.position.y + t[u];
            e[h] = this.getYValue(l), e[d] = "", this.css(e), this.emitEvent("layout", [this])
        }, d.getXValue = function(t) {
            var e = this.layout._getOption("horizontal");
            return this.layout.options.percentPosition && !e ? t / this.layout.size.width * 100 + "%" : t + "px"
        }, d.getYValue = function(t) {
            var e = this.layout._getOption("horizontal");
            return this.layout.options.percentPosition && e ? t / this.layout.size.height * 100 + "%" : t + "px"
        }, d._transitionTo = function(t, e) {
            this.getPosition();
            var i = this.position.x,
                o = this.position.y,
                n = t == this.position.x && e == this.position.y;
            if (this.setPosition(t, e), n && !this.isTransitioning) return void this.layoutPosition();
            var s = t - i,
                r = e - o,
                a = {};
            a.transform = this.getTranslate(s, r), this.transition({
                to: a,
                onTransitionEnd: {
                    transform: this.layoutPosition
                },
                isCleaning: !0
            })
        }, d.getTranslate = function(t, e) {
            var i = this.layout._getOption("originLeft"),
                o = this.layout._getOption("originTop");
            return t = i ? t : -t, e = o ? e : -e, "translate3d(" + t + "px, " + e + "px, 0)"
        }, d.goTo = function(t, e) {
            this.setPosition(t, e), this.layoutPosition()
        }, d.moveTo = d._transitionTo, d.setPosition = function(t, e) {
            this.position.x = parseFloat(t), this.position.y = parseFloat(e)
        }, d._nonTransition = function(t) {
            this.css(t.to), t.isCleaning && this._removeStyles(t.to);
            for (var e in t.onTransitionEnd) t.onTransitionEnd[e].call(this)
        }, d.transition = function(t) {
            if (!parseFloat(this.layout.options.transitionDuration)) return void this._nonTransition(t);
            var e = this._transn;
            for (var i in t.onTransitionEnd) e.onEnd[i] = t.onTransitionEnd[i];
            for (i in t.to) e.ingProperties[i] = !0, t.isCleaning && (e.clean[i] = !0);
            if (t.from) {
                this.css(t.from);
                var o = this.element.offsetHeight;
                o = null
            }
            this.enableTransition(t.to), this.css(t.to), this.isTransitioning = !0
        };
        var l = "opacity," + n(a);
        d.enableTransition = function() {
            if (!this.isTransitioning) {
                var t = this.layout.options.transitionDuration;
                t = "number" == typeof t ? t + "ms" : t, this.css({
                    transitionProperty: l,
                    transitionDuration: t,
                    transitionDelay: this.staggerDelay || 0
                }), this.element.addEventListener(u, this, !1)
            }
        }, d.onwebkitTransitionEnd = function(t) {
            this.ontransitionend(t)
        }, d.onotransitionend = function(t) {
            this.ontransitionend(t)
        };
        var f = {
            "-webkit-transform": "transform"
        };
        d.ontransitionend = function(t) {
            if (t.target === this.element) {
                var e = this._transn,
                    o = f[t.propertyName] || t.propertyName;
                if (delete e.ingProperties[o], i(e.ingProperties) && this.disableTransition(), o in e.clean && (this.element.style[t.propertyName] = "", delete e.clean[o]), o in e.onEnd) {
                    var n = e.onEnd[o];
                    n.call(this), delete e.onEnd[o]
                }
                this.emitEvent("transitionEnd", [this])
            }
        }, d.disableTransition = function() {
            this.removeTransitionStyles(), this.element.removeEventListener(u, this, !1), this.isTransitioning = !1
        }, d._removeStyles = function(t) {
            var e = {};
            for (var i in t) e[i] = "";
            this.css(e)
        };
        var c = {
            transitionProperty: "",
            transitionDuration: "",
            transitionDelay: ""
        };
        return d.removeTransitionStyles = function() {
            this.css(c)
        }, d.stagger = function(t) {
            t = isNaN(t) ? 0 : t, this.staggerDelay = t + "ms"
        }, d.removeElem = function() {
            this.element.parentNode.removeChild(this.element), this.css({
                display: ""
            }), this.emitEvent("remove", [this])
        }, d.remove = function() {
            return r && parseFloat(this.layout.options.transitionDuration) ? (this.once("transitionEnd", function() {
                this.removeElem()
            }), void this.hide()) : void this.removeElem()
        }, d.reveal = function() {
            delete this.isHidden, this.css({
                display: ""
            });
            var t = this.layout.options,
                e = {},
                i = this.getHideRevealTransitionEndProperty("visibleStyle");
            e[i] = this.onRevealTransitionEnd, this.transition({
                from: t.hiddenStyle,
                to: t.visibleStyle,
                isCleaning: !0,
                onTransitionEnd: e
            })
        }, d.onRevealTransitionEnd = function() {
            this.isHidden || this.emitEvent("reveal")
        }, d.getHideRevealTransitionEndProperty = function(t) {
            var e = this.layout.options[t];
            if (e.opacity) return "opacity";
            for (var i in e) return i
        }, d.hide = function() {
            this.isHidden = !0, this.css({
                display: ""
            });
            var t = this.layout.options,
                e = {},
                i = this.getHideRevealTransitionEndProperty("hiddenStyle");
            e[i] = this.onHideTransitionEnd, this.transition({
                from: t.visibleStyle,
                to: t.hiddenStyle,
                isCleaning: !0,
                onTransitionEnd: e
            })
        }, d.onHideTransitionEnd = function() {
            this.isHidden && (this.css({
                display: "none"
            }), this.emitEvent("hide"))
        }, d.destroy = function() {
            this.css({
                position: "",
                left: "",
                right: "",
                top: "",
                bottom: "",
                transition: "",
                transform: ""
            })
        }, o
    }),
    function(t, e) {
        "use strict";
        "function" == typeof define && define.amd ? define("outlayer/outlayer", ["ev-emitter/ev-emitter", "get-size/get-size", "fizzy-ui-utils/utils", "./item"], function(i, o, n, s) {
            return e(t, i, o, n, s)
        }) : "object" == typeof module && module.exports ? module.exports = e(t, require("ev-emitter"), require("get-size"), require("fizzy-ui-utils"), require("./item")) : t.Outlayer = e(t, t.EvEmitter, t.getSize, t.fizzyUIUtils, t.Outlayer.Item)
    }(window, function(t, e, i, o, n) {
        "use strict";

        function s(t, e) {
            var i = o.getQueryElement(t);
            if (!i) return void(u && u.error("Bad element for " + this.constructor.namespace + ": " + (i || t)));
            this.element = i, h && (this.$element = h(this.element)), this.options = o.extend({}, this.constructor.defaults), this.option(e);
            var n = ++l;
            this.element.outlayerGUID = n, f[n] = this, this._create();
            var s = this._getOption("initLayout");
            s && this.layout()
        }

        function r(t) {
            function e() {
                t.apply(this, arguments)
            }
            return e.prototype = Object.create(t.prototype), e.prototype.constructor = e, e
        }

        function a(t) {
            if ("number" == typeof t) return t;
            var e = t.match(/(^\d*\.?\d*)(\w*)/),
                i = e && e[1],
                o = e && e[2];
            if (!i.length) return 0;
            i = parseFloat(i);
            var n = m[o] || 1;
            return i * n
        }
        var u = t.console,
            h = t.jQuery,
            d = function() {},
            l = 0,
            f = {};
        s.namespace = "outlayer", s.Item = n, s.defaults = {
            containerStyle: {
                position: "relative"
            },
            initLayout: !0,
            originLeft: !0,
            originTop: !0,
            resize: !0,
            resizeContainer: !0,
            transitionDuration: "0.4s",
            hiddenStyle: {
                opacity: 0,
                transform: "scale(0.001)"
            },
            visibleStyle: {
                opacity: 1,
                transform: "scale(1)"
            }
        };
        var c = s.prototype;
        o.extend(c, e.prototype), c.option = function(t) {
            o.extend(this.options, t)
        }, c._getOption = function(t) {
            var e = this.constructor.compatOptions[t];
            return e && void 0 !== this.options[e] ? this.options[e] : this.options[t]
        }, s.compatOptions = {
            initLayout: "isInitLayout",
            horizontal: "isHorizontal",
            layoutInstant: "isLayoutInstant",
            originLeft: "isOriginLeft",
            originTop: "isOriginTop",
            resize: "isResizeBound",
            resizeContainer: "isResizingContainer"
        }, c._create = function() {
            this.reloadItems(), this.stamps = [], this.stamp(this.options.stamp), o.extend(this.element.style, this.options.containerStyle);
            var t = this._getOption("resize");
            t && this.bindResize()
        }, c.reloadItems = function() {
            this.items = this._itemize(this.element.children)
        }, c._itemize = function(t) {
            for (var e = this._filterFindItemElements(t), i = this.constructor.Item, o = [], n = 0; n < e.length; n++) {
                var s = e[n],
                    r = new i(s, this);
                o.push(r)
            }
            return o
        }, c._filterFindItemElements = function(t) {
            return o.filterFindElements(t, this.options.itemSelector)
        }, c.getItemElements = function() {
            return this.items.map(function(t) {
                return t.element
            })
        }, c.layout = function() {
            this._resetLayout(), this._manageStamps();
            var t = this._getOption("layoutInstant"),
                e = void 0 !== t ? t : !this._isLayoutInited;
            this.layoutItems(this.items, e), this._isLayoutInited = !0
        }, c._init = c.layout, c._resetLayout = function() {
            this.getSize()
        }, c.getSize = function() {
            this.size = i(this.element)
        }, c._getMeasurement = function(t, e) {
            var o, n = this.options[t];
            n ? ("string" == typeof n ? o = this.element.querySelector(n) : n instanceof HTMLElement && (o = n), this[t] = o ? i(o)[e] : n) : this[t] = 0
        }, c.layoutItems = function(t, e) {
            t = this._getItemsForLayout(t), this._layoutItems(t, e), this._postLayout()
        }, c._getItemsForLayout = function(t) {
            return t.filter(function(t) {
                return !t.isIgnored
            })
        }, c._layoutItems = function(t, e) {
            if (this._emitCompleteOnItems("layout", t), t && t.length) {
                var i = [];
                t.forEach(function(t) {
                    var o = this._getItemLayoutPosition(t);
                    o.item = t, o.isInstant = e || t.isLayoutInstant, i.push(o)
                }, this), this._processLayoutQueue(i)
            }
        }, c._getItemLayoutPosition = function() {
            return {
                x: 0,
                y: 0
            }
        }, c._processLayoutQueue = function(t) {
            this.updateStagger(), t.forEach(function(t, e) {
                this._positionItem(t.item, t.x, t.y, t.isInstant, e)
            }, this)
        }, c.updateStagger = function() {
            var t = this.options.stagger;
            return null === t || void 0 === t ? void(this.stagger = 0) : (this.stagger = a(t), this.stagger)
        }, c._positionItem = function(t, e, i, o, n) {
            o ? t.goTo(e, i) : (t.stagger(n * this.stagger), t.moveTo(e, i))
        }, c._postLayout = function() {
            this.resizeContainer()
        }, c.resizeContainer = function() {
            var t = this._getOption("resizeContainer");
            if (t) {
                var e = this._getContainerSize();
                e && (this._setContainerMeasure(e.width, !0), this._setContainerMeasure(e.height, !1))
            }
        }, c._getContainerSize = d, c._setContainerMeasure = function(t, e) {
            if (void 0 !== t) {
                var i = this.size;
                i.isBorderBox && (t += e ? i.paddingLeft + i.paddingRight + i.borderLeftWidth + i.borderRightWidth : i.paddingBottom + i.paddingTop + i.borderTopWidth + i.borderBottomWidth), t = Math.max(t, 0), this.element.style[e ? "width" : "height"] = t + "px"
            }
        }, c._emitCompleteOnItems = function(t, e) {
            function i() {
                n.dispatchEvent(t + "Complete", null, [e])
            }

            function o() {
                r++, r == s && i()
            }
            var n = this,
                s = e.length;
            if (!e || !s) return void i();
            var r = 0;
            e.forEach(function(e) {
                e.once(t, o)
            })
        }, c.dispatchEvent = function(t, e, i) {
            var o = e ? [e].concat(i) : i;
            if (this.emitEvent(t, o), h)
                if (this.$element = this.$element || h(this.element), e) {
                    var n = h.Event(e);
                    n.type = t, this.$element.trigger(n, i)
                } else this.$element.trigger(t, i)
        }, c.ignore = function(t) {
            var e = this.getItem(t);
            e && (e.isIgnored = !0)
        }, c.unignore = function(t) {
            var e = this.getItem(t);
            e && delete e.isIgnored
        }, c.stamp = function(t) {
            t = this._find(t), t && (this.stamps = this.stamps.concat(t), t.forEach(this.ignore, this))
        }, c.unstamp = function(t) {
            t = this._find(t), t && t.forEach(function(t) {
                o.removeFrom(this.stamps, t), this.unignore(t)
            }, this)
        }, c._find = function(t) {
            if (t) return "string" == typeof t && (t = this.element.querySelectorAll(t)), t = o.makeArray(t)
        }, c._manageStamps = function() {
            this.stamps && this.stamps.length && (this._getBoundingRect(), this.stamps.forEach(this._manageStamp, this))
        }, c._getBoundingRect = function() {
            var t = this.element.getBoundingClientRect(),
                e = this.size;
            this._boundingRect = {
                left: t.left + e.paddingLeft + e.borderLeftWidth,
                top: t.top + e.paddingTop + e.borderTopWidth,
                right: t.right - (e.paddingRight + e.borderRightWidth),
                bottom: t.bottom - (e.paddingBottom + e.borderBottomWidth)
            }
        }, c._manageStamp = d, c._getElementOffset = function(t) {
            var e = t.getBoundingClientRect(),
                o = this._boundingRect,
                n = i(t),
                s = {
                    left: e.left - o.left - n.marginLeft,
                    top: e.top - o.top - n.marginTop,
                    right: o.right - e.right - n.marginRight,
                    bottom: o.bottom - e.bottom - n.marginBottom
                };
            return s
        }, c.handleEvent = o.handleEvent, c.bindResize = function() {
            t.addEventListener("resize", this), this.isResizeBound = !0
        }, c.unbindResize = function() {
            t.removeEventListener("resize", this), this.isResizeBound = !1
        }, c.onresize = function() {
            this.resize()
        }, o.debounceMethod(s, "onresize", 100), c.resize = function() {
            this.isResizeBound && this.needsResizeLayout() && this.layout()
        }, c.needsResizeLayout = function() {
            var t = i(this.element),
                e = this.size && t;
            return e && t.innerWidth !== this.size.innerWidth
        }, c.addItems = function(t) {
            var e = this._itemize(t);
            return e.length && (this.items = this.items.concat(e)), e
        }, c.appended = function(t) {
            var e = this.addItems(t);
            e.length && (this.layoutItems(e, !0), this.reveal(e))
        }, c.prepended = function(t) {
            var e = this._itemize(t);
            if (e.length) {
                var i = this.items.slice(0);
                this.items = e.concat(i), this._resetLayout(), this._manageStamps(), this.layoutItems(e, !0), this.reveal(e), this.layoutItems(i)
            }
        }, c.reveal = function(t) {
            if (this._emitCompleteOnItems("reveal", t), t && t.length) {
                var e = this.updateStagger();
                t.forEach(function(t, i) {
                    t.stagger(i * e), t.reveal()
                })
            }
        }, c.hide = function(t) {
            if (this._emitCompleteOnItems("hide", t), t && t.length) {
                var e = this.updateStagger();
                t.forEach(function(t, i) {
                    t.stagger(i * e), t.hide()
                })
            }
        }, c.revealItemElements = function(t) {
            var e = this.getItems(t);
            this.reveal(e)
        }, c.hideItemElements = function(t) {
            var e = this.getItems(t);
            this.hide(e)
        }, c.getItem = function(t) {
            for (var e = 0; e < this.items.length; e++) {
                var i = this.items[e];
                if (i.element == t) return i
            }
        }, c.getItems = function(t) {
            t = o.makeArray(t);
            var e = [];
            return t.forEach(function(t) {
                var i = this.getItem(t);
                i && e.push(i)
            }, this), e
        }, c.remove = function(t) {
            var e = this.getItems(t);
            this._emitCompleteOnItems("remove", e), e && e.length && e.forEach(function(t) {
                t.remove(), o.removeFrom(this.items, t)
            }, this)
        }, c.destroy = function() {
            var t = this.element.style;
            t.height = "", t.position = "", t.width = "", this.items.forEach(function(t) {
                t.destroy()
            }), this.unbindResize();
            var e = this.element.outlayerGUID;
            delete f[e], delete this.element.outlayerGUID, h && h.removeData(this.element, this.constructor.namespace)
        }, s.data = function(t) {
            t = o.getQueryElement(t);
            var e = t && t.outlayerGUID;
            return e && f[e]
        }, s.create = function(t, e) {
            var i = r(s);
            return i.defaults = o.extend({}, s.defaults), o.extend(i.defaults, e), i.compatOptions = o.extend({}, s.compatOptions), i.namespace = t, i.data = s.data, i.Item = r(n), o.htmlInit(i, t), h && h.bridget && h.bridget(t, i), i
        };
        var m = {
            ms: 1,
            s: 1e3
        };
        return s.Item = n, s
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("isotope-layout/js/item", ["outlayer/outlayer"], e) : "object" == typeof module && module.exports ? module.exports = e(require("outlayer")) : (t.Isotope = t.Isotope || {}, t.Isotope.Item = e(t.Outlayer))
    }(window, function(t) {
        "use strict";

        function e() {
            t.Item.apply(this, arguments)
        }
        var i = e.prototype = Object.create(t.Item.prototype),
            o = i._create;
        i._create = function() {
            this.id = this.layout.itemGUID++, o.call(this), this.sortData = {}
        }, i.updateSortData = function() {
            if (!this.isIgnored) {
                this.sortData.id = this.id, this.sortData["original-order"] = this.id, this.sortData.random = Math.random();
                var t = this.layout.options.getSortData,
                    e = this.layout._sorters;
                for (var i in t) {
                    var o = e[i];
                    this.sortData[i] = o(this.element, this)
                }
            }
        };
        var n = i.destroy;
        return i.destroy = function() {
            n.apply(this, arguments), this.css({
                display: ""
            })
        }, e
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("isotope-layout/js/layout-mode", ["get-size/get-size", "outlayer/outlayer"], e) : "object" == typeof module && module.exports ? module.exports = e(require("get-size"), require("outlayer")) : (t.Isotope = t.Isotope || {}, t.Isotope.LayoutMode = e(t.getSize, t.Outlayer))
    }(window, function(t, e) {
        "use strict";

        function i(t) {
            this.isotope = t, t && (this.options = t.options[this.namespace], this.element = t.element, this.items = t.filteredItems, this.size = t.size)
        }
        var o = i.prototype,
            n = ["_resetLayout", "_getItemLayoutPosition", "_manageStamp", "_getContainerSize", "_getElementOffset", "needsResizeLayout", "_getOption"];
        return n.forEach(function(t) {
            o[t] = function() {
                return e.prototype[t].apply(this.isotope, arguments)
            }
        }), o.needsVerticalResizeLayout = function() {
            var e = t(this.isotope.element),
                i = this.isotope.size && e;
            return i && e.innerHeight != this.isotope.size.innerHeight
        }, o._getMeasurement = function() {
            this.isotope._getMeasurement.apply(this, arguments)
        }, o.getColumnWidth = function() {
            this.getSegmentSize("column", "Width")
        }, o.getRowHeight = function() {
            this.getSegmentSize("row", "Height")
        }, o.getSegmentSize = function(t, e) {
            var i = t + e,
                o = "outer" + e;
            if (this._getMeasurement(i, o), !this[i]) {
                var n = this.getFirstItemSize();
                this[i] = n && n[o] || this.isotope.size["inner" + e]
            }
        }, o.getFirstItemSize = function() {
            var e = this.isotope.filteredItems[0];
            return e && e.element && t(e.element)
        }, o.layout = function() {
            this.isotope.layout.apply(this.isotope, arguments)
        }, o.getSize = function() {
            this.isotope.getSize(), this.size = this.isotope.size
        }, i.modes = {}, i.create = function(t, e) {
            function n() {
                i.apply(this, arguments)
            }
            return n.prototype = Object.create(o), n.prototype.constructor = n, e && (n.options = e), n.prototype.namespace = t, i.modes[t] = n, n
        }, i
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("masonry-layout/masonry", ["outlayer/outlayer", "get-size/get-size"], e) : "object" == typeof module && module.exports ? module.exports = e(require("outlayer"), require("get-size")) : t.Masonry = e(t.Outlayer, t.getSize)
    }(window, function(t, e) {
        var i = t.create("masonry");
        i.compatOptions.fitWidth = "isFitWidth";
        var o = i.prototype;
        return o._resetLayout = function() {
            this.getSize(), this._getMeasurement("columnWidth", "outerWidth"), this._getMeasurement("gutter", "outerWidth"), this.measureColumns(), this.colYs = [];
            for (var t = 0; t < this.cols; t++) this.colYs.push(0);
            this.maxY = 0, this.horizontalColIndex = 0
        }, o.measureColumns = function() {
            if (this.getContainerWidth(), !this.columnWidth) {
                var t = this.items[0],
                    i = t && t.element;
                this.columnWidth = i && e(i).outerWidth || this.containerWidth
            }
            var o = this.columnWidth += this.gutter,
                n = this.containerWidth + this.gutter,
                s = n / o,
                r = o - n % o,
                a = r && r < 1 ? "round" : "floor";
            s = Math[a](s), this.cols = Math.max(s, 1)
        }, o.getContainerWidth = function() {
            var t = this._getOption("fitWidth"),
                i = t ? this.element.parentNode : this.element,
                o = e(i);
            this.containerWidth = o && o.innerWidth
        }, o._getItemLayoutPosition = function(t) {
            t.getSize();
            var e = t.size.outerWidth % this.columnWidth,
                i = e && e < 1 ? "round" : "ceil",
                o = Math[i](t.size.outerWidth / this.columnWidth);
            o = Math.min(o, this.cols);
            for (var n = this.options.horizontalOrder ? "_getHorizontalColPosition" : "_getTopColPosition", s = this[n](o, t), r = {
                    x: this.columnWidth * s.col,
                    y: s.y
                }, a = s.y + t.size.outerHeight, u = o + s.col, h = s.col; h < u; h++) this.colYs[h] = a;
            return r
        }, o._getTopColPosition = function(t) {
            var e = this._getTopColGroup(t),
                i = Math.min.apply(Math, e);
            return {
                col: e.indexOf(i),
                y: i
            }
        }, o._getTopColGroup = function(t) {
            if (t < 2) return this.colYs;
            for (var e = [], i = this.cols + 1 - t, o = 0; o < i; o++) e[o] = this._getColGroupY(o, t);
            return e
        }, o._getColGroupY = function(t, e) {
            if (e < 2) return this.colYs[t];
            var i = this.colYs.slice(t, t + e);
            return Math.max.apply(Math, i)
        }, o._getHorizontalColPosition = function(t, e) {
            var i = this.horizontalColIndex % this.cols,
                o = t > 1 && i + t > this.cols;
            i = o ? 0 : i;
            var n = e.size.outerWidth && e.size.outerHeight;
            return this.horizontalColIndex = n ? i + t : this.horizontalColIndex, {
                col: i,
                y: this._getColGroupY(i, t)
            }
        }, o._manageStamp = function(t) {
            var i = e(t),
                o = this._getElementOffset(t),
                n = this._getOption("originLeft"),
                s = n ? o.left : o.right,
                r = s + i.outerWidth,
                a = Math.floor(s / this.columnWidth);
            a = Math.max(0, a);
            var u = Math.floor(r / this.columnWidth);
            u -= r % this.columnWidth ? 0 : 1, u = Math.min(this.cols - 1, u);
            for (var h = this._getOption("originTop"), d = (h ? o.top : o.bottom) + i.outerHeight, l = a; l <= u; l++) this.colYs[l] = Math.max(d, this.colYs[l])
        }, o._getContainerSize = function() {
            this.maxY = Math.max.apply(Math, this.colYs);
            var t = {
                height: this.maxY
            };
            return this._getOption("fitWidth") && (t.width = this._getContainerFitWidth()), t
        }, o._getContainerFitWidth = function() {
            for (var t = 0, e = this.cols; --e && 0 === this.colYs[e];) t++;
            return (this.cols - t) * this.columnWidth - this.gutter
        }, o.needsResizeLayout = function() {
            var t = this.containerWidth;
            return this.getContainerWidth(), t != this.containerWidth
        }, i
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("isotope-layout/js/layout-modes/masonry", ["../layout-mode", "masonry-layout/masonry"], e) : "object" == typeof module && module.exports ? module.exports = e(require("../layout-mode"), require("masonry-layout")) : e(t.Isotope.LayoutMode, t.Masonry)
    }(window, function(t, e) {
        "use strict";
        var i = t.create("masonry"),
            o = i.prototype,
            n = {
                _getElementOffset: !0,
                layout: !0,
                _getMeasurement: !0
            };
        for (var s in e.prototype) n[s] || (o[s] = e.prototype[s]);
        var r = o.measureColumns;
        o.measureColumns = function() {
            this.items = this.isotope.filteredItems, r.call(this)
        };
        var a = o._getOption;
        return o._getOption = function(t) {
            return "fitWidth" == t ? void 0 !== this.options.isFitWidth ? this.options.isFitWidth : this.options.fitWidth : a.apply(this.isotope, arguments)
        }, i
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("isotope-layout/js/layout-modes/fit-rows", ["../layout-mode"], e) : "object" == typeof exports ? module.exports = e(require("../layout-mode")) : e(t.Isotope.LayoutMode)
    }(window, function(t) {
        "use strict";
        var e = t.create("fitRows"),
            i = e.prototype;
        return i._resetLayout = function() {
            this.x = 0, this.y = 0, this.maxY = 0, this._getMeasurement("gutter", "outerWidth")
        }, i._getItemLayoutPosition = function(t) {
            t.getSize();
            var e = t.size.outerWidth + this.gutter,
                i = this.isotope.size.innerWidth + this.gutter;
            0 !== this.x && e + this.x > i && (this.x = 0, this.y = this.maxY);
            var o = {
                x: this.x,
                y: this.y
            };
            return this.maxY = Math.max(this.maxY, this.y + t.size.outerHeight), this.x += e, o
        }, i._getContainerSize = function() {
            return {
                height: this.maxY
            }
        }, e
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define("isotope-layout/js/layout-modes/vertical", ["../layout-mode"], e) : "object" == typeof module && module.exports ? module.exports = e(require("../layout-mode")) : e(t.Isotope.LayoutMode)
    }(window, function(t) {
        "use strict";
        var e = t.create("vertical", {
                horizontalAlignment: 0
            }),
            i = e.prototype;
        return i._resetLayout = function() {
            this.y = 0
        }, i._getItemLayoutPosition = function(t) {
            t.getSize();
            var e = (this.isotope.size.innerWidth - t.size.outerWidth) * this.options.horizontalAlignment,
                i = this.y;
            return this.y += t.size.outerHeight, {
                x: e,
                y: i
            }
        }, i._getContainerSize = function() {
            return {
                height: this.y
            }
        }, e
    }),
    function(t, e) {
        "function" == typeof define && define.amd ? define(["outlayer/outlayer", "get-size/get-size", "desandro-matches-selector/matches-selector", "fizzy-ui-utils/utils", "isotope-layout/js/item", "isotope-layout/js/layout-mode", "isotope-layout/js/layout-modes/masonry", "isotope-layout/js/layout-modes/fit-rows", "isotope-layout/js/layout-modes/vertical"], function(i, o, n, s, r, a) {
            return e(t, i, o, n, s, r, a)
        }) : "object" == typeof module && module.exports ? module.exports = e(t, require("outlayer"), require("get-size"), require("desandro-matches-selector"), require("fizzy-ui-utils"), require("isotope-layout/js/item"), require("isotope-layout/js/layout-mode"), require("isotope-layout/js/layout-modes/masonry"), require("isotope-layout/js/layout-modes/fit-rows"), require("isotope-layout/js/layout-modes/vertical")) : t.Isotope = e(t, t.Outlayer, t.getSize, t.matchesSelector, t.fizzyUIUtils, t.Isotope.Item, t.Isotope.LayoutMode)
    }(window, function(t, e, i, o, n, s, r) {
        function a(t, e) {
            return function(i, o) {
                for (var n = 0; n < t.length; n++) {
                    var s = t[n],
                        r = i.sortData[s],
                        a = o.sortData[s];
                    if (r > a || r < a) {
                        var u = void 0 !== e[s] ? e[s] : e,
                            h = u ? 1 : -1;
                        return (r > a ? 1 : -1) * h
                    }
                }
                return 0
            }
        }
        var u = t.jQuery,
            h = String.prototype.trim ? function(t) {
                return t.trim()
            } : function(t) {
                return t.replace(/^\s+|\s+$/g, "")
            },
            d = e.create("isotope", {
                layoutMode: "masonry",
                isJQueryFiltering: !0,
                sortAscending: !0
            });
        d.Item = s, d.LayoutMode = r;
        var l = d.prototype;
        l._create = function() {
            this.itemGUID = 0, this._sorters = {}, this._getSorters(), e.prototype._create.call(this), this.modes = {}, this.filteredItems = this.items, this.sortHistory = ["original-order"];
            for (var t in r.modes) this._initLayoutMode(t)
        }, l.reloadItems = function() {
            this.itemGUID = 0, e.prototype.reloadItems.call(this)
        }, l._itemize = function() {
            for (var t = e.prototype._itemize.apply(this, arguments), i = 0; i < t.length; i++) {
                var o = t[i];
                o.id = this.itemGUID++
            }
            return this._updateItemsSortData(t), t
        }, l._initLayoutMode = function(t) {
            var e = r.modes[t],
                i = this.options[t] || {};
            this.options[t] = e.options ? n.extend(e.options, i) : i, this.modes[t] = new e(this)
        }, l.layout = function() {
            return !this._isLayoutInited && this._getOption("initLayout") ? void this.arrange() : void this._layout()
        }, l._layout = function() {
            var t = this._getIsInstant();
            this._resetLayout(), this._manageStamps(), this.layoutItems(this.filteredItems, t), this._isLayoutInited = !0
        }, l.arrange = function(t) {
            this.option(t), this._getIsInstant();
            var e = this._filter(this.items);
            this.filteredItems = e.matches, this._bindArrangeComplete(), this._isInstant ? this._noTransition(this._hideReveal, [e]) : this._hideReveal(e), this._sort(), this._layout()
        }, l._init = l.arrange, l._hideReveal = function(t) {
            this.reveal(t.needReveal), this.hide(t.needHide)
        }, l._getIsInstant = function() {
            var t = this._getOption("layoutInstant"),
                e = void 0 !== t ? t : !this._isLayoutInited;
            return this._isInstant = e, e
        }, l._bindArrangeComplete = function() {
            function t() {
                e && i && o && n.dispatchEvent("arrangeComplete", null, [n.filteredItems])
            }
            var e, i, o, n = this;
            this.once("layoutComplete", function() {
                e = !0, t()
            }), this.once("hideComplete", function() {
                i = !0, t()
            }), this.once("revealComplete", function() {
                o = !0, t()
            })
        }, l._filter = function(t) {
            var e = this.options.filter;
            e = e || "*";
            for (var i = [], o = [], n = [], s = this._getFilterTest(e), r = 0; r < t.length; r++) {
                var a = t[r];
                if (!a.isIgnored) {
                    var u = s(a);
                    u && i.push(a), u && a.isHidden ? o.push(a) : u || a.isHidden || n.push(a)
                }
            }
            return {
                matches: i,
                needReveal: o,
                needHide: n
            }
        }, l._getFilterTest = function(t) {
            return u && this.options.isJQueryFiltering ? function(e) {
                return u(e.element).is(t);
            } : "function" == typeof t ? function(e) {
                return t(e.element)
            } : function(e) {
                return o(e.element, t)
            }
        }, l.updateSortData = function(t) {
            var e;
            t ? (t = n.makeArray(t), e = this.getItems(t)) : e = this.items, this._getSorters(), this._updateItemsSortData(e)
        }, l._getSorters = function() {
            var t = this.options.getSortData;
            for (var e in t) {
                var i = t[e];
                this._sorters[e] = f(i)
            }
        }, l._updateItemsSortData = function(t) {
            for (var e = t && t.length, i = 0; e && i < e; i++) {
                var o = t[i];
                o.updateSortData()
            }
        };
        var f = function() {
            function t(t) {
                if ("string" != typeof t) return t;
                var i = h(t).split(" "),
                    o = i[0],
                    n = o.match(/^\[(.+)\]$/),
                    s = n && n[1],
                    r = e(s, o),
                    a = d.sortDataParsers[i[1]];
                return t = a ? function(t) {
                    return t && a(r(t))
                } : function(t) {
                    return t && r(t)
                }
            }

            function e(t, e) {
                return t ? function(e) {
                    return e.getAttribute(t)
                } : function(t) {
                    var i = t.querySelector(e);
                    return i && i.textContent
                }
            }
            return t
        }();
        d.sortDataParsers = {
            parseInt: function(t) {
                return parseInt(t, 10)
            },
            parseFloat: function(t) {
                return parseFloat(t)
            }
        }, l._sort = function() {
            if (this.options.sortBy) {
                var t = n.makeArray(this.options.sortBy);
                this._getIsSameSortBy(t) || (this.sortHistory = t.concat(this.sortHistory));
                var e = a(this.sortHistory, this.options.sortAscending);
                this.filteredItems.sort(e)
            }
        }, l._getIsSameSortBy = function(t) {
            for (var e = 0; e < t.length; e++)
                if (t[e] != this.sortHistory[e]) return !1;
            return !0
        }, l._mode = function() {
            var t = this.options.layoutMode,
                e = this.modes[t];
            if (!e) throw new Error("No layout mode: " + t);
            return e.options = this.options[t], e
        }, l._resetLayout = function() {
            e.prototype._resetLayout.call(this), this._mode()._resetLayout()
        }, l._getItemLayoutPosition = function(t) {
            return this._mode()._getItemLayoutPosition(t)
        }, l._manageStamp = function(t) {
            this._mode()._manageStamp(t)
        }, l._getContainerSize = function() {
            return this._mode()._getContainerSize()
        }, l.needsResizeLayout = function() {
            return this._mode().needsResizeLayout()
        }, l.appended = function(t) {
            var e = this.addItems(t);
            if (e.length) {
                var i = this._filterRevealAdded(e);
                this.filteredItems = this.filteredItems.concat(i)
            }
        }, l.prepended = function(t) {
            var e = this._itemize(t);
            if (e.length) {
                this._resetLayout(), this._manageStamps();
                var i = this._filterRevealAdded(e);
                this.layoutItems(this.filteredItems), this.filteredItems = i.concat(this.filteredItems), this.items = e.concat(this.items)
            }
        }, l._filterRevealAdded = function(t) {
            var e = this._filter(t);
            return this.hide(e.needHide), this.reveal(e.matches), this.layoutItems(e.matches, !0), e.matches
        }, l.insert = function(t) {
            var e = this.addItems(t);
            if (e.length) {
                var i, o, n = e.length;
                for (i = 0; i < n; i++) o = e[i], this.element.appendChild(o.element);
                var s = this._filter(e).matches;
                for (i = 0; i < n; i++) e[i].isLayoutInstant = !0;
                for (this.arrange(), i = 0; i < n; i++) delete e[i].isLayoutInstant;
                this.reveal(s)
            }
        };
        var c = l.remove;
        return l.remove = function(t) {
            t = n.makeArray(t);
            var e = this.getItems(t);
            c.call(this, t);
            for (var i = e && e.length, o = 0; i && o < i; o++) {
                var s = e[o];
                n.removeFrom(this.filteredItems, s)
            }
        }, l.shuffle = function() {
            for (var t = 0; t < this.items.length; t++) {
                var e = this.items[t];
                e.sortData.random = Math.random()
            }
            this.options.sortBy = "random", this._sort(), this._layout()
        }, l._noTransition = function(t, e) {
            var i = this.options.transitionDuration;
            this.options.transitionDuration = 0;
            var o = t.apply(this, e);
            return this.options.transitionDuration = i, o
        }, l.getFilteredItemElements = function() {
            return this.filteredItems.map(function(t) {
                return t.element
            })
        }, d
    });
} catch (e) {}
try {;
    window.Modernizr = function(a, b, c) {
            function z(a) {
                j.cssText = a
            }

            function A(a, b) {
                return z(m.join(a + ";") + (b || ""))
            }

            function B(a, b) {
                return typeof a === b
            }

            function C(a, b) {
                return !!~("" + a).indexOf(b)
            }

            function D(a, b) {
                for (var d in a) {
                    var e = a[d];
                    if (!C(e, "-") && j[e] !== c) return b == "pfx" ? e : !0
                }
                return !1
            }

            function E(a, b, d) {
                for (var e in a) {
                    var f = b[a[e]];
                    if (f !== c) return d === !1 ? a[e] : B(f, "function") ? f.bind(d || b) : f
                }
                return !1
            }

            function F(a, b, c) {
                var d = a.charAt(0).toUpperCase() + a.slice(1),
                    e = (a + " " + o.join(d + " ") + d).split(" ");
                return B(b, "string") || B(b, "undefined") ? D(e, b) : (e = (a + " " + p.join(d + " ") + d).split(" "), E(e, b, c))
            }
            var d = "2.6.2",
                e = {},
                f = !0,
                g = b.documentElement,
                h = "modernizr",
                i = b.createElement(h),
                j = i.style,
                k, l = {}.toString,
                m = " -webkit- -moz- -o- -ms- ".split(" "),
                n = "Webkit Moz O ms",
                o = n.split(" "),
                p = n.toLowerCase().split(" "),
                q = {},
                r = {},
                s = {},
                t = [],
                u = t.slice,
                v, w = function(a, c, d, e) {
                    var f, i, j, k, l = b.createElement("div"),
                        m = b.body,
                        n = m || b.createElement("body");
                    if (parseInt(d, 10))
                        while (d--) j = b.createElement("div"), j.id = e ? e[d] : h + (d + 1), l.appendChild(j);
                    return f = ["&#173;", '<style id="s', h, '">', a, "</style>"].join(""), l.id = h, (m ? l : n).innerHTML += f, n.appendChild(l), m || (n.style.background = "", n.style.overflow = "hidden", k = g.style.overflow, g.style.overflow = "hidden", g.appendChild(n)), i = c(l, a), m ? l.parentNode.removeChild(l) : (n.parentNode.removeChild(n), g.style.overflow = k), !!i
                },
                x = {}.hasOwnProperty,
                y;
            !B(x, "undefined") && !B(x.call, "undefined") ? y = function(a, b) {
                return x.call(a, b)
            } : y = function(a, b) {
                return b in a && B(a.constructor.prototype[b], "undefined")
            }, Function.prototype.bind || (Function.prototype.bind = function(b) {
                var c = this;
                if (typeof c != "function") throw new TypeError;
                var d = u.call(arguments, 1),
                    e = function() {
                        if (this instanceof e) {
                            var a = function() {};
                            a.prototype = c.prototype;
                            var f = new a,
                                g = c.apply(f, d.concat(u.call(arguments)));
                            return Object(g) === g ? g : f
                        }
                        return c.apply(b, d.concat(u.call(arguments)))
                    };
                return e
            }), q.touch = function() {
                var c;
                return "ontouchstart" in a || a.DocumentTouch && b instanceof DocumentTouch ? c = !0 : w(["@media (", m.join("touch-enabled),("), h, ")", "{#modernizr{top:9px;position:absolute}}"].join(""), function(a) {
                    c = a.offsetTop === 9
                }), c
            }, q.backgroundsize = function() {
                return F("backgroundSize")
            }, q.csstransforms3d = function() {
                var a = !!F("perspective");
                return a && "webkitPerspective" in g.style && w("@media (transform-3d),(-webkit-transform-3d){#modernizr{left:9px;position:absolute;height:3px;}}", function(b, c) {
                    a = b.offsetLeft === 9 && b.offsetHeight === 3
                }), a
            }, q.csstransitions = function() {
                return F("transition")
            };
            for (var G in q) y(q, G) && (v = G.toLowerCase(), e[v] = q[G](), t.push((e[v] ? "" : "no-") + v));
            return e.addTest = function(a, b) {
                    if (typeof a == "object")
                        for (var d in a) y(a, d) && e.addTest(d, a[d]);
                    else {
                        a = a.toLowerCase();
                        if (e[a] !== c) return e;
                        b = typeof b == "function" ? b() : b, typeof f != "undefined" && f && (g.className += " " + (b ? "" : "no-") + a), e[a] = b
                    }
                    return e
                }, z(""), i = k = null,
                function(a, b) {
                    function k(a, b) {
                        var c = a.createElement("p"),
                            d = a.getElementsByTagName("head")[0] || a.documentElement;
                        return c.innerHTML = "x<style>" + b + "</style>", d.insertBefore(c.lastChild, d.firstChild)
                    }

                    function l() {
                        var a = r.elements;
                        return typeof a == "string" ? a.split(" ") : a
                    }

                    function m(a) {
                        var b = i[a[g]];
                        return b || (b = {}, h++, a[g] = h, i[h] = b), b
                    }

                    function n(a, c, f) {
                        c || (c = b);
                        if (j) return c.createElement(a);
                        f || (f = m(c));
                        var g;
                        return f.cache[a] ? g = f.cache[a].cloneNode() : e.test(a) ? g = (f.cache[a] = f.createElem(a)).cloneNode() : g = f.createElem(a), g.canHaveChildren && !d.test(a) ? f.frag.appendChild(g) : g
                    }

                    function o(a, c) {
                        a || (a = b);
                        if (j) return a.createDocumentFragment();
                        c = c || m(a);
                        var d = c.frag.cloneNode(),
                            e = 0,
                            f = l(),
                            g = f.length;
                        for (; e < g; e++) d.createElement(f[e]);
                        return d
                    }

                    function p(a, b) {
                        b.cache || (b.cache = {}, b.createElem = a.createElement, b.createFrag = a.createDocumentFragment, b.frag = b.createFrag()), a.createElement = function(c) {
                            return r.shivMethods ? n(c, a, b) : b.createElem(c)
                        }, a.createDocumentFragment = Function("h,f", "return function(){var n=f.cloneNode(),c=n.createElement;h.shivMethods&&(" + l().join().replace(/\w+/g, function(a) {
                            return b.createElem(a), b.frag.createElement(a), 'c("' + a + '")'
                        }) + ");return n}")(r, b.frag)
                    }

                    function q(a) {
                        a || (a = b);
                        var c = m(a);
                        return r.shivCSS && !f && !c.hasCSS && (c.hasCSS = !!k(a, "article,aside,figcaption,figure,footer,header,hgroup,nav,section{display:block}mark{background:#FF0;color:#000}")), j || p(a, c), a
                    }
                    var c = a.html5 || {},
                        d = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i,
                        e = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i,
                        f, g = "_html5shiv",
                        h = 0,
                        i = {},
                        j;
                    (function() {
                        try {
                            var a = b.createElement("a");
                            a.innerHTML = "<xyz></xyz>", f = "hidden" in a, j = a.childNodes.length == 1 || function() {
                                b.createElement("a");
                                var a = b.createDocumentFragment();
                                return typeof a.cloneNode == "undefined" || typeof a.createDocumentFragment == "undefined" || typeof a.createElement == "undefined"
                            }()
                        } catch (c) {
                            f = !0, j = !0
                        }
                    })();
                    var r = {
                        elements: c.elements || "abbr article aside audio bdi canvas data datalist details figcaption figure footer header hgroup mark meter nav output progress section summary time video",
                        shivCSS: c.shivCSS !== !1,
                        supportsUnknownElements: j,
                        shivMethods: c.shivMethods !== !1,
                        type: "default",
                        shivDocument: q,
                        createElement: n,
                        createDocumentFragment: o
                    };
                    a.html5 = r, q(b)
                }(this, b), e._version = d, e._prefixes = m, e._domPrefixes = p, e._cssomPrefixes = o, e.testProp = function(a) {
                    return D([a])
                }, e.testAllProps = F, e.testStyles = w, e.prefixed = function(a, b, c) {
                    return b ? F(a, b, c) : F(a, "pfx")
                }, g.className = g.className.replace(/(^|\s)no-js(\s|$)/, "$1$2") + (f ? " js " + t.join(" ") : ""), e
        }(this, this.document),
        function(a, b, c) {
            function d(a) {
                return "[object Function]" == o.call(a)
            }

            function e(a) {
                return "string" == typeof a
            }

            function f() {}

            function g(a) {
                return !a || "loaded" == a || "complete" == a || "uninitialized" == a
            }

            function h() {
                var a = p.shift();
                q = 1, a ? a.t ? m(function() {
                    ("c" == a.t ? B.injectCss : B.injectJs)(a.s, 0, a.a, a.x, a.e, 1)
                }, 0) : (a(), h()) : q = 0
            }

            function i(a, c, d, e, f, i, j) {
                function k(b) {
                    if (!o && g(l.readyState) && (u.r = o = 1, !q && h(), l.onload = l.onreadystatechange = null, b)) {
                        "img" != a && m(function() {
                            t.removeChild(l)
                        }, 50);
                        for (var d in y[c]) y[c].hasOwnProperty(d) && y[c][d].onload()
                    }
                }
                var j = j || B.errorTimeout,
                    l = b.createElement(a),
                    o = 0,
                    r = 0,
                    u = {
                        t: d,
                        s: c,
                        e: f,
                        a: i,
                        x: j
                    };
                1 === y[c] && (r = 1, y[c] = []), "object" == a ? l.data = c : (l.src = c, l.type = a), l.width = l.height = "0", l.onerror = l.onload = l.onreadystatechange = function() {
                    k.call(this, r)
                }, p.splice(e, 0, u), "img" != a && (r || 2 === y[c] ? (t.insertBefore(l, s ? null : n), m(k, j)) : y[c].push(l))
            }

            function j(a, b, c, d, f) {
                return q = 0, b = b || "j", e(a) ? i("c" == b ? v : u, a, b, this.i++, c, d, f) : (p.splice(this.i++, 0, a), 1 == p.length && h()), this
            }

            function k() {
                var a = B;
                return a.loader = {
                    load: j,
                    i: 0
                }, a
            }
            var l = b.documentElement,
                m = a.setTimeout,
                n = b.getElementsByTagName("script")[0],
                o = {}.toString,
                p = [],
                q = 0,
                r = "MozAppearance" in l.style,
                s = r && !!b.createRange().compareNode,
                t = s ? l : n.parentNode,
                l = a.opera && "[object Opera]" == o.call(a.opera),
                l = !!b.attachEvent && !l,
                u = r ? "object" : l ? "script" : "img",
                v = l ? "script" : u,
                w = Array.isArray || function(a) {
                    return "[object Array]" == o.call(a)
                },
                x = [],
                y = {},
                z = {
                    timeout: function(a, b) {
                        return b.length && (a.timeout = b[0]), a
                    }
                },
                A, B;
            B = function(a) {
                function b(a) {
                    var a = a.split("!"),
                        b = x.length,
                        c = a.pop(),
                        d = a.length,
                        c = {
                            url: c,
                            origUrl: c,
                            prefixes: a
                        },
                        e, f, g;
                    for (f = 0; f < d; f++) g = a[f].split("="), (e = z[g.shift()]) && (c = e(c, g));
                    for (f = 0; f < b; f++) c = x[f](c);
                    return c
                }

                function g(a, e, f, g, h) {
                    var i = b(a),
                        j = i.autoCallback;
                    i.url.split(".").pop().split("?").shift(), i.bypass || (e && (e = d(e) ? e : e[a] || e[g] || e[a.split("/").pop().split("?")[0]]), i.instead ? i.instead(a, e, f, g, h) : (y[i.url] ? i.noexec = !0 : y[i.url] = 1, f.load(i.url, i.forceCSS || !i.forceJS && "css" == i.url.split(".").pop().split("?").shift() ? "c" : c, i.noexec, i.attrs, i.timeout), (d(e) || d(j)) && f.load(function() {
                        k(), e && e(i.origUrl, h, g), j && j(i.origUrl, h, g), y[i.url] = 2
                    })))
                }

                function h(a, b) {
                    function c(a, c) {
                        if (a) {
                            if (e(a)) c || (j = function() {
                                var a = [].slice.call(arguments);
                                k.apply(this, a), l()
                            }), g(a, j, b, 0, h);
                            else if (Object(a) === a)
                                for (n in m = function() {
                                        var b = 0,
                                            c;
                                        for (c in a) a.hasOwnProperty(c) && b++;
                                        return b
                                    }(), a) a.hasOwnProperty(n) && (!c && !--m && (d(j) ? j = function() {
                                    var a = [].slice.call(arguments);
                                    k.apply(this, a), l()
                                } : j[n] = function(a) {
                                    return function() {
                                        var b = [].slice.call(arguments);
                                        a && a.apply(this, b), l()
                                    }
                                }(k[n])), g(a[n], j, b, n, h))
                        } else !c && l()
                    }
                    var h = !!a.test,
                        i = a.load || a.both,
                        j = a.callback || f,
                        k = j,
                        l = a.complete || f,
                        m, n;
                    c(h ? a.yep : a.nope, !!i), i && c(i)
                }
                var i, j, l = this.yepnope.loader;
                if (e(a)) g(a, 0, l, 0);
                else if (w(a))
                    for (i = 0; i < a.length; i++) j = a[i], e(j) ? g(j, 0, l, 0) : w(j) ? B(j) : Object(j) === j && h(j, l);
                else Object(a) === a && h(a, l)
            }, B.addPrefix = function(a, b) {
                z[a] = b
            }, B.addFilter = function(a) {
                x.push(a)
            }, B.errorTimeout = 1e4, null == b.readyState && b.addEventListener && (b.readyState = "loading", b.addEventListener("DOMContentLoaded", A = function() {
                b.removeEventListener("DOMContentLoaded", A, 0), b.readyState = "complete"
            }, 0)), a.yepnope = k(), a.yepnope.executeStack = h, a.yepnope.injectJs = function(a, c, d, e, i, j) {
                var k = b.createElement("script"),
                    l, o, e = e || B.errorTimeout;
                k.src = a;
                for (o in d) k.setAttribute(o, d[o]);
                c = j ? h : c || f, k.onreadystatechange = k.onload = function() {
                    !l && g(k.readyState) && (l = 1, c(), k.onload = k.onreadystatechange = null)
                }, m(function() {
                    l || (l = 1, c(1))
                }, e), i ? k.onload() : n.parentNode.insertBefore(k, n)
            }, a.yepnope.injectCss = function(a, c, d, e, g, i) {
                var e = b.createElement("link"),
                    j, c = i ? h : c || f;
                e.href = a, e.rel = "stylesheet", e.type = "text/css";
                for (j in d) e.setAttribute(j, d[j]);
                g || (n.parentNode.insertBefore(e, n), m(c, 0))
            }
        }(this, document), Modernizr.load = function() {
            yepnope.apply(window, [].slice.call(arguments, 0))
        };
} catch (e) {}
try {;
    (function($, window, undefined) {
        'use strict';
        var $event = $.event,
            $special, resizeTimeout;
        $special = $event.special.debouncedresize = {
            setup: function() {
                $(this).on("resize", $special.handler);
            },
            teardown: function() {
                $(this).off("resize", $special.handler);
            },
            handler: function(event, execAsap) {
                var context = this,
                    args = arguments,
                    dispatch = function() {
                        event.type = "debouncedresize";
                        $event.dispatch.apply(context, args);
                    };
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                execAsap ? dispatch() : resizeTimeout = setTimeout(dispatch, $special.threshold);
            },
            threshold: 100
        };
        Array.prototype.shuffle = function() {
            var i = this.length,
                p, t;
            while (i--) {
                p = Math.floor(Math.random() * i);
                t = this[i];
                this[i] = this[p];
                this[p] = t;
            }
            return this;
        };

        function getHiddenProp() {
            var prefixes = ['webkit', 'moz', 'ms', 'o'];
            if ('hidden' in document) return 'hidden';
            for (var i = 0; i < prefixes.length; i++) {
                if ((prefixes[i] + 'Hidden') in document)
                    return prefixes[i] + 'Hidden';
            }
            return null;
        }

        function isHidden() {
            var prop = getHiddenProp();
            if (!prop) return false;
            return document[prop];
        }

        function isEmpty(obj) {
            return Object.keys(obj).length === 0;
        }
        var $window = $(window),
            Modernizr = window.Modernizr;
        $.GridRotator = function(options, element) {
            this.$el = $(element);
            if (Modernizr.backgroundsize) {
                var self = this;
                this.$el.addClass('ri-grid-loading');
                this._init(options);
            }
        };
        $.GridRotator.defaults = {
            rows: 4,
            columns: 10,
            w1024: {
                rows: 3,
                columns: 8
            },
            w768: {
                rows: 3,
                columns: 7
            },
            w480: {
                rows: 3,
                columns: 5
            },
            w320: {
                rows: 2,
                columns: 4
            },
            w240: {
                rows: 2,
                columns: 3
            },
            step: 'random',
            maxStep: 3,
            preventClick: true,
            animType: 'random',
            animSpeed: 800,
            animEasingOut: 'linear',
            animEasingIn: 'linear',
            interval: 3000,
            slideshow: true,
            onhover: false,
            nochange: []
        };
        $.GridRotator.prototype = {
            _init: function(options) {
                this.options = $.extend(true, {}, $.GridRotator.defaults, options);
                this._config();
            },
            _config: function() {
                var self = this,
                    transEndEventNames = {
                        'WebkitTransition': 'webkitTransitionEnd',
                        'MozTransition': 'transitionend',
                        'OTransition': 'oTransitionEnd',
                        'msTransition': 'MSTransitionEnd',
                        'transition': 'transitionend'
                    };
                this.supportTransitions = Modernizr.csstransitions;
                this.supportTransforms3D = Modernizr.csstransforms3d;
                this.transEndEventName = transEndEventNames[Modernizr.prefixed('transition')] + '.gridrotator';
                this.animTypes = this.supportTransforms3D ? ['fadeInOut', 'slideLeft', 'slideRight', 'slideTop', 'slideBottom', 'rotateLeft', 'rotateRight', 'rotateTop', 'rotateBottom', 'scale', 'rotate3d', 'rotateLeftScale', 'rotateRightScale', 'rotateTopScale', 'rotateBottomScale'] : ['fadeInOut', 'slideLeft', 'slideRight', 'slideTop', 'slideBottom'];
                this.animType = this.options.animType;
                if (this.animType !== 'random' && !this.supportTransforms3D && $.inArray(this.animType, this.animTypes) === -1 && this.animType !== 'showHide') {
                    this.animType = 'fadeInOut';
                }
                this.animTypesTotal = this.animTypes.length;
                this.$list = this.$el.children('ul');
                var loaded = 0,
                    $imgs = this.$list.find('img'),
                    count = $imgs.length;
                $imgs.each(function() {
                    var $img = $(this),
                        src = $img.attr('src');
                    $('<img/>').load(function() {
                        ++loaded;
                        $img.parent().css('background-image', 'url(' + src + ')');
                        if (loaded === count) {
                            $imgs.remove();
                            self.$el.removeClass('ri-grid-loading');
                            self.$items = self.$list.children('li');
                            self.$itemsCache = self.$items.clone();
                            self.itemsTotal = self.$items.length;
                            self.outItems = [];
                            self._layout(function() {
                                self._initEvents();
                            });
                            self._start();
                        }
                    }).attr('src', src)
                });
            },
            _layout: function(callback) {
                var self = this;
                this._setGridDim();
                this.$list.empty();
                this.$items = this.$itemsCache.clone().appendTo(this.$list);
                var $outItems = this.$items.filter(':gt(' + (this.showTotal - 1) + ')'),
                    $outAItems = $outItems.children('a');
                this.outItems.length = 0;
                $outAItems.each(function(i) {
                    self.outItems.push($(this));
                });
                $outItems.remove();
                var containerWidth = (document.defaultView) ? parseInt(document.defaultView.getComputedStyle(this.$el.get(0), null).width) : this.$el.width(),
                    itemWidth = Math.floor(containerWidth / this.columns),
                    gapWidth = containerWidth - (this.columns * Math.floor(itemWidth));
                for (var i = 0; i < this.rows; ++i) {
                    for (var j = 0; j < this.columns; ++j) {
                        var idx = this.columns * i + j,
                            $item = this.$items.eq(idx);
                        $item.css({
                            width: j < Math.floor(gapWidth) ? itemWidth + 1 : itemWidth,
                            height: itemWidth
                        });
                        if ($.inArray(idx, this.options.nochange) !== -1) {
                            $item.addClass('ri-nochange').data('nochange', true);
                        }
                    }
                }
                if (this.options.preventClick) {
                    this.$items.children().css('cursor', 'default').on('click.gridrotator', false);
                }
                if (callback) {
                    callback.call();
                }
            },
            _setGridDim: function() {
                var c_w = this.$el.width();
                switch (true) {
                    case (c_w < 240):
                        this.rows = this.options.w240.rows;
                        this.columns = this.options.w240.columns;
                        break;
                    case (c_w < 320):
                        this.rows = this.options.w320.rows;
                        this.columns = this.options.w320.columns;
                        break;
                    case (c_w < 480):
                        this.rows = this.options.w480.rows;
                        this.columns = this.options.w480.columns;
                        break;
                    case (c_w < 768):
                        this.rows = this.options.w768.rows;
                        this.columns = this.options.w768.columns;
                        break;
                    case (c_w < 1024):
                        this.rows = this.options.w1024.rows;
                        this.columns = this.options.w1024.columns;
                        break;
                    default:
                        this.rows = this.options.rows;
                        this.columns = this.options.columns;
                        break;
                }
                this.showTotal = this.rows * this.columns;
            },
            _initEvents: function() {
                var self = this;
                $window.on('debouncedresize.gridrotator', function() {
                    self._layout();
                });
                var visProp = getHiddenProp();
                if (visProp) {
                    var evtname = visProp.replace(/[H|h]idden/, '') + 'visibilitychange';
                    document.addEventListener(evtname, function() {
                        self._visChange();
                    });
                }
                if (!Modernizr.touch && this.options.onhover) {
                    self.$items.on('mouseenter.gridrotator', function() {
                        var $item = $(this);
                        if (!$item.data('active') && !$item.data('hovered') && !$item.data('nochange')) {
                            $item.data('hovered', true);
                            self._replace($item);
                        }
                    }).on('mouseleave.gridrotator', function() {
                        $(this).data('hovered', false);
                    });
                }
            },
            _visChange: function() {
                isHidden() ? clearTimeout(this.playtimeout) : this._start();
            },
            _start: function() {
                if (this.showTotal < this.itemsTotal && this.options.slideshow) {
                    this._showNext();
                }
            },
            _getAnimType: function() {
                return this.animType === 'random' ? this.animTypes[Math.floor(Math.random() * this.animTypesTotal)] : this.animType;
            },
            _getAnimProperties: function($out) {
                var startInProp = {},
                    startOutProp = {},
                    endInProp = {},
                    endOutProp = {},
                    animType = this._getAnimType(),
                    speed, delay = 0;
                switch (animType) {
                    case 'showHide':
                        speed = 0;
                        endOutProp.opacity = 0;
                        break;
                    case 'fadeInOut':
                        endOutProp.opacity = 0;
                        break;
                    case 'slideLeft':
                        startInProp.left = $out.width();
                        endInProp.left = 0;
                        endOutProp.left = -$out.width();
                        break;
                    case 'slideRight':
                        startInProp.left = -$out.width();
                        endInProp.left = 0;
                        endOutProp.left = $out.width();
                        break;
                    case 'slideTop':
                        startInProp.top = $out.height();
                        endInProp.top = 0;
                        endOutProp.top = -$out.height();
                        break;
                    case 'slideBottom':
                        startInProp.top = -$out.height();
                        endInProp.top = 0;
                        endOutProp.top = $out.height();
                        break;
                    case 'rotateLeft':
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'rotateY(90deg)';
                        endInProp.transform = 'rotateY(0deg)';
                        delay = speed;
                        endOutProp.transform = 'rotateY(-90deg)';
                        break;
                    case 'rotateRight':
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'rotateY(-90deg)';
                        endInProp.transform = 'rotateY(0deg)';
                        delay = speed;
                        endOutProp.transform = 'rotateY(90deg)';
                        break;
                    case 'rotateTop':
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'rotateX(90deg)';
                        endInProp.transform = 'rotateX(0deg)';
                        delay = speed;
                        endOutProp.transform = 'rotateX(-90deg)';
                        break;
                    case 'rotateBottom':
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'rotateX(-90deg)';
                        endInProp.transform = 'rotateX(0deg)';
                        delay = speed;
                        endOutProp.transform = 'rotateX(90deg)';
                        break;
                    case 'scale':
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'scale(0)';
                        startOutProp.transform = 'scale(1)';
                        endInProp.transform = 'scale(1)';
                        delay = speed;
                        endOutProp.transform = 'scale(0)';
                        break;
                    case 'rotateLeftScale':
                        startOutProp.transform = 'scale(1)';
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'scale(0.3) rotateY(90deg)';
                        endInProp.transform = 'scale(1) rotateY(0deg)';
                        delay = speed;
                        endOutProp.transform = 'scale(0.3) rotateY(-90deg)';
                        break;
                    case 'rotateRightScale':
                        startOutProp.transform = 'scale(1)';
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'scale(0.3) rotateY(-90deg)';
                        endInProp.transform = 'scale(1) rotateY(0deg)';
                        delay = speed;
                        endOutProp.transform = 'scale(0.3) rotateY(90deg)';
                        break;
                    case 'rotateTopScale':
                        startOutProp.transform = 'scale(1)';
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'scale(0.3) rotateX(90deg)';
                        endInProp.transform = 'scale(1) rotateX(0deg)';
                        delay = speed;
                        endOutProp.transform = 'scale(0.3) rotateX(-90deg)';
                        break;
                    case 'rotateBottomScale':
                        startOutProp.transform = 'scale(1)';
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'scale(0.3) rotateX(-90deg)';
                        endInProp.transform = 'scale(1) rotateX(0deg)';
                        delay = speed;
                        endOutProp.transform = 'scale(0.3) rotateX(90deg)';
                        break;
                    case 'rotate3d':
                        speed = this.options.animSpeed / 2;
                        startInProp.transform = 'rotate3d( 1, 1, 0, 90deg )';
                        endInProp.transform = 'rotate3d( 1, 1, 0, 0deg )';
                        delay = speed;
                        endOutProp.transform = 'rotate3d( 1, 1, 0, -90deg )';
                        break;
                }
                return {
                    startInProp: startInProp,
                    startOutProp: startOutProp,
                    endInProp: endInProp,
                    endOutProp: endOutProp,
                    delay: delay,
                    animSpeed: speed != undefined ? speed : this.options.animSpeed
                };
            },
            _showNext: function(time) {
                var self = this;
                clearTimeout(this.playtimeout);
                this.playtimeout = setTimeout(function() {
                    var step = self.options.step,
                        max = self.options.maxStep,
                        min = 1;
                    if (max > self.showTotal) {
                        max = self.showTotal;
                    }
                    var nmbOut = step === 'random' ? Math.floor(Math.random() * max + min) : Math.min(Math.abs(step), max),
                        randArr = self._getRandom(nmbOut, self.showTotal);
                    for (var i = 0; i < nmbOut; ++i) {
                        var $out = self.$items.eq(randArr[i]);
                        if ($out.data('active') || $out.data('nochange')) {
                            self._showNext(1);
                            return false;
                        }
                        self._replace($out);
                    }
                    self._showNext();
                }, time || Math.max(Math.abs(this.options.interval), 300));
            },
            _replace: function($out) {
                $out.data('active', true);
                var self = this,
                    $outA = $out.children('a:last'),
                    newElProp = {
                        width: $outA.width(),
                        height: $outA.height()
                    };
                $out.data('active', true);
                var $inA = this.outItems.shift();
                this.outItems.push($outA.clone().css('transition', 'none'));
                $inA.css(newElProp).prependTo($out);
                var animProp = this._getAnimProperties($outA);
                $inA.css(animProp.startInProp);
                $outA.css(animProp.startOutProp);
                this._setTransition($inA, 'all', animProp.animSpeed, animProp.delay, this.options.animEasingIn);
                this._setTransition($outA, 'all', animProp.animSpeed, 0, this.options.animEasingOut);
                this._applyTransition($inA, animProp.endInProp, animProp.animSpeed, function() {
                    var $el = $(this),
                        t = animProp.animSpeed === self.options.animSpeed && isEmpty(animProp.endInProp) ? animProp.animSpeed : 0;
                    setTimeout(function() {
                        if (self.supportTransitions) {
                            $el.off(self.transEndEventName);
                        }
                        $el.next().remove();
                        $el.parent().data('active', false);
                    }, t);
                }, animProp.animSpeed === 0 || isEmpty(animProp.endInProp));
                this._applyTransition($outA, animProp.endOutProp, animProp.animSpeed);
            },
            _getRandom: function(cnt, limit) {
                var randArray = [];
                for (var i = 0; i < limit; ++i) {
                    randArray.push(i)
                }
                return randArray.shuffle().slice(0, cnt);
            },
            _setTransition: function(el, prop, speed, delay, easing) {
                setTimeout(function() {
                    el.css('transition', prop + ' ' + speed + 'ms ' + delay + 'ms ' + easing);
                }, 25);
            },
            _applyTransition: function(el, styleCSS, speed, fncomplete, force) {
                var self = this;
                setTimeout(function() {
                    $.fn.applyStyle = self.supportTransitions ? $.fn.css : $.fn.animate;
                    if (fncomplete && self.supportTransitions) {
                        el.on(self.transEndEventName, fncomplete);
                        if (force) {
                            fncomplete.call(el);
                        }
                    }
                    fncomplete = fncomplete || function() {
                        return false;
                    };
                    el.stop().applyStyle(styleCSS, $.extend(true, [], {
                        duration: speed + 'ms',
                        complete: fncomplete
                    }));
                }, 25);
            }
        };
        var logError = function(message) {
            if (window.console) {
                window.console.error(message);
            }
        };
        $.fn.gridrotator = function(options) {
            var instance = $.data(this, 'gridrotator');
            if (typeof options === 'string') {
                var args = Array.prototype.slice.call(arguments, 1);
                this.each(function() {
                    if (!instance) {
                        logError("cannot call methods on gridrotator prior to initialization; " + "attempted to call method '" + options + "'");
                        return;
                    }
                    if (!$.isFunction(instance[options]) || options.charAt(0) === "_") {
                        logError("no such method '" + options + "' for gridrotator instance");
                        return;
                    }
                    instance[options].apply(instance, args);
                });
            } else {
                this.each(function() {
                    if (instance) {
                        instance._init();
                    } else {
                        instance = $.data(this, 'gridrotator', new $.GridRotator(options, this));
                    }
                });
            }
            return instance;
        };
    })(jQuery, window);
} catch (e) {}
try {
    jQuery(document).ready(function($) {
        $('.ifgrid').isotope({
            itemSelector: '.element-itemif',
        });
        $(".apif-owl-carousel").owlCarousel({
            margin: 10,
            loop: true,
            autoplay: true,
            autoplaySpeed: 500,
            responsive: {
                0: {
                    items: 1
                },
                600: {
                    items: 2
                },
                1000: {
                    items: 3
                }
            }
        });
        $('.ri-grid').gridrotator({
            rows: '2',
            columns: '5',
            maxStep: 2,
            interval: 2000,
            preventClick: false,
            w1024: {
                rows: '2',
                columns: '5'
            },
            w768: {
                rows: '2',
                columns: '5'
            },
            w480: {
                rows: '2',
                columns: '5'
            },
            w320: {
                rows: '2',
                columns: '5'
            },
            w240: {
                rows: '2',
                columns: '5'
            }
        });
    });

    function initHoverEffectForThumbView() {
        jQuery('.thumb-elem, .grid-elem header').each(function() {
            var thisElem = jQuery(this);
            var getElemWidth = thisElem.width();
            var getElemHeight = thisElem.height();
            var centerX = getElemWidth / 2;
            var centerY = getElemHeight / 2;
            thisElem.mouseenter(function() {
                thisElem.on('mousemove', function(e) {
                    var mouseX = e.pageX - thisElem.offset().left;
                    var mouseY = e.pageY - thisElem.offset().top;
                    var mouseDistX = (mouseX / centerX) * 100 - 100;
                    var mouseDistY = (mouseY / centerY) * 100 - 100;
                });
                thisElem.find('.thumb-elem-section:not(.no-feat-img)').fadeIn('fast');
            }).mouseleave(function() {
                thisElem.find('.thumb-elem-section:not(.no-feat-img)').fadeOut('fast');
            });
        });
    }

    function initSimpleHoverEffectForThumbView() {
        jQuery('.thumb-elem, .grid-elem header').each(function() {
            var thisElem = jQuery(this);
            thisElem.mouseenter(function() {
                thisElem.find('.thumb-elem-section:not(.no-feat-img)').fadeIn('fast');
            }).mouseleave(function() {
                thisElem.find('.thumb-elem-section:not(.no-feat-img)').fadeOut('fast');
            });
        });
    }
    jQuery(window).load(function() {
        "use strict";
        if (!hoverEffect.disable_hover_effect && jQuery(window).width() > 768) {
            initHoverEffectForThumbView();
        } else {
            initSimpleHoverEffectForThumbView();
        }
    });
    var hoverEffect = {
        "disable_hover_effect": ""
    };
} catch (e) {}
try {
    var wpcf7 = {
        "apiSettings": {
            "root": "https:\/\/www.kleopatra.com.tr\/wp-json\/contact-form-7\/v1",
            "namespace": "contact-form-7\/v1"
        }
    };
} catch (e) {}
try {
    (function($) {
        'use strict';
        if (typeof wpcf7 === 'undefined' || wpcf7 === null) {
            return;
        }
        wpcf7 = $.extend({
            cached: 0,
            inputs: []
        }, wpcf7);
        $(function() {
            wpcf7.supportHtml5 = (function() {
                var features = {};
                var input = document.createElement('input');
                features.placeholder = 'placeholder' in input;
                var inputTypes = ['email', 'url', 'tel', 'number', 'range', 'date'];
                $.each(inputTypes, function(index, value) {
                    input.setAttribute('type', value);
                    features[value] = input.type !== 'text';
                });
                return features;
            })();
            $('div.wpcf7 > form').each(function() {
                var $form = $(this);
                wpcf7.initForm($form);
                if (wpcf7.cached) {
                    wpcf7.refill($form);
                }
            });
        });
        wpcf7.getId = function(form) {
            return parseInt($('input[name="_wpcf7"]', form).val(), 10);
        };
        wpcf7.initForm = function(form) {
            var $form = $(form);
            wpcf7.setStatus($form, 'init');
            $form.submit(function(event) {
                if (!wpcf7.supportHtml5.placeholder) {
                    $('[placeholder].placeheld', $form).each(function(i, n) {
                        $(n).val('').removeClass('placeheld');
                    });
                }
                if (typeof window.FormData === 'function') {
                    wpcf7.submit($form);
                    event.preventDefault();
                }
            });
            $('.wpcf7-submit', $form).after('<span class="ajax-loader"></span>');
            wpcf7.toggleSubmit($form);
            $form.on('click', '.wpcf7-acceptance', function() {
                wpcf7.toggleSubmit($form);
            });
            $('.wpcf7-exclusive-checkbox', $form).on('click', 'input:checkbox', function() {
                var name = $(this).attr('name');
                $form.find('input:checkbox[name="' + name + '"]').not(this).prop('checked', false);
            });
            $('.wpcf7-list-item.has-free-text', $form).each(function() {
                var $freetext = $(':input.wpcf7-free-text', this);
                var $wrap = $(this).closest('.wpcf7-form-control');
                if ($(':checkbox, :radio', this).is(':checked')) {
                    $freetext.prop('disabled', false);
                } else {
                    $freetext.prop('disabled', true);
                }
                $wrap.on('change', ':checkbox, :radio', function() {
                    var $cb = $('.has-free-text', $wrap).find(':checkbox, :radio');
                    if ($cb.is(':checked')) {
                        $freetext.prop('disabled', false).focus();
                    } else {
                        $freetext.prop('disabled', true);
                    }
                });
            });
            if (!wpcf7.supportHtml5.placeholder) {
                $('[placeholder]', $form).each(function() {
                    $(this).val($(this).attr('placeholder'));
                    $(this).addClass('placeheld');
                    $(this).focus(function() {
                        if ($(this).hasClass('placeheld')) {
                            $(this).val('').removeClass('placeheld');
                        }
                    });
                    $(this).blur(function() {
                        if ('' === $(this).val()) {
                            $(this).val($(this).attr('placeholder'));
                            $(this).addClass('placeheld');
                        }
                    });
                });
            }
            if (wpcf7.jqueryUi && !wpcf7.supportHtml5.date) {
                $form.find('input.wpcf7-date[type="date"]').each(function() {
                    $(this).datepicker({
                        dateFormat: 'yy-mm-dd',
                        minDate: new Date($(this).attr('min')),
                        maxDate: new Date($(this).attr('max'))
                    });
                });
            }
            if (wpcf7.jqueryUi && !wpcf7.supportHtml5.number) {
                $form.find('input.wpcf7-number[type="number"]').each(function() {
                    $(this).spinner({
                        min: $(this).attr('min'),
                        max: $(this).attr('max'),
                        step: $(this).attr('step')
                    });
                });
            }
            wpcf7.resetCounter($form);
            $form.on('change', '.wpcf7-validates-as-url', function() {
                var val = $.trim($(this).val());
                if (val && !val.match(/^[a-z][a-z0-9.+-]*:/i) && -1 !== val.indexOf('.')) {
                    val = val.replace(/^\/+/, '');
                    val = 'http://' + val;
                }
                $(this).val(val);
            });
        };
        wpcf7.submit = function(form) {
            if (typeof window.FormData !== 'function') {
                return;
            }
            var $form = $(form);
            $('.ajax-loader', $form).addClass('is-active');
            wpcf7.clearResponse($form);
            var formData = new FormData($form.get(0));
            var detail = {
                id: $form.closest('div.wpcf7').attr('id'),
                status: 'init',
                inputs: [],
                formData: formData
            };
            $.each($form.serializeArray(), function(i, field) {
                if ('_wpcf7' == field.name) {
                    detail.contactFormId = field.value;
                } else if ('_wpcf7_version' == field.name) {
                    detail.pluginVersion = field.value;
                } else if ('_wpcf7_locale' == field.name) {
                    detail.contactFormLocale = field.value;
                } else if ('_wpcf7_unit_tag' == field.name) {
                    detail.unitTag = field.value;
                } else if ('_wpcf7_container_post' == field.name) {
                    detail.containerPostId = field.value;
                } else if (field.name.match(/^_/)) {} else {
                    detail.inputs.push(field);
                }
            });
            wpcf7.triggerEvent($form.closest('div.wpcf7'), 'beforesubmit', detail);
            var ajaxSuccess = function(data, status, xhr, $form) {
                detail.id = $(data.into).attr('id');
                detail.status = data.status;
                detail.apiResponse = data;
                switch (data.status) {
                    case 'init':
                        wpcf7.setStatus($form, 'init');
                        break;
                    case 'validation_failed':
                        $.each(data.invalid_fields, function(i, n) {
                            $(n.into, $form).each(function() {
                                wpcf7.notValidTip(this, n.message);
                                $('.wpcf7-form-control', this).addClass('wpcf7-not-valid');
                                $('.wpcf7-form-control', this).attr('aria-describedby', n.error_id);
                                $('[aria-invalid]', this).attr('aria-invalid', 'true');
                            });
                        });
                        wpcf7.setStatus($form, 'invalid');
                        wpcf7.triggerEvent(data.into, 'invalid', detail);
                        break;
                    case 'acceptance_missing':
                        wpcf7.setStatus($form, 'unaccepted');
                        wpcf7.triggerEvent(data.into, 'unaccepted', detail);
                        break;
                    case 'spam':
                        wpcf7.setStatus($form, 'spam');
                        wpcf7.triggerEvent(data.into, 'spam', detail);
                        break;
                    case 'aborted':
                        wpcf7.setStatus($form, 'aborted');
                        wpcf7.triggerEvent(data.into, 'aborted', detail);
                        break;
                    case 'mail_sent':
                        wpcf7.setStatus($form, 'sent');
                        wpcf7.triggerEvent(data.into, 'mailsent', detail);
                        break;
                    case 'mail_failed':
                        wpcf7.setStatus($form, 'failed');
                        wpcf7.triggerEvent(data.into, 'mailfailed', detail);
                        break;
                    default:
                        wpcf7.setStatus($form, 'custom-' + data.status.replace(/[^0-9a-z]+/i, '-'));
                }
                wpcf7.refill($form, data);
                wpcf7.triggerEvent(data.into, 'submit', detail);
                if ('mail_sent' == data.status) {
                    $form.each(function() {
                        this.reset();
                    });
                    wpcf7.toggleSubmit($form);
                    wpcf7.resetCounter($form);
                }
                if (!wpcf7.supportHtml5.placeholder) {
                    $form.find('[placeholder].placeheld').each(function(i, n) {
                        $(n).val($(n).attr('placeholder'));
                    });
                }
                $('.wpcf7-response-output', $form).html('').append(data.message).slideDown('fast');
                $('.screen-reader-response', $form.closest('.wpcf7')).each(function() {
                    var $response = $(this);
                    $('[role="status"]', $response).html(data.message);
                    if (data.invalid_fields) {
                        $.each(data.invalid_fields, function(i, n) {
                            if (n.idref) {
                                var $li = $('<li></li>').append($('<a></a>').attr('href', '#' + n.idref).append(n.message));
                            } else {
                                var $li = $('<li></li>').append(n.message);
                            }
                            $li.attr('id', n.error_id);
                            $('ul', $response).append($li);
                        });
                    }
                });
                if (data.posted_data_hash) {
                    $form.find('input[name="_wpcf7_posted_data_hash"]').first().val(data.posted_data_hash);
                }
            };
            $.ajax({
                type: 'POST',
                url: wpcf7.apiSettings.getRoute('/contact-forms/' + wpcf7.getId($form) + '/feedback'),
                data: formData,
                dataType: 'json',
                processData: false,
                contentType: false
            }).done(function(data, status, xhr) {
                ajaxSuccess(data, status, xhr, $form);
                $('.ajax-loader', $form).removeClass('is-active');
            }).fail(function(xhr, status, error) {
                var $e = $('<div class="ajax-error"></div>').text(error.message);
                $form.after($e);
            });
        };
        wpcf7.triggerEvent = function(target, name, detail) {
            var event = new CustomEvent('wpcf7' + name, {
                bubbles: true,
                detail: detail
            });
            $(target).get(0).dispatchEvent(event);
        };
        wpcf7.setStatus = function(form, status) {
            var $form = $(form);
            var prevStatus = $form.attr('data-status');
            $form.data('status', status);
            $form.addClass(status);
            $form.attr('data-status', status);
            if (prevStatus && prevStatus !== status) {
                $form.removeClass(prevStatus);
            }
        }
        wpcf7.toggleSubmit = function(form, state) {
            var $form = $(form);
            var $submit = $('input:submit', $form);
            if (typeof state !== 'undefined') {
                $submit.prop('disabled', !state);
                return;
            }
            if ($form.hasClass('wpcf7-acceptance-as-validation')) {
                return;
            }
            $submit.prop('disabled', false);
            $('.wpcf7-acceptance', $form).each(function() {
                var $span = $(this);
                var $input = $('input:checkbox', $span);
                if (!$span.hasClass('optional')) {
                    if ($span.hasClass('invert') && $input.is(':checked') || !$span.hasClass('invert') && !$input.is(':checked')) {
                        $submit.prop('disabled', true);
                        return false;
                    }
                }
            });
        };
        wpcf7.resetCounter = function(form) {
            var $form = $(form);
            $('.wpcf7-character-count', $form).each(function() {
                var $count = $(this);
                var name = $count.attr('data-target-name');
                var down = $count.hasClass('down');
                var starting = parseInt($count.attr('data-starting-value'), 10);
                var maximum = parseInt($count.attr('data-maximum-value'), 10);
                var minimum = parseInt($count.attr('data-minimum-value'), 10);
                var updateCount = function(target) {
                    var $target = $(target);
                    var length = $target.val().length;
                    var count = down ? starting - length : length;
                    $count.attr('data-current-value', count);
                    $count.text(count);
                    if (maximum && maximum < length) {
                        $count.addClass('too-long');
                    } else {
                        $count.removeClass('too-long');
                    }
                    if (minimum && length < minimum) {
                        $count.addClass('too-short');
                    } else {
                        $count.removeClass('too-short');
                    }
                };
                $(':input[name="' + name + '"]', $form).each(function() {
                    updateCount(this);
                    $(this).keyup(function() {
                        updateCount(this);
                    });
                });
            });
        };
        wpcf7.notValidTip = function(target, message) {
            var $target = $(target);
            $('.wpcf7-not-valid-tip', $target).remove();
            $('<span></span>').attr({
                'class': 'wpcf7-not-valid-tip',
                'aria-hidden': 'true',
            }).text(message).appendTo($target);
            if ($target.is('.use-floating-validation-tip *')) {
                var fadeOut = function(target) {
                    $(target).not(':hidden').animate({
                        opacity: 0
                    }, 'fast', function() {
                        $(this).css({
                            'z-index': -100
                        });
                    });
                };
                $target.on('mouseover', '.wpcf7-not-valid-tip', function() {
                    fadeOut(this);
                });
                $target.on('focus', ':input', function() {
                    fadeOut($('.wpcf7-not-valid-tip', $target));
                });
            }
        };
        wpcf7.refill = function(form, data) {
            var $form = $(form);
            var refillCaptcha = function($form, items) {
                $.each(items, function(i, n) {
                    $form.find(':input[name="' + i + '"]').val('');
                    $form.find('img.wpcf7-captcha-' + i).attr('src', n);
                    var match = /([0-9]+)\.(png|gif|jpeg)$/.exec(n);
                    $form.find('input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]').attr('value', match[1]);
                });
            };
            var refillQuiz = function($form, items) {
                $.each(items, function(i, n) {
                    $form.find(':input[name="' + i + '"]').val('');
                    $form.find(':input[name="' + i + '"]').siblings('span.wpcf7-quiz-label').text(n[0]);
                    $form.find('input:hidden[name="_wpcf7_quiz_answer_' + i + '"]').attr('value', n[1]);
                });
            };
            if (typeof data === 'undefined') {
                $.ajax({
                    type: 'GET',
                    url: wpcf7.apiSettings.getRoute('/contact-forms/' + wpcf7.getId($form) + '/refill'),
                    beforeSend: function(xhr) {
                        var nonce = $form.find(':input[name="_wpnonce"]').val();
                        if (nonce) {
                            xhr.setRequestHeader('X-WP-Nonce', nonce);
                        }
                    },
                    dataType: 'json'
                }).done(function(data, status, xhr) {
                    if (data.captcha) {
                        refillCaptcha($form, data.captcha);
                    }
                    if (data.quiz) {
                        refillQuiz($form, data.quiz);
                    }
                });
            } else {
                if (data.captcha) {
                    refillCaptcha($form, data.captcha);
                }
                if (data.quiz) {
                    refillQuiz($form, data.quiz);
                }
            }
        };
        wpcf7.clearResponse = function(form) {
            var $form = $(form);
            $form.siblings('.screen-reader-response').each(function() {
                $('[role="status"]', this).html('');
                $('ul', this).html('');
            });
            $('.wpcf7-not-valid-tip', $form).remove();
            $('[aria-invalid]', $form).attr('aria-invalid', 'false');
            $('.wpcf7-form-control', $form).removeClass('wpcf7-not-valid');
            $('.wpcf7-response-output', $form).hide().empty();
        };
        wpcf7.apiSettings.getRoute = function(path) {
            var url = wpcf7.apiSettings.root;
            url = url.replace(wpcf7.apiSettings.namespace, wpcf7.apiSettings.namespace + path);
            return url;
        };
    })(jQuery);
    (function() {
        if (typeof window.CustomEvent === "function") return false;

        function CustomEvent(event, params) {
            params = params || {
                bubbles: false,
                cancelable: false,
                detail: undefined
            };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }
        CustomEvent.prototype = window.Event.prototype;
        window.CustomEvent = CustomEvent;
    })();
} catch (e) {}
try { /*! This file is auto-generated */
    (function() {
        function r() {}
        var n = this,
            t = n._,
            e = Array.prototype,
            o = Object.prototype,
            u = Function.prototype,
            i = e.push,
            c = e.slice,
            s = o.toString,
            a = o.hasOwnProperty,
            f = Array.isArray,
            l = Object.keys,
            p = u.bind,
            h = Object.create,
            v = function(n) {
                return n instanceof v ? n : this instanceof v ? void(this._wrapped = n) : new v(n)
            };
        "undefined" != typeof exports ? ("undefined" != typeof module && module.exports && (exports = module.exports = v), exports._ = v) : n._ = v, v.VERSION = "1.8.3";
        var y = function(u, i, n) {
                if (void 0 === i) return u;
                switch (null == n ? 3 : n) {
                    case 1:
                        return function(n) {
                            return u.call(i, n)
                        };
                    case 2:
                        return function(n, t) {
                            return u.call(i, n, t)
                        };
                    case 3:
                        return function(n, t, r) {
                            return u.call(i, n, t, r)
                        };
                    case 4:
                        return function(n, t, r, e) {
                            return u.call(i, n, t, r, e)
                        }
                }
                return function() {
                    return u.apply(i, arguments)
                }
            },
            d = function(n, t, r) {
                return null == n ? v.identity : v.isFunction(n) ? y(n, t, r) : v.isObject(n) ? v.matcher(n) : v.property(n)
            };
        v.iteratee = function(n, t) {
            return d(n, t, 1 / 0)
        };

        function g(c, f) {
            return function(n) {
                var t = arguments.length;
                if (t < 2 || null == n) return n;
                for (var r = 1; r < t; r++)
                    for (var e = arguments[r], u = c(e), i = u.length, o = 0; o < i; o++) {
                        var a = u[o];
                        f && void 0 !== n[a] || (n[a] = e[a])
                    }
                return n
            }
        }

        function m(n) {
            if (!v.isObject(n)) return {};
            if (h) return h(n);
            r.prototype = n;
            var t = new r;
            return r.prototype = null, t
        }

        function b(t) {
            return function(n) {
                return null == n ? void 0 : n[t]
            }
        }
        var x = Math.pow(2, 53) - 1,
            _ = b("length"),
            j = function(n) {
                var t = _(n);
                return "number" == typeof t && 0 <= t && t <= x
            };

        function w(a) {
            return function(n, t, r, e) {
                t = y(t, e, 4);
                var u = !j(n) && v.keys(n),
                    i = (u || n).length,
                    o = 0 < a ? 0 : i - 1;
                return arguments.length < 3 && (r = n[u ? u[o] : o], o += a),
                    function(n, t, r, e, u, i) {
                        for (; 0 <= u && u < i; u += a) {
                            var o = e ? e[u] : u;
                            r = t(r, n[o], o, n)
                        }
                        return r
                    }(n, t, r, u, o, i)
            }
        }
        v.each = v.forEach = function(n, t, r) {
            var e, u;
            if (t = y(t, r), j(n))
                for (e = 0, u = n.length; e < u; e++) t(n[e], e, n);
            else {
                var i = v.keys(n);
                for (e = 0, u = i.length; e < u; e++) t(n[i[e]], i[e], n)
            }
            return n
        }, v.map = v.collect = function(n, t, r) {
            t = d(t, r);
            for (var e = !j(n) && v.keys(n), u = (e || n).length, i = Array(u), o = 0; o < u; o++) {
                var a = e ? e[o] : o;
                i[o] = t(n[a], a, n)
            }
            return i
        }, v.reduce = v.foldl = v.inject = w(1), v.reduceRight = v.foldr = w(-1), v.find = v.detect = function(n, t, r) {
            var e;
            if (void 0 !== (e = j(n) ? v.findIndex(n, t, r) : v.findKey(n, t, r)) && -1 !== e) return n[e]
        }, v.filter = v.select = function(n, e, t) {
            var u = [];
            return e = d(e, t), v.each(n, function(n, t, r) {
                e(n, t, r) && u.push(n)
            }), u
        }, v.reject = function(n, t, r) {
            return v.filter(n, v.negate(d(t)), r)
        }, v.every = v.all = function(n, t, r) {
            t = d(t, r);
            for (var e = !j(n) && v.keys(n), u = (e || n).length, i = 0; i < u; i++) {
                var o = e ? e[i] : i;
                if (!t(n[o], o, n)) return !1
            }
            return !0
        }, v.some = v.any = function(n, t, r) {
            t = d(t, r);
            for (var e = !j(n) && v.keys(n), u = (e || n).length, i = 0; i < u; i++) {
                var o = e ? e[i] : i;
                if (t(n[o], o, n)) return !0
            }
            return !1
        }, v.contains = v.includes = v.include = function(n, t, r, e) {
            return j(n) || (n = v.values(n)), "number" == typeof r && !e || (r = 0), 0 <= v.indexOf(n, t, r)
        }, v.invoke = function(n, r) {
            var e = c.call(arguments, 2),
                u = v.isFunction(r);
            return v.map(n, function(n) {
                var t = u ? r : n[r];
                return null == t ? t : t.apply(n, e)
            })
        }, v.pluck = function(n, t) {
            return v.map(n, v.property(t))
        }, v.where = function(n, t) {
            return v.filter(n, v.matcher(t))
        }, v.findWhere = function(n, t) {
            return v.find(n, v.matcher(t))
        }, v.max = function(n, e, t) {
            var r, u, i = -1 / 0,
                o = -1 / 0;
            if (null == e && null != n)
                for (var a = 0, c = (n = j(n) ? n : v.values(n)).length; a < c; a++) r = n[a], i < r && (i = r);
            else e = d(e, t), v.each(n, function(n, t, r) {
                u = e(n, t, r), (o < u || u === -1 / 0 && i === -1 / 0) && (i = n, o = u)
            });
            return i
        }, v.min = function(n, e, t) {
            var r, u, i = 1 / 0,
                o = 1 / 0;
            if (null == e && null != n)
                for (var a = 0, c = (n = j(n) ? n : v.values(n)).length; a < c; a++)(r = n[a]) < i && (i = r);
            else e = d(e, t), v.each(n, function(n, t, r) {
                ((u = e(n, t, r)) < o || u === 1 / 0 && i === 1 / 0) && (i = n, o = u)
            });
            return i
        }, v.shuffle = function(n) {
            for (var t, r = j(n) ? n : v.values(n), e = r.length, u = Array(e), i = 0; i < e; i++)(t = v.random(0, i)) !== i && (u[i] = u[t]), u[t] = r[i];
            return u
        }, v.sample = function(n, t, r) {
            return null == t || r ? (j(n) || (n = v.values(n)), n[v.random(n.length - 1)]) : v.shuffle(n).slice(0, Math.max(0, t))
        }, v.sortBy = function(n, e, t) {
            return e = d(e, t), v.pluck(v.map(n, function(n, t, r) {
                return {
                    value: n,
                    index: t,
                    criteria: e(n, t, r)
                }
            }).sort(function(n, t) {
                var r = n.criteria,
                    e = t.criteria;
                if (r !== e) {
                    if (e < r || void 0 === r) return 1;
                    if (r < e || void 0 === e) return -1
                }
                return n.index - t.index
            }), "value")
        };

        function A(o) {
            return function(e, u, n) {
                var i = {};
                return u = d(u, n), v.each(e, function(n, t) {
                    var r = u(n, t, e);
                    o(i, n, r)
                }), i
            }
        }
        v.groupBy = A(function(n, t, r) {
            v.has(n, r) ? n[r].push(t) : n[r] = [t]
        }), v.indexBy = A(function(n, t, r) {
            n[r] = t
        }), v.countBy = A(function(n, t, r) {
            v.has(n, r) ? n[r]++ : n[r] = 1
        }), v.toArray = function(n) {
            return n ? v.isArray(n) ? c.call(n) : j(n) ? v.map(n, v.identity) : v.values(n) : []
        }, v.size = function(n) {
            return null == n ? 0 : j(n) ? n.length : v.keys(n).length
        }, v.partition = function(n, e, t) {
            e = d(e, t);
            var u = [],
                i = [];
            return v.each(n, function(n, t, r) {
                (e(n, t, r) ? u : i).push(n)
            }), [u, i]
        }, v.first = v.head = v.take = function(n, t, r) {
            if (null != n) return null == t || r ? n[0] : v.initial(n, n.length - t)
        }, v.initial = function(n, t, r) {
            return c.call(n, 0, Math.max(0, n.length - (null == t || r ? 1 : t)))
        }, v.last = function(n, t, r) {
            if (null != n) return null == t || r ? n[n.length - 1] : v.rest(n, Math.max(0, n.length - t))
        }, v.rest = v.tail = v.drop = function(n, t, r) {
            return c.call(n, null == t || r ? 1 : t)
        }, v.compact = function(n) {
            return v.filter(n, v.identity)
        };
        var O = function(n, t, r, e) {
            for (var u = [], i = 0, o = e || 0, a = _(n); o < a; o++) {
                var c = n[o];
                if (j(c) && (v.isArray(c) || v.isArguments(c))) {
                    t || (c = O(c, t, r));
                    var f = 0,
                        l = c.length;
                    for (u.length += l; f < l;) u[i++] = c[f++]
                } else r || (u[i++] = c)
            }
            return u
        };

        function k(i) {
            return function(n, t, r) {
                t = d(t, r);
                for (var e = _(n), u = 0 < i ? 0 : e - 1; 0 <= u && u < e; u += i)
                    if (t(n[u], u, n)) return u;
                return -1
            }
        }

        function F(i, o, a) {
            return function(n, t, r) {
                var e = 0,
                    u = _(n);
                if ("number" == typeof r) 0 < i ? e = 0 <= r ? r : Math.max(r + u, e) : u = 0 <= r ? Math.min(r + 1, u) : r + u + 1;
                else if (a && r && u) return n[r = a(n, t)] === t ? r : -1;
                if (t != t) return 0 <= (r = o(c.call(n, e, u), v.isNaN)) ? r + e : -1;
                for (r = 0 < i ? e : u - 1; 0 <= r && r < u; r += i)
                    if (n[r] === t) return r;
                return -1
            }
        }
        v.flatten = function(n, t) {
            return O(n, t, !1)
        }, v.without = function(n) {
            return v.difference(n, c.call(arguments, 1))
        }, v.uniq = v.unique = function(n, t, r, e) {
            v.isBoolean(t) || (e = r, r = t, t = !1), null != r && (r = d(r, e));
            for (var u = [], i = [], o = 0, a = _(n); o < a; o++) {
                var c = n[o],
                    f = r ? r(c, o, n) : c;
                t ? (o && i === f || u.push(c), i = f) : r ? v.contains(i, f) || (i.push(f), u.push(c)) : v.contains(u, c) || u.push(c)
            }
            return u
        }, v.union = function() {
            return v.uniq(O(arguments, !0, !0))
        }, v.intersection = function(n) {
            for (var t = [], r = arguments.length, e = 0, u = _(n); e < u; e++) {
                var i = n[e];
                if (!v.contains(t, i)) {
                    for (var o = 1; o < r && v.contains(arguments[o], i); o++);
                    o === r && t.push(i)
                }
            }
            return t
        }, v.difference = function(n) {
            var t = O(arguments, !0, !0, 1);
            return v.filter(n, function(n) {
                return !v.contains(t, n)
            })
        }, v.zip = function() {
            return v.unzip(arguments)
        }, v.unzip = function(n) {
            for (var t = n && v.max(n, _).length || 0, r = Array(t), e = 0; e < t; e++) r[e] = v.pluck(n, e);
            return r
        }, v.object = function(n, t) {
            for (var r = {}, e = 0, u = _(n); e < u; e++) t ? r[n[e]] = t[e] : r[n[e][0]] = n[e][1];
            return r
        }, v.findIndex = k(1), v.findLastIndex = k(-1), v.sortedIndex = function(n, t, r, e) {
            for (var u = (r = d(r, e, 1))(t), i = 0, o = _(n); i < o;) {
                var a = Math.floor((i + o) / 2);
                r(n[a]) < u ? i = a + 1 : o = a
            }
            return i
        }, v.indexOf = F(1, v.findIndex, v.sortedIndex), v.lastIndexOf = F(-1, v.findLastIndex), v.range = function(n, t, r) {
            null == t && (t = n || 0, n = 0), r = r || 1;
            for (var e = Math.max(Math.ceil((t - n) / r), 0), u = Array(e), i = 0; i < e; i++, n += r) u[i] = n;
            return u
        };

        function S(n, t, r, e, u) {
            if (!(e instanceof t)) return n.apply(r, u);
            var i = m(n.prototype),
                o = n.apply(i, u);
            return v.isObject(o) ? o : i
        }
        v.bind = function(n, t) {
            if (p && n.bind === p) return p.apply(n, c.call(arguments, 1));
            if (!v.isFunction(n)) throw new TypeError("Bind must be called on a function");
            var r = c.call(arguments, 2),
                e = function() {
                    return S(n, e, t, this, r.concat(c.call(arguments)))
                };
            return e
        }, v.partial = function(u) {
            var i = c.call(arguments, 1),
                o = function() {
                    for (var n = 0, t = i.length, r = Array(t), e = 0; e < t; e++) r[e] = i[e] === v ? arguments[n++] : i[e];
                    for (; n < arguments.length;) r.push(arguments[n++]);
                    return S(u, o, this, this, r)
                };
            return o
        }, v.bindAll = function(n) {
            var t, r, e = arguments.length;
            if (e <= 1) throw new Error("bindAll must be passed function names");
            for (t = 1; t < e; t++) n[r = arguments[t]] = v.bind(n[r], n);
            return n
        }, v.memoize = function(e, u) {
            var i = function(n) {
                var t = i.cache,
                    r = "" + (u ? u.apply(this, arguments) : n);
                return v.has(t, r) || (t[r] = e.apply(this, arguments)), t[r]
            };
            return i.cache = {}, i
        }, v.delay = function(n, t) {
            var r = c.call(arguments, 2);
            return setTimeout(function() {
                return n.apply(null, r)
            }, t)
        }, v.defer = v.partial(v.delay, v, 1), v.throttle = function(r, e, u) {
            var i, o, a, c = null,
                f = 0;
            u = u || {};

            function l() {
                f = !1 === u.leading ? 0 : v.now(), c = null, a = r.apply(i, o), c || (i = o = null)
            }
            return function() {
                var n = v.now();
                f || !1 !== u.leading || (f = n);
                var t = e - (n - f);
                return i = this, o = arguments, t <= 0 || e < t ? (c && (clearTimeout(c), c = null), f = n, a = r.apply(i, o), c || (i = o = null)) : c || !1 === u.trailing || (c = setTimeout(l, t)), a
            }
        }, v.debounce = function(t, r, e) {
            var u, i, o, a, c, f = function() {
                var n = v.now() - a;
                n < r && 0 <= n ? u = setTimeout(f, r - n) : (u = null, e || (c = t.apply(o, i), u || (o = i = null)))
            };
            return function() {
                o = this, i = arguments, a = v.now();
                var n = e && !u;
                return u = u || setTimeout(f, r), n && (c = t.apply(o, i), o = i = null), c
            }
        }, v.wrap = function(n, t) {
            return v.partial(t, n)
        }, v.negate = function(n) {
            return function() {
                return !n.apply(this, arguments)
            }
        }, v.compose = function() {
            var r = arguments,
                e = r.length - 1;
            return function() {
                for (var n = e, t = r[e].apply(this, arguments); n--;) t = r[n].call(this, t);
                return t
            }
        }, v.after = function(n, t) {
            return function() {
                if (--n < 1) return t.apply(this, arguments)
            }
        }, v.before = function(n, t) {
            var r;
            return function() {
                return 0 < --n && (r = t.apply(this, arguments)), n <= 1 && (t = null), r
            }
        }, v.once = v.partial(v.before, 2);
        var E = !{
                toString: null
            }.propertyIsEnumerable("toString"),
            M = ["valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString"];

        function I(n, t) {
            var r = M.length,
                e = n.constructor,
                u = v.isFunction(e) && e.prototype || o,
                i = "constructor";
            for (v.has(n, i) && !v.contains(t, i) && t.push(i); r--;)(i = M[r]) in n && n[i] !== u[i] && !v.contains(t, i) && t.push(i)
        }
        v.keys = function(n) {
            if (!v.isObject(n)) return [];
            if (l) return l(n);
            var t = [];
            for (var r in n) v.has(n, r) && t.push(r);
            return E && I(n, t), t
        }, v.allKeys = function(n) {
            if (!v.isObject(n)) return [];
            var t = [];
            for (var r in n) t.push(r);
            return E && I(n, t), t
        }, v.values = function(n) {
            for (var t = v.keys(n), r = t.length, e = Array(r), u = 0; u < r; u++) e[u] = n[t[u]];
            return e
        }, v.mapObject = function(n, t, r) {
            t = d(t, r);
            for (var e, u = v.keys(n), i = u.length, o = {}, a = 0; a < i; a++) o[e = u[a]] = t(n[e], e, n);
            return o
        }, v.pairs = function(n) {
            for (var t = v.keys(n), r = t.length, e = Array(r), u = 0; u < r; u++) e[u] = [t[u], n[t[u]]];
            return e
        }, v.invert = function(n) {
            for (var t = {}, r = v.keys(n), e = 0, u = r.length; e < u; e++) t[n[r[e]]] = r[e];
            return t
        }, v.functions = v.methods = function(n) {
            var t = [];
            for (var r in n) v.isFunction(n[r]) && t.push(r);
            return t.sort()
        }, v.extend = g(v.allKeys), v.extendOwn = v.assign = g(v.keys), v.findKey = function(n, t, r) {
            t = d(t, r);
            for (var e, u = v.keys(n), i = 0, o = u.length; i < o; i++)
                if (t(n[e = u[i]], e, n)) return e
        }, v.pick = function(n, t, r) {
            var e, u, i = {},
                o = n;
            if (null == o) return i;
            v.isFunction(t) ? (u = v.allKeys(o), e = y(t, r)) : (u = O(arguments, !1, !1, 1), e = function(n, t, r) {
                return t in r
            }, o = Object(o));
            for (var a = 0, c = u.length; a < c; a++) {
                var f = u[a],
                    l = o[f];
                e(l, f, o) && (i[f] = l)
            }
            return i
        }, v.omit = function(n, t, r) {
            if (v.isFunction(t)) t = v.negate(t);
            else {
                var e = v.map(O(arguments, !1, !1, 1), String);
                t = function(n, t) {
                    return !v.contains(e, t)
                }
            }
            return v.pick(n, t, r)
        }, v.defaults = g(v.allKeys, !0), v.create = function(n, t) {
            var r = m(n);
            return t && v.extendOwn(r, t), r
        }, v.clone = function(n) {
            return v.isObject(n) ? v.isArray(n) ? n.slice() : v.extend({}, n) : n
        }, v.tap = function(n, t) {
            return t(n), n
        }, v.isMatch = function(n, t) {
            var r = v.keys(t),
                e = r.length;
            if (null == n) return !e;
            for (var u = Object(n), i = 0; i < e; i++) {
                var o = r[i];
                if (t[o] !== u[o] || !(o in u)) return !1
            }
            return !0
        };
        var N = function(n, t, r, e) {
            if (n === t) return 0 !== n || 1 / n == 1 / t;
            if (null == n || null == t) return n === t;
            n instanceof v && (n = n._wrapped), t instanceof v && (t = t._wrapped);
            var u = s.call(n);
            if (u !== s.call(t)) return !1;
            switch (u) {
                case "[object RegExp]":
                case "[object String]":
                    return "" + n == "" + t;
                case "[object Number]":
                    return +n != +n ? +t != +t : 0 == +n ? 1 / +n == 1 / t : +n == +t;
                case "[object Date]":
                case "[object Boolean]":
                    return +n == +t
            }
            var i = "[object Array]" === u;
            if (!i) {
                if ("object" != typeof n || "object" != typeof t) return !1;
                var o = n.constructor,
                    a = t.constructor;
                if (o !== a && !(v.isFunction(o) && o instanceof o && v.isFunction(a) && a instanceof a) && "constructor" in n && "constructor" in t) return !1
            }
            e = e || [];
            for (var c = (r = r || []).length; c--;)
                if (r[c] === n) return e[c] === t;
            if (r.push(n), e.push(t), i) {
                if ((c = n.length) !== t.length) return !1;
                for (; c--;)
                    if (!N(n[c], t[c], r, e)) return !1
            } else {
                var f, l = v.keys(n);
                if (c = l.length, v.keys(t).length !== c) return !1;
                for (; c--;)
                    if (f = l[c], !v.has(t, f) || !N(n[f], t[f], r, e)) return !1
            }
            return r.pop(), e.pop(), !0
        };
        v.isEqual = function(n, t) {
            return N(n, t)
        }, v.isEmpty = function(n) {
            return null == n || (j(n) && (v.isArray(n) || v.isString(n) || v.isArguments(n)) ? 0 === n.length : 0 === v.keys(n).length)
        }, v.isElement = function(n) {
            return !(!n || 1 !== n.nodeType)
        }, v.isArray = f || function(n) {
            return "[object Array]" === s.call(n)
        }, v.isObject = function(n) {
            var t = typeof n;
            return "function" == t || "object" == t && !!n
        }, v.each(["Arguments", "Function", "String", "Number", "Date", "RegExp", "Error"], function(t) {
            v["is" + t] = function(n) {
                return s.call(n) === "[object " + t + "]"
            }
        }), v.isArguments(arguments) || (v.isArguments = function(n) {
            return v.has(n, "callee")
        }), "function" != typeof /./ && "object" != typeof Int8Array && (v.isFunction = function(n) {
            return "function" == typeof n || !1
        }), v.isFinite = function(n) {
            return isFinite(n) && !isNaN(parseFloat(n))
        }, v.isNaN = function(n) {
            return v.isNumber(n) && n !== +n
        }, v.isBoolean = function(n) {
            return !0 === n || !1 === n || "[object Boolean]" === s.call(n)
        }, v.isNull = function(n) {
            return null === n
        }, v.isUndefined = function(n) {
            return void 0 === n
        }, v.has = function(n, t) {
            return null != n && a.call(n, t)
        }, v.noConflict = function() {
            return n._ = t, this
        }, v.identity = function(n) {
            return n
        }, v.constant = function(n) {
            return function() {
                return n
            }
        }, v.noop = function() {}, v.property = b, v.propertyOf = function(t) {
            return null == t ? function() {} : function(n) {
                return t[n]
            }
        }, v.matcher = v.matches = function(t) {
            return t = v.extendOwn({}, t),
                function(n) {
                    return v.isMatch(n, t)
                }
        }, v.times = function(n, t, r) {
            var e = Array(Math.max(0, n));
            t = y(t, r, 1);
            for (var u = 0; u < n; u++) e[u] = t(u);
            return e
        }, v.random = function(n, t) {
            return null == t && (t = n, n = 0), n + Math.floor(Math.random() * (t - n + 1))
        }, v.now = Date.now || function() {
            return (new Date).getTime()
        };

        function B(t) {
            function r(n) {
                return t[n]
            }
            var n = "(?:" + v.keys(t).join("|") + ")",
                e = RegExp(n),
                u = RegExp(n, "g");
            return function(n) {
                return n = null == n ? "" : "" + n, e.test(n) ? n.replace(u, r) : n
            }
        }
        var T = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#x27;",
                "`": "&#x60;"
            },
            R = v.invert(T);
        v.escape = B(T), v.unescape = B(R), v.result = function(n, t, r) {
            var e = null == n ? void 0 : n[t];
            return void 0 === e && (e = r), v.isFunction(e) ? e.call(n) : e
        };
        var q = 0;
        v.uniqueId = function(n) {
            var t = ++q + "";
            return n ? n + t : t
        }, v.templateSettings = {
            evaluate: /<%([\s\S]+?)%>/g,
            interpolate: /<%=([\s\S]+?)%>/g,
            escape: /<%-([\s\S]+?)%>/g
        };

        function K(n) {
            return "\\" + D[n]
        }
        var z = /(.)^/,
            D = {
                "'": "'",
                "\\": "\\",
                "\r": "r",
                "\n": "n",
                "\u2028": "u2028",
                "\u2029": "u2029"
            },
            L = /\\|'|\r|\n|\u2028|\u2029/g;
        v.template = function(i, n, t) {
            !n && t && (n = t), n = v.defaults({}, n, v.templateSettings);
            var r = RegExp([(n.escape || z).source, (n.interpolate || z).source, (n.evaluate || z).source].join("|") + "|$", "g"),
                o = 0,
                a = "__p+='";
            i.replace(r, function(n, t, r, e, u) {
                return a += i.slice(o, u).replace(L, K), o = u + n.length, t ? a += "'+\n((__t=(" + t + "))==null?'':_.escape(__t))+\n'" : r ? a += "'+\n((__t=(" + r + "))==null?'':__t)+\n'" : e && (a += "';\n" + e + "\n__p+='"), n
            }), a += "';\n", n.variable || (a = "with(obj||{}){\n" + a + "}\n"), a = "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n" + a + "return __p;\n";
            try {
                var e = new Function(n.variable || "obj", "_", a)
            } catch (n) {
                throw n.source = a, n
            }

            function u(n) {
                return e.call(this, n, v)
            }
            var c = n.variable || "obj";
            return u.source = "function(" + c + "){\n" + a + "}", u
        }, v.chain = function(n) {
            var t = v(n);
            return t._chain = !0, t
        };

        function P(n, t) {
            return n._chain ? v(t).chain() : t
        }
        v.mixin = function(r) {
            v.each(v.functions(r), function(n) {
                var t = v[n] = r[n];
                v.prototype[n] = function() {
                    var n = [this._wrapped];
                    return i.apply(n, arguments), P(this, t.apply(v, n))
                }
            })
        }, v.mixin(v), v.each(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function(t) {
            var r = e[t];
            v.prototype[t] = function() {
                var n = this._wrapped;
                return r.apply(n, arguments), "shift" !== t && "splice" !== t || 0 !== n.length || delete n[0], P(this, n)
            }
        }), v.each(["concat", "join", "slice"], function(n) {
            var t = e[n];
            v.prototype[n] = function() {
                return P(this, t.apply(this._wrapped, arguments))
            }
        }), v.prototype.value = function() {
            return this._wrapped
        }, v.prototype.valueOf = v.prototype.toJSON = v.prototype.value, v.prototype.toString = function() {
            return "" + this._wrapped
        }, "function" == typeof define && define.amd && define("underscore", [], function() {
            return v
        })
    }).call(this);
} catch (e) {}
try {
    ! function() {
        var e, t, i;
        ! function(n) {
            function s(e, t) {
                return C.call(e, t)
            }

            function o(e, t) {
                var i, n, s, o, r, a, l, d, c, u, p, h, f = t && t.split("/"),
                    m = w.map,
                    v = m && m["*"] || {};
                if (e) {
                    for (e = e.split("/"), r = e.length - 1, w.nodeIdCompat && T.test(e[r]) && (e[r] = e[r].replace(T, "")), "." === e[0].charAt(0) && f && (h = f.slice(0, f.length - 1), e = h.concat(e)), c = 0; c < e.length; c++)
                        if (p = e[c], "." === p) e.splice(c, 1), c -= 1;
                        else if (".." === p) {
                        if (0 === c || 1 === c && ".." === e[2] || ".." === e[c - 1]) continue;
                        c > 0 && (e.splice(c - 1, 2), c -= 2)
                    }
                    e = e.join("/")
                }
                if ((f || v) && m) {
                    for (i = e.split("/"), c = i.length; c > 0; c -= 1) {
                        if (n = i.slice(0, c).join("/"), f)
                            for (u = f.length; u > 0; u -= 1)
                                if (s = m[f.slice(0, u).join("/")], s && (s = s[n])) {
                                    o = s, a = c;
                                    break
                                }
                        if (o) break;
                        !l && v && v[n] && (l = v[n], d = c)
                    }!o && l && (o = l, a = d), o && (i.splice(0, a, o), e = i.join("/"))
                }
                return e
            }

            function r(e, t) {
                return function() {
                    var i = b.call(arguments, 0);
                    return "string" != typeof i[0] && 1 === i.length && i.push(null), f.apply(n, i.concat([e, t]))
                }
            }

            function a(e) {
                return function(t) {
                    return o(t, e)
                }
            }

            function l(e) {
                return function(t) {
                    g[e] = t
                }
            }

            function d(e) {
                if (s(y, e)) {
                    var t = y[e];
                    delete y[e], k[e] = !0, h.apply(n, t)
                }
                if (!s(g, e) && !s(k, e)) throw new Error("No " + e);
                return g[e]
            }

            function c(e) {
                var t, i = e ? e.indexOf("!") : -1;
                return i > -1 && (t = e.substring(0, i), e = e.substring(i + 1, e.length)), [t, e]
            }

            function u(e) {
                return e ? c(e) : []
            }

            function p(e) {
                return function() {
                    return w && w.config && w.config[e] || {}
                }
            }
            var h, f, m, v, g = {},
                y = {},
                w = {},
                k = {},
                C = Object.prototype.hasOwnProperty,
                b = [].slice,
                T = /\.js$/;
            m = function(e, t) {
                var i, n = c(e),
                    s = n[0],
                    r = t[1];
                return e = n[1], s && (s = o(s, r), i = d(s)), s ? e = i && i.normalize ? i.normalize(e, a(r)) : o(e, r) : (e = o(e, r), n = c(e), s = n[0], e = n[1], s && (i = d(s))), {
                    f: s ? s + "!" + e : e,
                    n: e,
                    pr: s,
                    p: i
                }
            }, v = {
                require: function(e) {
                    return r(e)
                },
                exports: function(e) {
                    var t = g[e];
                    return "undefined" != typeof t ? t : g[e] = {}
                },
                module: function(e) {
                    return {
                        id: e,
                        uri: "",
                        exports: g[e],
                        config: p(e)
                    }
                }
            }, h = function(e, t, i, o) {
                var a, c, p, h, f, w, C, b = [],
                    T = typeof i;
                if (o = o || e, w = u(o), "undefined" === T || "function" === T) {
                    for (t = !t.length && i.length ? ["require", "exports", "module"] : t, f = 0; f < t.length; f += 1)
                        if (h = m(t[f], w), c = h.f, "require" === c) b[f] = v.require(e);
                        else if ("exports" === c) b[f] = v.exports(e), C = !0;
                    else if ("module" === c) a = b[f] = v.module(e);
                    else if (s(g, c) || s(y, c) || s(k, c)) b[f] = d(c);
                    else {
                        if (!h.p) throw new Error(e + " missing " + c);
                        h.p.load(h.n, r(o, !0), l(c), {}), b[f] = g[c]
                    }
                    p = i ? i.apply(g[e], b) : void 0, e && (a && a.exports !== n && a.exports !== g[e] ? g[e] = a.exports : p === n && C || (g[e] = p))
                } else e && (g[e] = i)
            }, e = t = f = function(e, t, i, s, o) {
                if ("string" == typeof e) return v[e] ? v[e](t) : d(m(e, u(t)).f);
                if (!e.splice) {
                    if (w = e, w.deps && f(w.deps, w.callback), !t) return;
                    t.splice ? (e = t, t = i, i = null) : e = n
                }
                return t = t || function() {}, "function" == typeof i && (i = s, s = o), s ? h(n, e, t, i) : setTimeout(function() {
                    h(n, e, t, i)
                }, 4), f
            }, f.config = function(e) {
                return f(e)
            }, e._defined = g, i = function(e, t, i) {
                if ("string" != typeof e) throw new Error("See almond README: incorrect module build, no module name");
                t.splice || (i = t, t = []), s(g, e) || s(y, e) || (y[e] = [e, t, i])
            }, i.amd = {
                jQuery: !0
            }
        }(), i("bower_components/almond/almond", function() {}), i("jquery", [], function() {
                "use strict";
                return jQuery
            }), i("underscore", [], function() {
                "use strict";
                return _
            }), i("isElementInView", ["jquery"], function(e) {
                return function(t) {
                    var i = e(window),
                        n = i.scrollTop(),
                        s = n + i.height(),
                        o = t.offset().top,
                        r = o + t.height();
                    return r > n && s > o
                }
            }),
            function(e, t) {
                "object" == typeof exports && "object" == typeof module ? module.exports = t() : "function" == typeof i && i.amd ? i("stampit", t) : "object" == typeof exports ? exports.stampit = t() : e.stampit = t()
            }(this, function() {
                return function(e) {
                    function t(n) {
                        if (i[n]) return i[n].exports;
                        var s = i[n] = {
                            exports: {},
                            id: n,
                            loaded: !1
                        };
                        return e[n].call(s.exports, s, s.exports, t), s.loaded = !0, s.exports
                    }
                    var i = {};
                    return t.m = e, t.c = i, t.p = "", t(0)
                }([function(e, t, i) {
                    "use strict";

                    function n(e) {
                        return e && e.__esModule ? e : {
                            "default": e
                        }
                    }

                    function s(e) {
                        return e && (0, w["default"])(e.then)
                    }

                    function o() {
                        for (var e = [], t = arguments.length, i = Array(t), n = 0; t > n; n++) i[n] = arguments[n];
                        return (0, w["default"])(i[0]) ? (0, g["default"])(i, function(t) {
                            (0, w["default"])(t) && e.push(t)
                        }) : (0, C["default"])(i[0]) && (0, g["default"])(i, function(t) {
                            (0, g["default"])(t, function(t) {
                                (0, w["default"])(t) && e.push(t)
                            })
                        }), e
                    }

                    function r(e) {
                        for (var t = arguments.length, i = Array(t > 1 ? t - 1 : 0), n = 1; t > n; n++) i[n - 1] = arguments[n];
                        return b.mixinFunctions.apply(void 0, [e.methods].concat(i))
                    }

                    function a(e) {
                        for (var t = arguments.length, i = Array(t > 1 ? t - 1 : 0), n = 1; t > n; n++) i[n - 1] = arguments[n];
                        return e.refs = e.state = b.mixin.apply(void 0, [e.refs].concat(i)), e.refs
                    }

                    function l(e) {
                        for (var t = arguments.length, i = Array(t > 1 ? t - 1 : 0), n = 1; t > n; n++) i[n - 1] = arguments[n];
                        var s = o.apply(void 0, i);
                        return e.init = e.enclose = e.init.concat(s), e.init
                    }

                    function d(e) {
                        for (var t = arguments.length, i = Array(t > 1 ? t - 1 : 0), n = 1; t > n; n++) i[n - 1] = arguments[n];
                        return b.merge.apply(void 0, [e.props].concat(i))
                    }

                    function c(e) {
                        for (var t = arguments.length, i = Array(t > 1 ? t - 1 : 0), n = 1; t > n; n++) i[n - 1] = arguments[n];
                        return b.mixin.apply(void 0, [e["static"]].concat(i))
                    }

                    function u(e, t) {
                        for (var i = S(e), n = arguments.length, s = Array(n > 2 ? n - 2 : 0), o = 2; n > o; o++) s[o - 2] = arguments[o];
                        return t.apply(void 0, [i.fixed].concat(s)), i
                    }

                    function p() {
                        for (var e = S(), t = arguments.length, i = Array(t), n = 0; t > n; n++) i[n] = arguments[n];
                        return (0, g["default"])(i, function(t) {
                            t && t.fixed && (r(e.fixed, t.fixed.methods), a(e.fixed, t.fixed.refs || t.fixed.state), l(e.fixed, t.fixed.init || t.fixed.enclose), d(e.fixed, t.fixed.props), c(e.fixed, t.fixed["static"]))
                        }), (0, b.mixin)(e, e.fixed["static"])
                    }

                    function h(e) {
                        return (0, w["default"])(e) && (0, w["default"])(e.methods) && ((0, w["default"])(e.refs) || (0, w["default"])(e.state)) && ((0, w["default"])(e.init) || (0, w["default"])(e.enclose)) && (0, w["default"])(e.props) && (0, w["default"])(e["static"]) && (0, C["default"])(e.fixed)
                    }

                    function f(e) {
                        var t = S();
                        return t.fixed.refs = t.fixed.state = (0, b.mergeChainNonFunctions)(t.fixed.refs, e.prototype), (0, b.mixin)(t, (0, b.mixin)(t.fixed["static"], e)), (0, b.mixinChainFunctions)(t.fixed.methods, e.prototype), l(t.fixed, function(t) {
                            var i = t.instance,
                                n = t.args;
                            return e.apply(i, n)
                        }), t
                    }

                    function m(e) {
                        for (var t = S(), i = arguments.length, n = Array(i > 1 ? i - 1 : 0), s = 1; i > s; s++) n[s - 1] = arguments[s];
                        return e.apply(void 0, [t.fixed].concat(n)), t
                    }
                    Object.defineProperty(t, "__esModule", {
                        value: !0
                    });
                    var v = i(1),
                        g = n(v),
                        y = i(12),
                        w = n(y),
                        k = i(8),
                        C = n(k),
                        b = i(27),
                        T = Object.create,
                        S = function(e) {
                            var t = {
                                methods: {},
                                refs: {},
                                init: [],
                                props: {},
                                "static": {}
                            };
                            t.state = t.refs, t.enclose = t.init, e && (r(t, e.methods), a(t, e.refs), l(t, e.init), d(t, e.props), c(t, e["static"]));
                            var i = function(e) {
                                    for (var n = arguments.length, o = Array(n > 1 ? n - 1 : 0), r = 1; n > r; r++) o[r - 1] = arguments[r];
                                    var a = (0, b.mixin)(T(t.methods), t.refs, e);
                                    (0, b.mergeUnique)(a, t.props);
                                    var l = null;
                                    return t.init.length > 0 && (0, g["default"])(t.init, function(e) {
                                        if ((0, w["default"])(e))
                                            if (l) l = l.then(function(t) {
                                                a = t || a;
                                                var n = e.call(a, {
                                                    args: o,
                                                    instance: a,
                                                    stamp: i
                                                });
                                                return n ? s(n) ? n : a = n : a
                                            });
                                            else {
                                                var t = e.call(a, {
                                                    args: o,
                                                    instance: a,
                                                    stamp: i
                                                });
                                                if (!t) return;
                                                if (!s(t)) return void(a = t);
                                                l = t
                                            }
                                    }), l ? l.then(function(e) {
                                        return e || a
                                    }) : a
                                },
                                n = u.bind(null, t, a),
                                o = u.bind(null, t, l);
                            return (0, b.mixin)(i, {
                                create: i,
                                fixed: t,
                                methods: u.bind(null, t, r),
                                refs: n,
                                state: n,
                                init: o,
                                enclose: o,
                                props: u.bind(null, t, d),
                                "static": function() {
                                    for (var e = arguments.length, t = Array(e), n = 0; e > n; n++) t[n] = arguments[n];
                                    var s = u.apply(void 0, [i.fixed, c].concat(t));
                                    return (0, b.mixin)(s, s.fixed["static"])
                                },
                                compose: function() {
                                    for (var e = arguments.length, t = Array(e), n = 0; e > n; n++) t[n] = arguments[n];
                                    return p.apply(void 0, [i].concat(t))
                                }
                            }, t["static"])
                        };
                    t["default"] = (0, b.mixin)(S, {
                        methods: m.bind(null, r),
                        refs: m.bind(null, a),
                        init: m.bind(null, l),
                        props: m.bind(null, d),
                        "static": function() {
                            for (var e = arguments.length, t = Array(e), i = 0; e > i; i++) t[i] = arguments[i];
                            var n = m.apply(void 0, [c].concat(t));
                            return (0, b.mixin)(n, n.fixed["static"])
                        },
                        compose: p,
                        mixin: b.mixin,
                        extend: b.mixin,
                        mixIn: b.mixin,
                        assign: b.mixin,
                        isStamp: h,
                        convertConstructor: f
                    }), e.exports = t["default"]
                }, function(e, t, i) {
                    var n = i(2),
                        s = i(3),
                        o = i(24),
                        r = o(n, s);
                    e.exports = r
                }, function(e, t) {
                    function i(e, t) {
                        for (var i = -1, n = e.length; ++i < n && t(e[i], i, e) !== !1;);
                        return e
                    }
                    e.exports = i
                }, function(e, t, i) {
                    var n = i(4),
                        s = i(23),
                        o = s(n);
                    e.exports = o
                }, function(e, t, i) {
                    function n(e, t) {
                        return s(e, t, o)
                    }
                    var s = i(5),
                        o = i(9);
                    e.exports = n
                }, function(e, t, i) {
                    var n = i(6),
                        s = n();
                    e.exports = s
                }, function(e, t, i) {
                    function n(e) {
                        return function(t, i, n) {
                            for (var o = s(t), r = n(t), a = r.length, l = e ? a : -1; e ? l-- : ++l < a;) {
                                var d = r[l];
                                if (i(o[d], d, o) === !1) break
                            }
                            return t
                        }
                    }
                    var s = i(7);
                    e.exports = n
                }, function(e, t, i) {
                    function n(e) {
                        return s(e) ? e : Object(e)
                    }
                    var s = i(8);
                    e.exports = n
                }, function(e, t) {
                    function i(e) {
                        var t = typeof e;
                        return !!e && ("object" == t || "function" == t)
                    }
                    e.exports = i
                }, function(e, t, i) {
                    var n = i(10),
                        s = i(14),
                        o = i(8),
                        r = i(18),
                        a = n(Object, "keys"),
                        l = a ? function(e) {
                            var t = null == e ? void 0 : e.constructor;
                            return "function" == typeof t && t.prototype === e || "function" != typeof e && s(e) ? r(e) : o(e) ? a(e) : []
                        } : r;
                    e.exports = l
                }, function(e, t, i) {
                    function n(e, t) {
                        var i = null == e ? void 0 : e[t];
                        return s(i) ? i : void 0
                    }
                    var s = i(11);
                    e.exports = n
                }, function(e, t, i) {
                    function n(e) {
                        return null == e ? !1 : s(e) ? c.test(l.call(e)) : o(e) && r.test(e)
                    }
                    var s = i(12),
                        o = i(13),
                        r = /^\[object .+?Constructor\]$/,
                        a = Object.prototype,
                        l = Function.prototype.toString,
                        d = a.hasOwnProperty,
                        c = RegExp("^" + l.call(d).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
                    e.exports = n
                }, function(e, t, i) {
                    function n(e) {
                        return s(e) && a.call(e) == o
                    }
                    var s = i(8),
                        o = "[object Function]",
                        r = Object.prototype,
                        a = r.toString;
                    e.exports = n
                }, function(e, t) {
                    function i(e) {
                        return !!e && "object" == typeof e
                    }
                    e.exports = i
                }, function(e, t, i) {
                    function n(e) {
                        return null != e && o(s(e))
                    }
                    var s = i(15),
                        o = i(17);
                    e.exports = n
                }, function(e, t, i) {
                    var n = i(16),
                        s = n("length");
                    e.exports = s
                }, function(e, t) {
                    function i(e) {
                        return function(t) {
                            return null == t ? void 0 : t[e]
                        }
                    }
                    e.exports = i
                }, function(e, t) {
                    function i(e) {
                        return "number" == typeof e && e > -1 && e % 1 == 0 && n >= e
                    }
                    var n = 9007199254740991;
                    e.exports = i
                }, function(e, t, i) {
                    function n(e) {
                        for (var t = l(e), i = t.length, n = i && e.length, d = !!n && a(n) && (o(e) || s(e)), u = -1, p = []; ++u < i;) {
                            var h = t[u];
                            (d && r(h, n) || c.call(e, h)) && p.push(h)
                        }
                        return p
                    }
                    var s = i(19),
                        o = i(20),
                        r = i(21),
                        a = i(17),
                        l = i(22),
                        d = Object.prototype,
                        c = d.hasOwnProperty;
                    e.exports = n
                }, function(e, t, i) {
                    function n(e) {
                        return o(e) && s(e) && a.call(e, "callee") && !l.call(e, "callee")
                    }
                    var s = i(14),
                        o = i(13),
                        r = Object.prototype,
                        a = r.hasOwnProperty,
                        l = r.propertyIsEnumerable;
                    e.exports = n
                }, function(e, t, i) {
                    var n = i(10),
                        s = i(17),
                        o = i(13),
                        r = "[object Array]",
                        a = Object.prototype,
                        l = a.toString,
                        d = n(Array, "isArray"),
                        c = d || function(e) {
                            return o(e) && s(e.length) && l.call(e) == r
                        };
                    e.exports = c
                }, function(e, t) {
                    function i(e, t) {
                        return e = "number" == typeof e || n.test(e) ? +e : -1, t = null == t ? s : t, e > -1 && e % 1 == 0 && t > e
                    }
                    var n = /^\d+$/,
                        s = 9007199254740991;
                    e.exports = i
                }, function(e, t, i) {
                    function n(e) {
                        if (null == e) return [];
                        l(e) || (e = Object(e));
                        var t = e.length;
                        t = t && a(t) && (o(e) || s(e)) && t || 0;
                        for (var i = e.constructor, n = -1, d = "function" == typeof i && i.prototype === e, u = Array(t), p = t > 0; ++n < t;) u[n] = n + "";
                        for (var h in e) p && r(h, t) || "constructor" == h && (d || !c.call(e, h)) || u.push(h);
                        return u
                    }
                    var s = i(19),
                        o = i(20),
                        r = i(21),
                        a = i(17),
                        l = i(8),
                        d = Object.prototype,
                        c = d.hasOwnProperty;
                    e.exports = n
                }, function(e, t, i) {
                    function n(e, t) {
                        return function(i, n) {
                            var a = i ? s(i) : 0;
                            if (!o(a)) return e(i, n);
                            for (var l = t ? a : -1, d = r(i);
                                (t ? l-- : ++l < a) && n(d[l], l, d) !== !1;);
                            return i
                        }
                    }
                    var s = i(15),
                        o = i(17),
                        r = i(7);
                    e.exports = n
                }, function(e, t, i) {
                    function n(e, t) {
                        return function(i, n, r) {
                            return "function" == typeof n && void 0 === r && o(i) ? e(i, n) : t(i, s(n, r, 3))
                        }
                    }
                    var s = i(25),
                        o = i(20);
                    e.exports = n
                }, function(e, t, i) {
                    function n(e, t, i) {
                        if ("function" != typeof e) return s;
                        if (void 0 === t) return e;
                        switch (i) {
                            case 1:
                                return function(i) {
                                    return e.call(t, i)
                                };
                            case 3:
                                return function(i, n, s) {
                                    return e.call(t, i, n, s)
                                };
                            case 4:
                                return function(i, n, s, o) {
                                    return e.call(t, i, n, s, o)
                                };
                            case 5:
                                return function(i, n, s, o, r) {
                                    return e.call(t, i, n, s, o, r)
                                }
                        }
                        return function() {
                            return e.apply(t, arguments)
                        }
                    }
                    var s = i(26);
                    e.exports = n
                }, function(e, t) {
                    function i(e) {
                        return e
                    }
                    e.exports = i
                }, function(e, t, i) {
                    "use strict";

                    function n(e) {
                        return e && e.__esModule ? e : {
                            "default": e
                        }
                    }
                    Object.defineProperty(t, "__esModule", {
                        value: !0
                    });
                    var s = i(28),
                        o = n(s),
                        r = i(12),
                        a = n(r),
                        l = function(e) {
                            return !(0, a["default"])(e)
                        },
                        d = (0, o["default"])(),
                        c = (0, o["default"])({
                            filter: a["default"]
                        }),
                        u = (0, o["default"])({
                            filter: a["default"],
                            chain: !0
                        }),
                        p = (0, o["default"])({
                            deep: !0
                        }),
                        h = (0, o["default"])({
                            deep: !0,
                            noOverwrite: !0
                        }),
                        f = (0, o["default"])({
                            filter: l,
                            deep: !0,
                            chain: !0
                        });
                    t["default"] = o["default"], t.mixin = d, t.mixinFunctions = c, t.mixinChainFunctions = u, t.merge = p, t.mergeUnique = h, t.mergeChainNonFunctions = f
                }, function(e, t, i) {
                    "use strict";

                    function n(e) {
                        return e && e.__esModule ? e : {
                            "default": e
                        }
                    }

                    function s() {
                        var e = void 0 === arguments[0] ? {} : arguments[0];
                        return e.deep && !e._innerMixer && (e._innerMixer = !0, e._innerMixer = s(e)),
                            function(t) {
                                function i(i, n) {
                                    var s = t[n];
                                    if (!e.filter || e.filter(i, s, n)) {
                                        var o = e.deep ? e._innerMixer(s, i) : i;
                                        t[n] = e.transform ? e.transform(o, s, n) : o
                                    }
                                }
                                for (var n = arguments.length, s = Array(n > 1 ? n - 1 : 0), o = 1; n > o; o++) s[o - 1] = arguments[o];
                                if ((0, f["default"])(t) || !e.noOverwrite && !(0, p["default"])(t)) return s.length > 1 ? e._innerMixer.apply(e, [{}].concat(s)) : (0, c["default"])(s[0]);
                                if (e.noOverwrite && (!(0, p["default"])(t) || !(0, p["default"])(s[0]))) return t;
                                var a = e.chain ? l["default"] : r["default"];
                                return s.forEach(function(e) {
                                    a(e, i)
                                }), t
                            }
                    }
                    Object.defineProperty(t, "__esModule", {
                        value: !0
                    }), t["default"] = s;
                    var o = i(29),
                        r = n(o),
                        a = i(31),
                        l = n(a),
                        d = i(33),
                        c = n(d),
                        u = i(8),
                        p = n(u),
                        h = i(42),
                        f = n(h);
                    e.exports = t["default"]
                }, function(e, t, i) {
                    var n = i(4),
                        s = i(30),
                        o = s(n);
                    e.exports = o
                }, function(e, t, i) {
                    function n(e) {
                        return function(t, i, n) {
                            return ("function" != typeof i || void 0 !== n) && (i = s(i, n, 3)), e(t, i)
                        }
                    }
                    var s = i(25);
                    e.exports = n
                }, function(e, t, i) {
                    var n = i(5),
                        s = i(32),
                        o = s(n);
                    e.exports = o
                }, function(e, t, i) {
                    function n(e) {
                        return function(t, i, n) {
                            return ("function" != typeof i || void 0 !== n) && (i = s(i, n, 3)), e(t, i, o)
                        }
                    }
                    var s = i(25),
                        o = i(22);
                    e.exports = n
                }, function(e, t, i) {
                    function n(e, t, i) {
                        return "function" == typeof t ? s(e, !0, o(t, i, 1)) : s(e, !0)
                    }
                    var s = i(34),
                        o = i(25);
                    e.exports = n
                }, function(e, t, i) {
                    function n(e, t, i, f, m, v, g) {
                        var w;
                        if (i && (w = m ? i(e, f, m) : i(e)), void 0 !== w) return w;
                        if (!p(e)) return e;
                        var k = u(e);
                        if (k) {
                            if (w = l(e), !t) return s(e, w)
                        } else {
                            var b = M.call(e),
                                T = b == y;
                            if (b != C && b != h && (!T || m)) return N[b] ? d(e, b, t) : m ? e : {};
                            if (w = c(T ? {} : e), !t) return r(w, e)
                        }
                        v || (v = []), g || (g = []);
                        for (var S = v.length; S--;)
                            if (v[S] == e) return g[S];
                        return v.push(e), g.push(w), (k ? o : a)(e, function(s, o) {
                            w[o] = n(s, t, i, o, e, v, g)
                        }), w
                    }
                    var s = i(35),
                        o = i(2),
                        r = i(36),
                        a = i(4),
                        l = i(38),
                        d = i(39),
                        c = i(41),
                        u = i(20),
                        p = i(8),
                        h = "[object Arguments]",
                        f = "[object Array]",
                        m = "[object Boolean]",
                        v = "[object Date]",
                        g = "[object Error]",
                        y = "[object Function]",
                        w = "[object Map]",
                        k = "[object Number]",
                        C = "[object Object]",
                        b = "[object RegExp]",
                        T = "[object Set]",
                        S = "[object String]",
                        x = "[object WeakMap]",
                        _ = "[object ArrayBuffer]",
                        $ = "[object Float32Array]",
                        A = "[object Float64Array]",
                        E = "[object Int8Array]",
                        j = "[object Int16Array]",
                        I = "[object Int32Array]",
                        O = "[object Uint8Array]",
                        D = "[object Uint8ClampedArray]",
                        H = "[object Uint16Array]",
                        P = "[object Uint32Array]",
                        N = {};
                    N[h] = N[f] = N[_] = N[m] = N[v] = N[$] = N[A] = N[E] = N[j] = N[I] = N[k] = N[C] = N[b] = N[S] = N[O] = N[D] = N[H] = N[P] = !0, N[g] = N[y] = N[w] = N[T] = N[x] = !1;
                    var L = Object.prototype,
                        M = L.toString;
                    e.exports = n
                }, function(e, t) {
                    function i(e, t) {
                        var i = -1,
                            n = e.length;
                        for (t || (t = Array(n)); ++i < n;) t[i] = e[i];
                        return t
                    }
                    e.exports = i
                }, function(e, t, i) {
                    function n(e, t) {
                        return null == t ? e : s(t, o(t), e)
                    }
                    var s = i(37),
                        o = i(9);
                    e.exports = n
                }, function(e, t) {
                    function i(e, t, i) {
                        i || (i = {});
                        for (var n = -1, s = t.length; ++n < s;) {
                            var o = t[n];
                            i[o] = e[o]
                        }
                        return i
                    }
                    e.exports = i
                }, function(e, t) {
                    function i(e) {
                        var t = e.length,
                            i = new e.constructor(t);
                        return t && "string" == typeof e[0] && s.call(e, "index") && (i.index = e.index, i.input = e.input), i
                    }
                    var n = Object.prototype,
                        s = n.hasOwnProperty;
                    e.exports = i
                }, function(e, t, i) {
                    function n(e, t, i) {
                        var n = e.constructor;
                        switch (t) {
                            case c:
                                return s(e);
                            case o:
                            case r:
                                return new n(+e);
                            case u:
                            case p:
                            case h:
                            case f:
                            case m:
                            case v:
                            case g:
                            case y:
                            case w:
                                var C = e.buffer;
                                return new n(i ? s(C) : C, e.byteOffset, e.length);
                            case a:
                            case d:
                                return new n(e);
                            case l:
                                var b = new n(e.source, k.exec(e));
                                b.lastIndex = e.lastIndex
                        }
                        return b
                    }
                    var s = i(40),
                        o = "[object Boolean]",
                        r = "[object Date]",
                        a = "[object Number]",
                        l = "[object RegExp]",
                        d = "[object String]",
                        c = "[object ArrayBuffer]",
                        u = "[object Float32Array]",
                        p = "[object Float64Array]",
                        h = "[object Int8Array]",
                        f = "[object Int16Array]",
                        m = "[object Int32Array]",
                        v = "[object Uint8Array]",
                        g = "[object Uint8ClampedArray]",
                        y = "[object Uint16Array]",
                        w = "[object Uint32Array]",
                        k = /\w*$/;
                    e.exports = n
                }, function(e, t) {
                    (function(t) {
                        function i(e) {
                            var t = new n(e.byteLength),
                                i = new s(t);
                            return i.set(new s(e)), t
                        }
                        var n = t.ArrayBuffer,
                            s = t.Uint8Array;
                        e.exports = i
                    }).call(t, function() {
                        return this
                    }())
                }, function(e, t) {
                    function i(e) {
                        var t = e.constructor;
                        return "function" == typeof t && t instanceof t || (t = Object), new t
                    }
                    e.exports = i
                }, function(e, t) {
                    function i(e) {
                        return void 0 === e
                    }
                    e.exports = i
                }])
            }), i("assets/js/utils/objectFitFallback", ["stampit", "jquery"], function(e, t) {
                return e({
                    init: function() {
                        var e = this.$container.find("img").prop("src");
                        e && this.$container.css("backgroundImage", "url(" + e + ")").addClass("compat-object-fit")
                    },
                    props: {
                        $container: null
                    }
                })
            }), i("assets/js/portfolio-grid-filter/nav", ["jquery", "underscore", "stampit"], function(e, t, i) {
                return i({
                    methods: {
                        onCategoryClick: function(t) {
                            t.preventDefault(), e(t.currentTarget).parent().hasClass("is-active") || (this.filterItems(t), this.updateActiveBtn(t), this.updateUrlHash(t), this.isDesktopLayout() || this.toggleNavHolderState())
                        },
                        toggleNavHolderState: function(e) {
                            return e && e.preventDefault && e.preventDefault(), this.mobileNavOpened ? this.closeFilterMenu() : this.openFilterMenu(), this.toggleNavHolderStateProp(), this
                        },
                        openFilterMenu: function() {
                            var e = this.heightOfAllElmChildren(this.$navHolder);
                            return this.animateNavHolderHeightTo(e), this
                        },
                        closeFilterMenu: function() {
                            var e = this.heightOfActiveChild(this.$navHolder);
                            return this.animateNavHolderHeightTo(e), this
                        },
                        animateNavHolderHeightTo: function(e) {
                            return this.$navHolder.animate({
                                height: e
                            }), this
                        },
                        heightOfAllElmChildren: function(i) {
                            return t.reduce(i.children().not(".is-disabled").get(), function(t, i) {
                                return t + e(i).outerHeight(!0)
                            }, 0)
                        },
                        heightOfActiveChild: function(e) {
                            return e.children(".is-active").first().outerHeight(!0)
                        },
                        filterItems: function(t) {
                            t && t.preventDefault();
                            var i = e(t.target).data("category");
                            return this.render(this.getItemsByCategoryName(i)), this
                        },
                        updateActiveBtn: function(t) {
                            e(t.target).parent().addClass("is-active").siblings(".is-active").removeClass("is-active")
                        },
                        toggleNavHolderStateProp: function() {
                            return this.mobileNavOpened = !this.mobileNavOpened, this
                        },
                        recalcNavHolderStyle: function() {
                            return this.isDesktopLayout() ? (this.$navHolder.removeAttr("style"), this.mobileNavOpened = !1) : this.initNavHolderHeight(), this
                        },
                        initNavHolderHeight: function() {
                            var e = this.heightOfActiveChild(this.$navHolder);
                            return this.$navHolder.outerHeight(e), this.$navHolder.css("padding-top", e), this
                        },
                        isDesktopLayout: function() {
                            return Modernizr.mq("(min-width: " + this.mobileBreakpoint + "px)")
                        },
                        updateUrlHash: function(t) {
                            void 0 === e(t.currentTarget).data("skip-hash-update") && (window.location.hash = t.currentTarget.hash.replace("#", "#" + this.hashPrefix))
                        }
                    },
                    init: function() {
                        return this.$container.find(this.itemSel).each(t.bind(function(t, i) {
                            this.addItem(e(i))
                        }, this)), this.$navHolder = this.$container.find(this.navHolder), this.$container.on("click.wpg", this.navElmSel, t.bind(this.onCategoryClick, this)), this.$container.on("click.wpg", this.navMobileFilter, t.bind(this.toggleNavHolderState, this)), e(window).on("resize", t.debounce(t.bind(this.recalcNavHolderStyle, this), 50)), this.recalcNavHolderStyle(), this
                    },
                    props: {
                        mobileNavOpened: !1,
                        mobileBreakpoint: 992
                    }
                })
            }), i("assets/js/portfolio-grid-filter/items", ["jquery", "underscore", "stampit"], function(e, t, i) {
                return i({
                    methods: {
                        addItem: function(e) {
                            return this.$items.push({
                                categories: this.getItemCagories(e),
                                $elm: e
                            }), this
                        },
                        getItemsByCategoryName: function(e) {
                            return e = "" + e, "*" === e ? this.getItems() : t.chain(this.$items).filter(function(i) {
                                return t.contains(i.categories, e)
                            }).pluck("$elm").value()
                        },
                        getItemCagories: function(e) {
                            return ("" + e.data("categories")).split(",")
                        },
                        getItems: function() {
                            return t.pluck(this.$items, "$elm")
                        }
                    },
                    props: {
                        $items: []
                    }
                })
            }), i("assets/js/portfolio-grid-filter/generalView", ["jquery", "underscore", "stampit"], function(e, t, i) {
                return i({
                    init: function() {
                        return this.$itemsContainer = this.$container.find(this.itemsContainerSel), this
                    },
                    methods: {
                        groupArrayItems: function(e, i) {
                            return t.chain(i).groupBy(function(t, i) {
                                return Math.floor(i / e)
                            }).values().value()
                        },
                        render: function(e) {
                            this.$container.trigger(this.eventsNS + "before_render", {
                                items: e
                            });
                            var i = this.$itemsContainer.children();
                            t.forEach(this.getItems(), function(e) {
                                e.find(this.cardSel).addClass("is-fadeout")
                            }, this);
                            var n = this.groupArrayItems(this.itemsPerRow, e);
                            return setTimeout(t.bind(function() {
                                t.forEach(n, function(e) {
                                    this.createNewRow(e).appendTo(this.$itemsContainer)
                                }, this), i.remove(), this.afterRendered && this.afterRendered(), this.$container.trigger(this.eventsNS + "on_elements_switch", {
                                    items: e
                                })
                            }, this), 200), this
                        },
                        createNewRow: function(i) {
                            var n = e(this.rowHTML);
                            return i.forEach(function(e) {
                                var i = e.find(this.cardSel);
                                i.removeClass("is-fadeout").addClass("is-fadein"), setTimeout(t.bind(function(e) {
                                    this.removeClass("is-fadein")
                                }, i), 200), t.isString(this.appendItemsInside) ? e.appendTo(n.find(this.appendItemsInside)) : e.appendTo(n)
                            }.bind(this)), n
                        }
                    },
                    props: {
                        itemsPerRow: 4
                    }
                })
            }), i("assets/js/portfolio-grid-filter/gridView", ["stampit", "assets/js/portfolio-grid-filter/generalView"], function(e, t) {
                return e().refs({
                    rowHTML: '<div class="row"></div>'
                }).compose(t)
            }), i("assets/js/portfolio-grid-filter/selectors", ["stampit"], function(e) {
                return e().props({
                    navElmSel: ".js-wpg-nav",
                    navHolder: ".js-wpg-nav-holder",
                    navMobileFilter: ".js-filter",
                    itemsContainerSel: ".js-wpg-items",
                    itemSel: ".js-wpg-item",
                    cardSel: ".js-wpg-card",
                    eventsNS: "wpge_",
                    hashPrefix: "projects_"
                })
            }), i("assets/js/portfolio-grid-filter/gridFilter", ["stampit", "assets/js/portfolio-grid-filter/nav", "assets/js/portfolio-grid-filter/items", "assets/js/portfolio-grid-filter/gridView", "assets/js/portfolio-grid-filter/selectors"], function(e, t, i, n, s) {
                return e().compose(t, i, n, s)
            }), i("assets/js/portfolio-grid-filter/navSlider", ["jquery", "underscore", "stampit", "assets/js/portfolio-grid-filter/nav"], function(e, t, i, n) {
                return n.compose(i({
                    methods: {
                        toggleArrowsVisibility: function(e, t) {
                            return this.$container.toggleClass("is-nav-arrows-hidden", this.arrowsHidden(t.items.length)), this
                        },
                        arrowsHidden: function(e) {
                            return e <= this.itemsPerRow
                        }
                    },
                    init: function() {
                        return this.$container.on(this.eventsNS + "before_render", t.bind(this.toggleArrowsVisibility, this)), this
                    }
                }))
            }), i("assets/js/portfolio-grid-filter/sliderView", ["jquery", "stampit", "assets/js/portfolio-grid-filter/generalView"], function(e, t, i) {
                return t({
                    props: {
                        rowHTML: '<div class = "carousel-item"><div class="row"></div></div>',
                        appendItemsInside: ".row",
                        arrowsSel: ".js-wpg-arrows"
                    },
                    methods: {
                        afterRendered: function() {
                            return this.$itemsContainer.children().first().addClass("active"), this
                        }
                    }
                }).compose(i)
            }), i("assets/js/portfolio-grid-filter/sliderFilter", ["stampit", "assets/js/portfolio-grid-filter/navSlider", "assets/js/portfolio-grid-filter/items", "assets/js/portfolio-grid-filter/sliderView", "assets/js/portfolio-grid-filter/selectors"], function(e, t, i, n, s) {
                return e().compose(t, i, n, s)
            }), i("assets/js/utils/easeInOutQuad", ["jquery"], function(e) {
                return function() {
                    e.extend(e.easing, {
                        easeInOutQuad: function(e, t, i, n, s) {
                            return (t /= s / 2) < 1 ? n / 2 * t * t + i : -n / 2 * (--t * (t - 2) - 1) + i
                        }
                    })
                }
            }), i("vendor/proteusthemes/proteuswidgets/assets/js/NumberCounter", ["jquery", "underscore"], function(e, t) {
                "use strict";
                var i = {
                        eventNS: "widgetCounter",
                        numberContainerClass: ".js-number",
                        progressBarContainerClass: ".js-nc-progress-bar"
                    },
                    n = function(n) {
                        return this.$widgetElement = n, this.uniqueNS = t.uniqueId(i.eventNS), this.registerListeners(), e(window).trigger("scroll." + this.uniqueNS), this
                    },
                    s = function(e, t) {
                        for (var i = "" + e; i.length < t;) i = "0" + i;
                        return i
                    };
                return t.extend(n.prototype, {
                    registerListeners: function() {
                        return e(window).on("scroll." + this.uniqueNS, t.throttle(t.bind(function() {
                            this.widgetScrolledIntoView() && this.triggerCounting()
                        }, this), 500)), this
                    },
                    destroyListeners: function() {
                        return e(window).off("scroll." + this.uniqueNS), this
                    },
                    triggerCounting: function() {
                        t.each(this.getSingleNumbersInWidget(), function(e) {
                            this.animateValue(e, 0, e.data("to"), this.$widgetElement.data("speed"))
                        }, this);
                        var e = this.getProgressBarsForThisWidget();
                        e.length && t.each(e, function(e) {
                            e.css("width", parseInt(e.data("progress-bar-value"), 10) + "%")
                        }, this), this.destroyListeners()
                    },
                    getProgressBarsForThisWidget: function() {
                        var t = [];
                        return this.$widgetElement.find(i.progressBarContainerClass).each(function() {
                            t.push(e(this))
                        }), t
                    },
                    getSingleNumbersInWidget: function() {
                        var t = [];
                        return this.$widgetElement.find(i.numberContainerClass).each(function() {
                            t.push(e(this))
                        }), t
                    },
                    animateValue: function(t, i, n, o) {
                        var r = n.toString().length;
                        e({
                            num: i
                        }).animate({
                            num: n
                        }, {
                            duration: o,
                            easing: "easeInOutQuad",
                            complete: function() {
                                t.text(n.toString())
                            },
                            step: function() {
                                t.text(s(Math.ceil(this.num), r))
                            }
                        })
                    },
                    widgetScrolledIntoView: function() {
                        var t = e(window).scrollTop(),
                            i = t + e(window).height(),
                            n = this.$widgetElement.children(".number-counter").first().offset().top,
                            s = n + this.$widgetElement.children(".number-counter").first().height();
                        return i >= s && n >= t
                    }
                }), n
            }),
            function(e) {
                "use strict";
                "function" == typeof i && i.amd ? i("SlickCarousel", ["jquery"], e) : "undefined" != typeof exports ? module.exports = e(t("jquery")) : e(jQuery)
            }(function(e) {
                "use strict";
                var t = window.Slick || {};
                t = function() {
                    function t(t, n) {
                        var s, o = this;
                        o.defaults = {
                            accessibility: !0,
                            adaptiveHeight: !1,
                            appendArrows: e(t),
                            appendDots: e(t),
                            arrows: !0,
                            asNavFor: null,
                            prevArrow: '<button class="slick-prev" aria-label="Previous" type="button">Previous</button>',
                            nextArrow: '<button class="slick-next" aria-label="Next" type="button">Next</button>',
                            autoplay: !1,
                            autoplaySpeed: 3e3,
                            centerMode: !1,
                            centerPadding: "50px",
                            cssEase: "ease",
                            customPaging: function(t, i) {
                                return e('<button type="button" />').text(i + 1)
                            },
                            dots: !1,
                            dotsClass: "slick-dots",
                            draggable: !0,
                            easing: "linear",
                            edgeFriction: .35,
                            fade: !1,
                            focusOnSelect: !1,
                            focusOnChange: !1,
                            infinite: !0,
                            initialSlide: 0,
                            lazyLoad: "ondemand",
                            mobileFirst: !1,
                            pauseOnHover: !0,
                            pauseOnFocus: !0,
                            pauseOnDotsHover: !1,
                            respondTo: "window",
                            responsive: null,
                            rows: 1,
                            rtl: !1,
                            slide: "",
                            slidesPerRow: 1,
                            slidesToShow: 1,
                            slidesToScroll: 1,
                            speed: 500,
                            swipe: !0,
                            swipeToSlide: !1,
                            touchMove: !0,
                            touchThreshold: 5,
                            useCSS: !0,
                            useTransform: !0,
                            variableWidth: !1,
                            vertical: !1,
                            verticalSwiping: !1,
                            waitForAnimate: !0,
                            zIndex: 1e3
                        }, o.initials = {
                            animating: !1,
                            dragging: !1,
                            autoPlayTimer: null,
                            currentDirection: 0,
                            currentLeft: null,
                            currentSlide: 0,
                            direction: 1,
                            $dots: null,
                            listWidth: null,
                            listHeight: null,
                            loadIndex: 0,
                            $nextArrow: null,
                            $prevArrow: null,
                            scrolling: !1,
                            slideCount: null,
                            slideWidth: null,
                            $slideTrack: null,
                            $slides: null,
                            sliding: !1,
                            slideOffset: 0,
                            swipeLeft: null,
                            swiping: !1,
                            $list: null,
                            touchObject: {},
                            transformsEnabled: !1,
                            unslicked: !1
                        }, e.extend(o, o.initials), o.activeBreakpoint = null, o.animType = null, o.animProp = null, o.breakpoints = [], o.breakpointSettings = [], o.cssTransitions = !1, o.focussed = !1, o.interrupted = !1, o.hidden = "hidden", o.paused = !0, o.positionProp = null, o.respondTo = null, o.rowCount = 1, o.shouldClick = !0, o.$slider = e(t), o.$slidesCache = null, o.transformType = null, o.transitionType = null, o.visibilityChange = "visibilitychange", o.windowWidth = 0, o.windowTimer = null, s = e(t).data("slick") || {}, o.options = e.extend({}, o.defaults, n, s), o.currentSlide = o.options.initialSlide, o.originalSettings = o.options, "undefined" != typeof document.mozHidden ? (o.hidden = "mozHidden", o.visibilityChange = "mozvisibilitychange") : "undefined" != typeof document.webkitHidden && (o.hidden = "webkitHidden", o.visibilityChange = "webkitvisibilitychange"), o.autoPlay = e.proxy(o.autoPlay, o), o.autoPlayClear = e.proxy(o.autoPlayClear, o), o.autoPlayIterator = e.proxy(o.autoPlayIterator, o), o.changeSlide = e.proxy(o.changeSlide, o), o.clickHandler = e.proxy(o.clickHandler, o), o.selectHandler = e.proxy(o.selectHandler, o), o.setPosition = e.proxy(o.setPosition, o), o.swipeHandler = e.proxy(o.swipeHandler, o), o.dragHandler = e.proxy(o.dragHandler, o), o.keyHandler = e.proxy(o.keyHandler, o), o.instanceUid = i++, o.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/, o.registerBreakpoints(), o.init(!0)
                    }
                    var i = 0;
                    return t
                }(), t.prototype.activateADA = function() {
                    var e = this;
                    e.$slideTrack.find(".slick-active").attr({
                        "aria-hidden": "false"
                    }).find("a, input, button, select").attr({
                        tabindex: "0"
                    })
                }, t.prototype.addSlide = t.prototype.slickAdd = function(t, i, n) {
                    var s = this;
                    if ("boolean" == typeof i) n = i, i = null;
                    else if (0 > i || i >= s.slideCount) return !1;
                    s.unload(), "number" == typeof i ? 0 === i && 0 === s.$slides.length ? e(t).appendTo(s.$slideTrack) : n ? e(t).insertBefore(s.$slides.eq(i)) : e(t).insertAfter(s.$slides.eq(i)) : n === !0 ? e(t).prependTo(s.$slideTrack) : e(t).appendTo(s.$slideTrack), s.$slides = s.$slideTrack.children(this.options.slide), s.$slideTrack.children(this.options.slide).detach(), s.$slideTrack.append(s.$slides), s.$slides.each(function(t, i) {
                        e(i).attr("data-slick-index", t)
                    }), s.$slidesCache = s.$slides, s.reinit()
                }, t.prototype.animateHeight = function() {
                    var e = this;
                    if (1 === e.options.slidesToShow && e.options.adaptiveHeight === !0 && e.options.vertical === !1) {
                        var t = e.$slides.eq(e.currentSlide).outerHeight(!0);
                        e.$list.animate({
                            height: t
                        }, e.options.speed)
                    }
                }, t.prototype.animateSlide = function(t, i) {
                    var n = {},
                        s = this;
                    s.animateHeight(), s.options.rtl === !0 && s.options.vertical === !1 && (t = -t), s.transformsEnabled === !1 ? s.options.vertical === !1 ? s.$slideTrack.animate({
                        left: t
                    }, s.options.speed, s.options.easing, i) : s.$slideTrack.animate({
                        top: t
                    }, s.options.speed, s.options.easing, i) : s.cssTransitions === !1 ? (s.options.rtl === !0 && (s.currentLeft = -s.currentLeft), e({
                        animStart: s.currentLeft
                    }).animate({
                        animStart: t
                    }, {
                        duration: s.options.speed,
                        easing: s.options.easing,
                        step: function(e) {
                            e = Math.ceil(e), s.options.vertical === !1 ? (n[s.animType] = "translate(" + e + "px, 0px)", s.$slideTrack.css(n)) : (n[s.animType] = "translate(0px," + e + "px)", s.$slideTrack.css(n))
                        },
                        complete: function() {
                            i && i.call()
                        }
                    })) : (s.applyTransition(), t = Math.ceil(t), s.options.vertical === !1 ? n[s.animType] = "translate3d(" + t + "px, 0px, 0px)" : n[s.animType] = "translate3d(0px," + t + "px, 0px)", s.$slideTrack.css(n), i && setTimeout(function() {
                        s.disableTransition(), i.call()
                    }, s.options.speed))
                }, t.prototype.getNavTarget = function() {
                    var t = this,
                        i = t.options.asNavFor;
                    return i && null !== i && (i = e(i).not(t.$slider)), i
                }, t.prototype.asNavFor = function(t) {
                    var i = this,
                        n = i.getNavTarget();
                    null !== n && "object" == typeof n && n.each(function() {
                        var i = e(this).slick("getSlick");
                        i.unslicked || i.slideHandler(t, !0)
                    })
                }, t.prototype.applyTransition = function(e) {
                    var t = this,
                        i = {};
                    t.options.fade === !1 ? i[t.transitionType] = t.transformType + " " + t.options.speed + "ms " + t.options.cssEase : i[t.transitionType] = "opacity " + t.options.speed + "ms " + t.options.cssEase, t.options.fade === !1 ? t.$slideTrack.css(i) : t.$slides.eq(e).css(i)
                }, t.prototype.autoPlay = function() {
                    var e = this;
                    e.autoPlayClear(), e.slideCount > e.options.slidesToShow && (e.autoPlayTimer = setInterval(e.autoPlayIterator, e.options.autoplaySpeed))
                }, t.prototype.autoPlayClear = function() {
                    var e = this;
                    e.autoPlayTimer && clearInterval(e.autoPlayTimer)
                }, t.prototype.autoPlayIterator = function() {
                    var e = this,
                        t = e.currentSlide + e.options.slidesToScroll;
                    e.paused || e.interrupted || e.focussed || (e.options.infinite === !1 && (1 === e.direction && e.currentSlide + 1 === e.slideCount - 1 ? e.direction = 0 : 0 === e.direction && (t = e.currentSlide - e.options.slidesToScroll, e.currentSlide - 1 === 0 && (e.direction = 1))), e.slideHandler(t))
                }, t.prototype.buildArrows = function() {
                    var t = this;
                    t.options.arrows === !0 && (t.$prevArrow = e(t.options.prevArrow).addClass("slick-arrow"), t.$nextArrow = e(t.options.nextArrow).addClass("slick-arrow"), t.slideCount > t.options.slidesToShow ? (t.$prevArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), t.$nextArrow.removeClass("slick-hidden").removeAttr("aria-hidden tabindex"), t.htmlExpr.test(t.options.prevArrow) && t.$prevArrow.prependTo(t.options.appendArrows), t.htmlExpr.test(t.options.nextArrow) && t.$nextArrow.appendTo(t.options.appendArrows), t.options.infinite !== !0 && t.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true")) : t.$prevArrow.add(t.$nextArrow).addClass("slick-hidden").attr({
                        "aria-disabled": "true",
                        tabindex: "-1"
                    }))
                }, t.prototype.buildDots = function() {
                    var t, i, n = this;
                    if (n.options.dots === !0 && n.slideCount > n.options.slidesToShow) {
                        for (n.$slider.addClass("slick-dotted"), i = e("<ul />").addClass(n.options.dotsClass), t = 0; t <= n.getDotCount(); t += 1) i.append(e("<li />").append(n.options.customPaging.call(this, n, t)));
                        n.$dots = i.appendTo(n.options.appendDots), n.$dots.find("li").first().addClass("slick-active")
                    }
                }, t.prototype.buildOut = function() {
                    var t = this;
                    t.$slides = t.$slider.children(t.options.slide + ":not(.slick-cloned)").addClass("slick-slide"), t.slideCount = t.$slides.length, t.$slides.each(function(t, i) {
                        e(i).attr("data-slick-index", t).data("originalStyling", e(i).attr("style") || "")
                    }), t.$slider.addClass("slick-slider"), t.$slideTrack = 0 === t.slideCount ? e('<div class="slick-track"/>').appendTo(t.$slider) : t.$slides.wrapAll('<div class="slick-track"/>').parent(), t.$list = t.$slideTrack.wrap('<div class="slick-list"/>').parent(), t.$slideTrack.css("opacity", 0), (t.options.centerMode === !0 || t.options.swipeToSlide === !0) && (t.options.slidesToScroll = 1), e("img[data-lazy]", t.$slider).not("[src]").addClass("slick-loading"), t.setupInfinite(), t.buildArrows(), t.buildDots(), t.updateDots(), t.setSlideClasses("number" == typeof t.currentSlide ? t.currentSlide : 0), t.options.draggable === !0 && t.$list.addClass("draggable")
                }, t.prototype.buildRows = function() {
                    var e, t, i, n, s, o, r, a = this;
                    if (n = document.createDocumentFragment(), o = a.$slider.children(), a.options.rows > 0) {
                        for (r = a.options.slidesPerRow * a.options.rows, s = Math.ceil(o.length / r), e = 0; s > e; e++) {
                            var l = document.createElement("div");
                            for (t = 0; t < a.options.rows; t++) {
                                var d = document.createElement("div");
                                for (i = 0; i < a.options.slidesPerRow; i++) {
                                    var c = e * r + (t * a.options.slidesPerRow + i);
                                    o.get(c) && d.appendChild(o.get(c))
                                }
                                l.appendChild(d)
                            }
                            n.appendChild(l)
                        }
                        a.$slider.empty().append(n), a.$slider.children().children().children().css({
                            width: 100 / a.options.slidesPerRow + "%",
                            display: "inline-block"
                        })
                    }
                }, t.prototype.checkResponsive = function(t, i) {
                    var n, s, o, r = this,
                        a = !1,
                        l = r.$slider.width(),
                        d = window.innerWidth || e(window).width();
                    if ("window" === r.respondTo ? o = d : "slider" === r.respondTo ? o = l : "min" === r.respondTo && (o = Math.min(d, l)), r.options.responsive && r.options.responsive.length && null !== r.options.responsive) {
                        s = null;
                        for (n in r.breakpoints) r.breakpoints.hasOwnProperty(n) && (r.originalSettings.mobileFirst === !1 ? o < r.breakpoints[n] && (s = r.breakpoints[n]) : o > r.breakpoints[n] && (s = r.breakpoints[n]));
                        null !== s ? null !== r.activeBreakpoint ? (s !== r.activeBreakpoint || i) && (r.activeBreakpoint = s, "unslick" === r.breakpointSettings[s] ? r.unslick(s) : (r.options = e.extend({}, r.originalSettings, r.breakpointSettings[s]), t === !0 && (r.currentSlide = r.options.initialSlide), r.refresh(t)), a = s) : (r.activeBreakpoint = s, "unslick" === r.breakpointSettings[s] ? r.unslick(s) : (r.options = e.extend({}, r.originalSettings, r.breakpointSettings[s]), t === !0 && (r.currentSlide = r.options.initialSlide), r.refresh(t)), a = s) : null !== r.activeBreakpoint && (r.activeBreakpoint = null, r.options = r.originalSettings, t === !0 && (r.currentSlide = r.options.initialSlide), r.refresh(t), a = s), t || a === !1 || r.$slider.trigger("breakpoint", [r, a])
                    }
                }, t.prototype.changeSlide = function(t, i) {
                    var n, s, o, r = this,
                        a = e(t.currentTarget);
                    switch (a.is("a") && t.preventDefault(), a.is("li") || (a = a.closest("li")), o = r.slideCount % r.options.slidesToScroll !== 0, n = o ? 0 : (r.slideCount - r.currentSlide) % r.options.slidesToScroll, t.data.message) {
                        case "previous":
                            s = 0 === n ? r.options.slidesToScroll : r.options.slidesToShow - n, r.slideCount > r.options.slidesToShow && r.slideHandler(r.currentSlide - s, !1, i);
                            break;
                        case "next":
                            s = 0 === n ? r.options.slidesToScroll : n, r.slideCount > r.options.slidesToShow && r.slideHandler(r.currentSlide + s, !1, i);
                            break;
                        case "index":
                            var l = 0 === t.data.index ? 0 : t.data.index || a.index() * r.options.slidesToScroll;
                            r.slideHandler(r.checkNavigable(l), !1, i), a.children().trigger("focus");
                            break;
                        default:
                            return
                    }
                }, t.prototype.checkNavigable = function(e) {
                    var t, i, n = this;
                    if (t = n.getNavigableIndexes(), i = 0, e > t[t.length - 1]) e = t[t.length - 1];
                    else
                        for (var s in t) {
                            if (e < t[s]) {
                                e = i;
                                break
                            }
                            i = t[s]
                        }
                    return e
                }, t.prototype.cleanUpEvents = function() {
                    var t = this;
                    t.options.dots && null !== t.$dots && (e("li", t.$dots).off("click.slick", t.changeSlide).off("mouseenter.slick", e.proxy(t.interrupt, t, !0)).off("mouseleave.slick", e.proxy(t.interrupt, t, !1)), t.options.accessibility === !0 && t.$dots.off("keydown.slick", t.keyHandler)), t.$slider.off("focus.slick blur.slick"), t.options.arrows === !0 && t.slideCount > t.options.slidesToShow && (t.$prevArrow && t.$prevArrow.off("click.slick", t.changeSlide), t.$nextArrow && t.$nextArrow.off("click.slick", t.changeSlide), t.options.accessibility === !0 && (t.$prevArrow && t.$prevArrow.off("keydown.slick", t.keyHandler), t.$nextArrow && t.$nextArrow.off("keydown.slick", t.keyHandler))), t.$list.off("touchstart.slick mousedown.slick", t.swipeHandler), t.$list.off("touchmove.slick mousemove.slick", t.swipeHandler), t.$list.off("touchend.slick mouseup.slick", t.swipeHandler), t.$list.off("touchcancel.slick mouseleave.slick", t.swipeHandler), t.$list.off("click.slick", t.clickHandler), e(document).off(t.visibilityChange, t.visibility), t.cleanUpSlideEvents(), t.options.accessibility === !0 && t.$list.off("keydown.slick", t.keyHandler), t.options.focusOnSelect === !0 && e(t.$slideTrack).children().off("click.slick", t.selectHandler), e(window).off("orientationchange.slick.slick-" + t.instanceUid, t.orientationChange), e(window).off("resize.slick.slick-" + t.instanceUid, t.resize), e("[draggable!=true]", t.$slideTrack).off("dragstart", t.preventDefault), e(window).off("load.slick.slick-" + t.instanceUid, t.setPosition)
                }, t.prototype.cleanUpSlideEvents = function() {
                    var t = this;
                    t.$list.off("mouseenter.slick", e.proxy(t.interrupt, t, !0)), t.$list.off("mouseleave.slick", e.proxy(t.interrupt, t, !1))
                }, t.prototype.cleanUpRows = function() {
                    var e, t = this;
                    t.options.rows > 0 && (e = t.$slides.children().children(), e.removeAttr("style"), t.$slider.empty().append(e))
                }, t.prototype.clickHandler = function(e) {
                    var t = this;
                    t.shouldClick === !1 && (e.stopImmediatePropagation(), e.stopPropagation(), e.preventDefault())
                }, t.prototype.destroy = function(t) {
                    var i = this;
                    i.autoPlayClear(), i.touchObject = {}, i.cleanUpEvents(), e(".slick-cloned", i.$slider).detach(), i.$dots && i.$dots.remove(), i.$prevArrow && i.$prevArrow.length && (i.$prevArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), i.htmlExpr.test(i.options.prevArrow) && i.$prevArrow.remove()), i.$nextArrow && i.$nextArrow.length && (i.$nextArrow.removeClass("slick-disabled slick-arrow slick-hidden").removeAttr("aria-hidden aria-disabled tabindex").css("display", ""), i.htmlExpr.test(i.options.nextArrow) && i.$nextArrow.remove()), i.$slides && (i.$slides.removeClass("slick-slide slick-active slick-center slick-visible slick-current").removeAttr("aria-hidden").removeAttr("data-slick-index").each(function() {
                        e(this).attr("style", e(this).data("originalStyling"))
                    }), i.$slideTrack.children(this.options.slide).detach(), i.$slideTrack.detach(), i.$list.detach(), i.$slider.append(i.$slides)), i.cleanUpRows(), i.$slider.removeClass("slick-slider"), i.$slider.removeClass("slick-initialized"), i.$slider.removeClass("slick-dotted"), i.unslicked = !0, t || i.$slider.trigger("destroy", [i])
                }, t.prototype.disableTransition = function(e) {
                    var t = this,
                        i = {};
                    i[t.transitionType] = "", t.options.fade === !1 ? t.$slideTrack.css(i) : t.$slides.eq(e).css(i)
                }, t.prototype.fadeSlide = function(e, t) {
                    var i = this;
                    i.cssTransitions === !1 ? (i.$slides.eq(e).css({
                        zIndex: i.options.zIndex
                    }), i.$slides.eq(e).animate({
                        opacity: 1
                    }, i.options.speed, i.options.easing, t)) : (i.applyTransition(e), i.$slides.eq(e).css({
                        opacity: 1,
                        zIndex: i.options.zIndex
                    }), t && setTimeout(function() {
                        i.disableTransition(e), t.call()
                    }, i.options.speed))
                }, t.prototype.fadeSlideOut = function(e) {
                    var t = this;
                    t.cssTransitions === !1 ? t.$slides.eq(e).animate({
                        opacity: 0,
                        zIndex: t.options.zIndex - 2
                    }, t.options.speed, t.options.easing) : (t.applyTransition(e), t.$slides.eq(e).css({
                        opacity: 0,
                        zIndex: t.options.zIndex - 2
                    }))
                }, t.prototype.filterSlides = t.prototype.slickFilter = function(e) {
                    var t = this;
                    null !== e && (t.$slidesCache = t.$slides, t.unload(), t.$slideTrack.children(this.options.slide).detach(), t.$slidesCache.filter(e).appendTo(t.$slideTrack), t.reinit())
                }, t.prototype.focusHandler = function() {
                    var t = this;
                    t.$slider.off("focus.slick blur.slick").on("focus.slick blur.slick", "*", function(i) {
                        i.stopImmediatePropagation();
                        var n = e(this);
                        setTimeout(function() {
                            t.options.pauseOnFocus && (t.focussed = n.is(":focus"), t.autoPlay())
                        }, 0)
                    })
                }, t.prototype.getCurrent = t.prototype.slickCurrentSlide = function() {
                    var e = this;
                    return e.currentSlide
                }, t.prototype.getDotCount = function() {
                    var e = this,
                        t = 0,
                        i = 0,
                        n = 0;
                    if (e.options.infinite === !0)
                        if (e.slideCount <= e.options.slidesToShow) ++n;
                        else
                            for (; t < e.slideCount;) ++n, t = i + e.options.slidesToScroll, i += e.options.slidesToScroll <= e.options.slidesToShow ? e.options.slidesToScroll : e.options.slidesToShow;
                    else if (e.options.centerMode === !0) n = e.slideCount;
                    else if (e.options.asNavFor)
                        for (; t < e.slideCount;) ++n, t = i + e.options.slidesToScroll, i += e.options.slidesToScroll <= e.options.slidesToShow ? e.options.slidesToScroll : e.options.slidesToShow;
                    else n = 1 + Math.ceil((e.slideCount - e.options.slidesToShow) / e.options.slidesToScroll);
                    return n - 1
                }, t.prototype.getLeft = function(e) {
                    var t, i, n, s, o = this,
                        r = 0;
                    return o.slideOffset = 0, i = o.$slides.first().outerHeight(!0), o.options.infinite === !0 ? (o.slideCount > o.options.slidesToShow && (o.slideOffset = o.slideWidth * o.options.slidesToShow * -1, s = -1, o.options.vertical === !0 && o.options.centerMode === !0 && (2 === o.options.slidesToShow ? s = -1.5 : 1 === o.options.slidesToShow && (s = -2)), r = i * o.options.slidesToShow * s), o.slideCount % o.options.slidesToScroll !== 0 && e + o.options.slidesToScroll > o.slideCount && o.slideCount > o.options.slidesToShow && (e > o.slideCount ? (o.slideOffset = (o.options.slidesToShow - (e - o.slideCount)) * o.slideWidth * -1, r = (o.options.slidesToShow - (e - o.slideCount)) * i * -1) : (o.slideOffset = o.slideCount % o.options.slidesToScroll * o.slideWidth * -1, r = o.slideCount % o.options.slidesToScroll * i * -1))) : e + o.options.slidesToShow > o.slideCount && (o.slideOffset = (e + o.options.slidesToShow - o.slideCount) * o.slideWidth, r = (e + o.options.slidesToShow - o.slideCount) * i), o.slideCount <= o.options.slidesToShow && (o.slideOffset = 0, r = 0), o.options.centerMode === !0 && o.slideCount <= o.options.slidesToShow ? o.slideOffset = o.slideWidth * Math.floor(o.options.slidesToShow) / 2 - o.slideWidth * o.slideCount / 2 : o.options.centerMode === !0 && o.options.infinite === !0 ? o.slideOffset += o.slideWidth * Math.floor(o.options.slidesToShow / 2) - o.slideWidth : o.options.centerMode === !0 && (o.slideOffset = 0, o.slideOffset += o.slideWidth * Math.floor(o.options.slidesToShow / 2)), t = o.options.vertical === !1 ? e * o.slideWidth * -1 + o.slideOffset : e * i * -1 + r, o.options.variableWidth === !0 && (n = o.slideCount <= o.options.slidesToShow || o.options.infinite === !1 ? o.$slideTrack.children(".slick-slide").eq(e) : o.$slideTrack.children(".slick-slide").eq(e + o.options.slidesToShow), t = o.options.rtl === !0 ? n[0] ? -1 * (o.$slideTrack.width() - n[0].offsetLeft - n.width()) : 0 : n[0] ? -1 * n[0].offsetLeft : 0, o.options.centerMode === !0 && (n = o.slideCount <= o.options.slidesToShow || o.options.infinite === !1 ? o.$slideTrack.children(".slick-slide").eq(e) : o.$slideTrack.children(".slick-slide").eq(e + o.options.slidesToShow + 1), t = o.options.rtl === !0 ? n[0] ? -1 * (o.$slideTrack.width() - n[0].offsetLeft - n.width()) : 0 : n[0] ? -1 * n[0].offsetLeft : 0, t += (o.$list.width() - n.outerWidth()) / 2)), t
                }, t.prototype.getOption = t.prototype.slickGetOption = function(e) {
                    var t = this;
                    return t.options[e]
                }, t.prototype.getNavigableIndexes = function() {
                    var e, t = this,
                        i = 0,
                        n = 0,
                        s = [];
                    for (t.options.infinite === !1 ? e = t.slideCount : (i = -1 * t.options.slidesToScroll, n = -1 * t.options.slidesToScroll, e = 2 * t.slideCount); e > i;) s.push(i), i = n + t.options.slidesToScroll, n += t.options.slidesToScroll <= t.options.slidesToShow ? t.options.slidesToScroll : t.options.slidesToShow;
                    return s
                }, t.prototype.getSlick = function() {
                    return this
                }, t.prototype.getSlideCount = function() {
                    var t, i, n, s = this;
                    return n = s.options.centerMode === !0 ? s.slideWidth * Math.floor(s.options.slidesToShow / 2) : 0, s.options.swipeToSlide === !0 ? (s.$slideTrack.find(".slick-slide").each(function(t, o) {
                        return o.offsetLeft - n + e(o).outerWidth() / 2 > -1 * s.swipeLeft ? (i = o, !1) : void 0
                    }), t = Math.abs(e(i).attr("data-slick-index") - s.currentSlide) || 1) : s.options.slidesToScroll
                }, t.prototype.goTo = t.prototype.slickGoTo = function(e, t) {
                    var i = this;
                    i.changeSlide({
                        data: {
                            message: "index",
                            index: parseInt(e)
                        }
                    }, t)
                }, t.prototype.init = function(t) {
                    var i = this;
                    e(i.$slider).hasClass("slick-initialized") || (e(i.$slider).addClass("slick-initialized"), i.buildRows(), i.buildOut(), i.setProps(), i.startLoad(), i.loadSlider(), i.initializeEvents(), i.updateArrows(), i.updateDots(), i.checkResponsive(!0), i.focusHandler()), t && i.$slider.trigger("init", [i]), i.options.accessibility === !0 && i.initADA(), i.options.autoplay && (i.paused = !1, i.autoPlay())
                }, t.prototype.initADA = function() {
                    var t = this,
                        i = Math.ceil(t.slideCount / t.options.slidesToShow),
                        n = t.getNavigableIndexes().filter(function(e) {
                            return e >= 0 && e < t.slideCount
                        });
                    t.$slides.add(t.$slideTrack.find(".slick-cloned")).attr({
                        "aria-hidden": "true",
                        tabindex: "-1"
                    }).find("a, input, button, select").attr({
                        tabindex: "-1"
                    }), null !== t.$dots && (t.$slides.not(t.$slideTrack.find(".slick-cloned")).each(function(i) {
                        var s = n.indexOf(i);
                        if (e(this).attr({
                                role: "tabpanel",
                                id: "slick-slide" + t.instanceUid + i,
                                tabindex: -1
                            }), -1 !== s) {
                            var o = "slick-slide-control" + t.instanceUid + s;
                            e("#" + o).length && e(this).attr({
                                "aria-describedby": o
                            })
                        }
                    }), t.$dots.attr("role", "tablist").find("li").each(function(s) {
                        var o = n[s];
                        e(this).attr({
                            role: "presentation"
                        }), e(this).find("button").first().attr({
                            role: "tab",
                            id: "slick-slide-control" + t.instanceUid + s,
                            "aria-controls": "slick-slide" + t.instanceUid + o,
                            "aria-label": s + 1 + " of " + i,
                            "aria-selected": null,
                            tabindex: "-1"
                        })
                    }).eq(t.currentSlide).find("button").attr({
                        "aria-selected": "true",
                        tabindex: "0"
                    }).end());
                    for (var s = t.currentSlide, o = s + t.options.slidesToShow; o > s; s++) t.options.focusOnChange ? t.$slides.eq(s).attr({
                        tabindex: "0"
                    }) : t.$slides.eq(s).removeAttr("tabindex");
                    t.activateADA()
                }, t.prototype.initArrowEvents = function() {
                    var e = this;
                    e.options.arrows === !0 && e.slideCount > e.options.slidesToShow && (e.$prevArrow.off("click.slick").on("click.slick", {
                        message: "previous"
                    }, e.changeSlide), e.$nextArrow.off("click.slick").on("click.slick", {
                        message: "next"
                    }, e.changeSlide), e.options.accessibility === !0 && (e.$prevArrow.on("keydown.slick", e.keyHandler), e.$nextArrow.on("keydown.slick", e.keyHandler)))
                }, t.prototype.initDotEvents = function() {
                    var t = this;
                    t.options.dots === !0 && t.slideCount > t.options.slidesToShow && (e("li", t.$dots).on("click.slick", {
                        message: "index"
                    }, t.changeSlide), t.options.accessibility === !0 && t.$dots.on("keydown.slick", t.keyHandler)), t.options.dots === !0 && t.options.pauseOnDotsHover === !0 && t.slideCount > t.options.slidesToShow && e("li", t.$dots).on("mouseenter.slick", e.proxy(t.interrupt, t, !0)).on("mouseleave.slick", e.proxy(t.interrupt, t, !1))
                }, t.prototype.initSlideEvents = function() {
                    var t = this;
                    t.options.pauseOnHover && (t.$list.on("mouseenter.slick", e.proxy(t.interrupt, t, !0)), t.$list.on("mouseleave.slick", e.proxy(t.interrupt, t, !1)))
                }, t.prototype.initializeEvents = function() {
                    var t = this;
                    t.initArrowEvents(), t.initDotEvents(), t.initSlideEvents(), t.$list.on("touchstart.slick mousedown.slick", {
                        action: "start"
                    }, t.swipeHandler), t.$list.on("touchmove.slick mousemove.slick", {
                        action: "move"
                    }, t.swipeHandler), t.$list.on("touchend.slick mouseup.slick", {
                        action: "end"
                    }, t.swipeHandler), t.$list.on("touchcancel.slick mouseleave.slick", {
                        action: "end"
                    }, t.swipeHandler), t.$list.on("click.slick", t.clickHandler), e(document).on(t.visibilityChange, e.proxy(t.visibility, t)), t.options.accessibility === !0 && t.$list.on("keydown.slick", t.keyHandler), t.options.focusOnSelect === !0 && e(t.$slideTrack).children().on("click.slick", t.selectHandler), e(window).on("orientationchange.slick.slick-" + t.instanceUid, e.proxy(t.orientationChange, t)), e(window).on("resize.slick.slick-" + t.instanceUid, e.proxy(t.resize, t)), e("[draggable!=true]", t.$slideTrack).on("dragstart", t.preventDefault), e(window).on("load.slick.slick-" + t.instanceUid, t.setPosition), e(t.setPosition)
                }, t.prototype.initUI = function() {
                    var e = this;
                    e.options.arrows === !0 && e.slideCount > e.options.slidesToShow && (e.$prevArrow.show(), e.$nextArrow.show()), e.options.dots === !0 && e.slideCount > e.options.slidesToShow && e.$dots.show()
                }, t.prototype.keyHandler = function(e) {
                    var t = this;
                    e.target.tagName.match("TEXTAREA|INPUT|SELECT") || (37 === e.keyCode && t.options.accessibility === !0 ? t.changeSlide({
                        data: {
                            message: t.options.rtl === !0 ? "next" : "previous"
                        }
                    }) : 39 === e.keyCode && t.options.accessibility === !0 && t.changeSlide({
                        data: {
                            message: t.options.rtl === !0 ? "previous" : "next"
                        }
                    }))
                }, t.prototype.lazyLoad = function() {
                    function t(t) {
                        e("img[data-lazy]", t).each(function() {
                            var t = e(this),
                                i = e(this).attr("data-lazy"),
                                n = e(this).attr("data-srcset"),
                                s = e(this).attr("data-sizes") || r.$slider.attr("data-sizes"),
                                o = document.createElement("img");
                            o.onload = function() {
                                t.animate({
                                    opacity: 0
                                }, 100, function() {
                                    n && (t.attr("srcset", n), s && t.attr("sizes", s)), t.attr("src", i).animate({
                                        opacity: 1
                                    }, 200, function() {
                                        t.removeAttr("data-lazy data-srcset data-sizes").removeClass("slick-loading")
                                    }), r.$slider.trigger("lazyLoaded", [r, t, i])
                                })
                            }, o.onerror = function() {
                                t.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), r.$slider.trigger("lazyLoadError", [r, t, i])
                            }, o.src = i
                        })
                    }
                    var i, n, s, o, r = this;
                    if (r.options.centerMode === !0 ? r.options.infinite === !0 ? (s = r.currentSlide + (r.options.slidesToShow / 2 + 1), o = s + r.options.slidesToShow + 2) : (s = Math.max(0, r.currentSlide - (r.options.slidesToShow / 2 + 1)), o = 2 + (r.options.slidesToShow / 2 + 1) + r.currentSlide) : (s = r.options.infinite ? r.options.slidesToShow + r.currentSlide : r.currentSlide, o = Math.ceil(s + r.options.slidesToShow), r.options.fade === !0 && (s > 0 && s--, o <= r.slideCount && o++)), i = r.$slider.find(".slick-slide").slice(s, o), "anticipated" === r.options.lazyLoad)
                        for (var a = s - 1, l = o, d = r.$slider.find(".slick-slide"), c = 0; c < r.options.slidesToScroll; c++) 0 > a && (a = r.slideCount - 1), i = i.add(d.eq(a)), i = i.add(d.eq(l)), a--, l++;
                    t(i), r.slideCount <= r.options.slidesToShow ? (n = r.$slider.find(".slick-slide"), t(n)) : r.currentSlide >= r.slideCount - r.options.slidesToShow ? (n = r.$slider.find(".slick-cloned").slice(0, r.options.slidesToShow), t(n)) : 0 === r.currentSlide && (n = r.$slider.find(".slick-cloned").slice(-1 * r.options.slidesToShow), t(n))
                }, t.prototype.loadSlider = function() {
                    var e = this;
                    e.setPosition(), e.$slideTrack.css({
                        opacity: 1
                    }), e.$slider.removeClass("slick-loading"), e.initUI(), "progressive" === e.options.lazyLoad && e.progressiveLazyLoad()
                }, t.prototype.next = t.prototype.slickNext = function() {
                    var e = this;
                    e.changeSlide({
                        data: {
                            message: "next"
                        }
                    })
                }, t.prototype.orientationChange = function() {
                    var e = this;
                    e.checkResponsive(), e.setPosition()
                }, t.prototype.pause = t.prototype.slickPause = function() {
                    var e = this;
                    e.autoPlayClear(), e.paused = !0
                }, t.prototype.play = t.prototype.slickPlay = function() {
                    var e = this;
                    e.autoPlay(), e.options.autoplay = !0, e.paused = !1, e.focussed = !1, e.interrupted = !1
                }, t.prototype.postSlide = function(t) {
                    var i = this;
                    if (!i.unslicked && (i.$slider.trigger("afterChange", [i, t]), i.animating = !1, i.slideCount > i.options.slidesToShow && i.setPosition(), i.swipeLeft = null, i.options.autoplay && i.autoPlay(), i.options.accessibility === !0 && (i.initADA(), i.options.focusOnChange))) {
                        var n = e(i.$slides.get(i.currentSlide));
                        n.attr("tabindex", 0).focus()
                    }
                }, t.prototype.prev = t.prototype.slickPrev = function() {
                    var e = this;
                    e.changeSlide({
                        data: {
                            message: "previous"
                        }
                    })
                }, t.prototype.preventDefault = function(e) {
                    e.preventDefault()
                }, t.prototype.progressiveLazyLoad = function(t) {
                    t = t || 1;
                    var i, n, s, o, r, a = this,
                        l = e("img[data-lazy]", a.$slider);
                    l.length ? (i = l.first(), n = i.attr("data-lazy"), s = i.attr("data-srcset"), o = i.attr("data-sizes") || a.$slider.attr("data-sizes"), r = document.createElement("img"), r.onload = function() {
                        s && (i.attr("srcset", s), o && i.attr("sizes", o)), i.attr("src", n).removeAttr("data-lazy data-srcset data-sizes").removeClass("slick-loading"), a.options.adaptiveHeight === !0 && a.setPosition(), a.$slider.trigger("lazyLoaded", [a, i, n]), a.progressiveLazyLoad()
                    }, r.onerror = function() {
                        3 > t ? setTimeout(function() {
                            a.progressiveLazyLoad(t + 1)
                        }, 500) : (i.removeAttr("data-lazy").removeClass("slick-loading").addClass("slick-lazyload-error"), a.$slider.trigger("lazyLoadError", [a, i, n]), a.progressiveLazyLoad())
                    }, r.src = n) : a.$slider.trigger("allImagesLoaded", [a])
                }, t.prototype.refresh = function(t) {
                    var i, n, s = this;
                    n = s.slideCount - s.options.slidesToShow, !s.options.infinite && s.currentSlide > n && (s.currentSlide = n), s.slideCount <= s.options.slidesToShow && (s.currentSlide = 0), i = s.currentSlide, s.destroy(!0), e.extend(s, s.initials, {
                        currentSlide: i
                    }), s.init(), t || s.changeSlide({
                        data: {
                            message: "index",
                            index: i
                        }
                    }, !1)
                }, t.prototype.registerBreakpoints = function() {
                    var t, i, n, s = this,
                        o = s.options.responsive || null;
                    if ("array" === e.type(o) && o.length) {
                        s.respondTo = s.options.respondTo || "window";
                        for (t in o)
                            if (n = s.breakpoints.length - 1, o.hasOwnProperty(t)) {
                                for (i = o[t].breakpoint; n >= 0;) s.breakpoints[n] && s.breakpoints[n] === i && s.breakpoints.splice(n, 1), n--;
                                s.breakpoints.push(i), s.breakpointSettings[i] = o[t].settings
                            }
                        s.breakpoints.sort(function(e, t) {
                            return s.options.mobileFirst ? e - t : t - e
                        })
                    }
                }, t.prototype.reinit = function() {
                    var t = this;
                    t.$slides = t.$slideTrack.children(t.options.slide).addClass("slick-slide"), t.slideCount = t.$slides.length, t.currentSlide >= t.slideCount && 0 !== t.currentSlide && (t.currentSlide = t.currentSlide - t.options.slidesToScroll), t.slideCount <= t.options.slidesToShow && (t.currentSlide = 0), t.registerBreakpoints(), t.setProps(), t.setupInfinite(), t.buildArrows(), t.updateArrows(), t.initArrowEvents(), t.buildDots(), t.updateDots(), t.initDotEvents(), t.cleanUpSlideEvents(), t.initSlideEvents(), t.checkResponsive(!1, !0), t.options.focusOnSelect === !0 && e(t.$slideTrack).children().on("click.slick", t.selectHandler), t.setSlideClasses("number" == typeof t.currentSlide ? t.currentSlide : 0), t.setPosition(), t.focusHandler(), t.paused = !t.options.autoplay, t.autoPlay(), t.$slider.trigger("reInit", [t])
                }, t.prototype.resize = function() {
                    var t = this;
                    e(window).width() !== t.windowWidth && (clearTimeout(t.windowDelay), t.windowDelay = window.setTimeout(function() {
                        t.windowWidth = e(window).width(), t.checkResponsive(), t.unslicked || t.setPosition()
                    }, 50))
                }, t.prototype.removeSlide = t.prototype.slickRemove = function(e, t, i) {
                    var n = this;
                    return "boolean" == typeof e ? (t = e, e = t === !0 ? 0 : n.slideCount - 1) : e = t === !0 ? --e : e, n.slideCount < 1 || 0 > e || e > n.slideCount - 1 ? !1 : (n.unload(), i === !0 ? n.$slideTrack.children().remove() : n.$slideTrack.children(this.options.slide).eq(e).remove(), n.$slides = n.$slideTrack.children(this.options.slide), n.$slideTrack.children(this.options.slide).detach(), n.$slideTrack.append(n.$slides), n.$slidesCache = n.$slides, void n.reinit())
                }, t.prototype.setCSS = function(e) {
                    var t, i, n = this,
                        s = {};
                    n.options.rtl === !0 && (e = -e), t = "left" == n.positionProp ? Math.ceil(e) + "px" : "0px", i = "top" == n.positionProp ? Math.ceil(e) + "px" : "0px", s[n.positionProp] = e, n.transformsEnabled === !1 ? n.$slideTrack.css(s) : (s = {}, n.cssTransitions === !1 ? (s[n.animType] = "translate(" + t + ", " + i + ")", n.$slideTrack.css(s)) : (s[n.animType] = "translate3d(" + t + ", " + i + ", 0px)", n.$slideTrack.css(s)))
                }, t.prototype.setDimensions = function() {
                    var e = this;
                    e.options.vertical === !1 ? e.options.centerMode === !0 && e.$list.css({
                        padding: "0px " + e.options.centerPadding
                    }) : (e.$list.height(e.$slides.first().outerHeight(!0) * e.options.slidesToShow), e.options.centerMode === !0 && e.$list.css({
                        padding: e.options.centerPadding + " 0px"
                    })), e.listWidth = e.$list.width(), e.listHeight = e.$list.height(), e.options.vertical === !1 && e.options.variableWidth === !1 ? (e.slideWidth = Math.ceil(e.listWidth / e.options.slidesToShow), e.$slideTrack.width(Math.ceil(e.slideWidth * e.$slideTrack.children(".slick-slide").length))) : e.options.variableWidth === !0 ? e.$slideTrack.width(5e3 * e.slideCount) : (e.slideWidth = Math.ceil(e.listWidth), e.$slideTrack.height(Math.ceil(e.$slides.first().outerHeight(!0) * e.$slideTrack.children(".slick-slide").length)));
                    var t = e.$slides.first().outerWidth(!0) - e.$slides.first().width();
                    e.options.variableWidth === !1 && e.$slideTrack.children(".slick-slide").width(e.slideWidth - t)
                }, t.prototype.setFade = function() {
                    var t, i = this;
                    i.$slides.each(function(n, s) {
                        t = i.slideWidth * n * -1, i.options.rtl === !0 ? e(s).css({
                            position: "relative",
                            right: t,
                            top: 0,
                            zIndex: i.options.zIndex - 2,
                            opacity: 0
                        }) : e(s).css({
                            position: "relative",
                            left: t,
                            top: 0,
                            zIndex: i.options.zIndex - 2,
                            opacity: 0
                        })
                    }), i.$slides.eq(i.currentSlide).css({
                        zIndex: i.options.zIndex - 1,
                        opacity: 1
                    })
                }, t.prototype.setHeight = function() {
                    var e = this;
                    if (1 === e.options.slidesToShow && e.options.adaptiveHeight === !0 && e.options.vertical === !1) {
                        var t = e.$slides.eq(e.currentSlide).outerHeight(!0);
                        e.$list.css("height", t)
                    }
                }, t.prototype.setOption = t.prototype.slickSetOption = function() {
                    var t, i, n, s, o, r = this,
                        a = !1;
                    if ("object" === e.type(arguments[0]) ? (n = arguments[0], a = arguments[1], o = "multiple") : "string" === e.type(arguments[0]) && (n = arguments[0], s = arguments[1], a = arguments[2], "responsive" === arguments[0] && "array" === e.type(arguments[1]) ? o = "responsive" : "undefined" != typeof arguments[1] && (o = "single")), "single" === o) r.options[n] = s;
                    else if ("multiple" === o) e.each(n, function(e, t) {
                        r.options[e] = t
                    });
                    else if ("responsive" === o)
                        for (i in s)
                            if ("array" !== e.type(r.options.responsive)) r.options.responsive = [s[i]];
                            else {
                                for (t = r.options.responsive.length - 1; t >= 0;) r.options.responsive[t].breakpoint === s[i].breakpoint && r.options.responsive.splice(t, 1), t--;
                                r.options.responsive.push(s[i])
                            }
                    a && (r.unload(), r.reinit())
                }, t.prototype.setPosition = function() {
                    var e = this;
                    e.setDimensions(), e.setHeight(), e.options.fade === !1 ? e.setCSS(e.getLeft(e.currentSlide)) : e.setFade(), e.$slider.trigger("setPosition", [e])
                }, t.prototype.setProps = function() {
                    var e = this,
                        t = document.body.style;
                    e.positionProp = e.options.vertical === !0 ? "top" : "left", "top" === e.positionProp ? e.$slider.addClass("slick-vertical") : e.$slider.removeClass("slick-vertical"), (void 0 !== t.WebkitTransition || void 0 !== t.MozTransition || void 0 !== t.msTransition) && e.options.useCSS === !0 && (e.cssTransitions = !0), e.options.fade && ("number" == typeof e.options.zIndex ? e.options.zIndex < 3 && (e.options.zIndex = 3) : e.options.zIndex = e.defaults.zIndex), void 0 !== t.OTransform && (e.animType = "OTransform", e.transformType = "-o-transform", e.transitionType = "OTransition", void 0 === t.perspectiveProperty && void 0 === t.webkitPerspective && (e.animType = !1)), void 0 !== t.MozTransform && (e.animType = "MozTransform", e.transformType = "-moz-transform", e.transitionType = "MozTransition", void 0 === t.perspectiveProperty && void 0 === t.MozPerspective && (e.animType = !1)), void 0 !== t.webkitTransform && (e.animType = "webkitTransform", e.transformType = "-webkit-transform", e.transitionType = "webkitTransition", void 0 === t.perspectiveProperty && void 0 === t.webkitPerspective && (e.animType = !1)), void 0 !== t.msTransform && (e.animType = "msTransform", e.transformType = "-ms-transform", e.transitionType = "msTransition", void 0 === t.msTransform && (e.animType = !1)), void 0 !== t.transform && e.animType !== !1 && (e.animType = "transform", e.transformType = "transform", e.transitionType = "transition"), e.transformsEnabled = e.options.useTransform && null !== e.animType && e.animType !== !1
                }, t.prototype.setSlideClasses = function(e) {
                    var t, i, n, s, o = this;
                    if (i = o.$slider.find(".slick-slide").removeClass("slick-active slick-center slick-current").attr("aria-hidden", "true"), o.$slides.eq(e).addClass("slick-current"), o.options.centerMode === !0) {
                        var r = o.options.slidesToShow % 2 === 0 ? 1 : 0;
                        t = Math.floor(o.options.slidesToShow / 2), o.options.infinite === !0 && (e >= t && e <= o.slideCount - 1 - t ? o.$slides.slice(e - t + r, e + t + 1).addClass("slick-active").attr("aria-hidden", "false") : (n = o.options.slidesToShow + e, i.slice(n - t + 1 + r, n + t + 2).addClass("slick-active").attr("aria-hidden", "false")), 0 === e ? i.eq(i.length - 1 - o.options.slidesToShow).addClass("slick-center") : e === o.slideCount - 1 && i.eq(o.options.slidesToShow).addClass("slick-center")), o.$slides.eq(e).addClass("slick-center")
                    } else e >= 0 && e <= o.slideCount - o.options.slidesToShow ? o.$slides.slice(e, e + o.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false") : i.length <= o.options.slidesToShow ? i.addClass("slick-active").attr("aria-hidden", "false") : (s = o.slideCount % o.options.slidesToShow, n = o.options.infinite === !0 ? o.options.slidesToShow + e : e, o.options.slidesToShow == o.options.slidesToScroll && o.slideCount - e < o.options.slidesToShow ? i.slice(n - (o.options.slidesToShow - s), n + s).addClass("slick-active").attr("aria-hidden", "false") : i.slice(n, n + o.options.slidesToShow).addClass("slick-active").attr("aria-hidden", "false"));
                    ("ondemand" === o.options.lazyLoad || "anticipated" === o.options.lazyLoad) && o.lazyLoad()
                }, t.prototype.setupInfinite = function() {
                    var t, i, n, s = this;
                    if (s.options.fade === !0 && (s.options.centerMode = !1), s.options.infinite === !0 && s.options.fade === !1 && (i = null, s.slideCount > s.options.slidesToShow)) {
                        for (n = s.options.centerMode === !0 ? s.options.slidesToShow + 1 : s.options.slidesToShow, t = s.slideCount; t > s.slideCount - n; t -= 1) i = t - 1, e(s.$slides[i]).clone(!0).attr("id", "").attr("data-slick-index", i - s.slideCount).prependTo(s.$slideTrack).addClass("slick-cloned");
                        for (t = 0; t < n + s.slideCount; t += 1) i = t, e(s.$slides[i]).clone(!0).attr("id", "").attr("data-slick-index", i + s.slideCount).appendTo(s.$slideTrack).addClass("slick-cloned");
                        s.$slideTrack.find(".slick-cloned").find("[id]").each(function() {
                            e(this).attr("id", "")
                        })
                    }
                }, t.prototype.interrupt = function(e) {
                    var t = this;
                    e || t.autoPlay(), t.interrupted = e
                }, t.prototype.selectHandler = function(t) {
                    var i = this,
                        n = e(t.target).is(".slick-slide") ? e(t.target) : e(t.target).parents(".slick-slide"),
                        s = parseInt(n.attr("data-slick-index"));
                    return s || (s = 0), i.slideCount <= i.options.slidesToShow ? void i.slideHandler(s, !1, !0) : void i.slideHandler(s)
                }, t.prototype.slideHandler = function(e, t, i) {
                    var n, s, o, r, a, l = null,
                        d = this;
                    return t = t || !1, d.animating === !0 && d.options.waitForAnimate === !0 || d.options.fade === !0 && d.currentSlide === e ? void 0 : (t === !1 && d.asNavFor(e), n = e, l = d.getLeft(n), r = d.getLeft(d.currentSlide), d.currentLeft = null === d.swipeLeft ? r : d.swipeLeft, d.options.infinite === !1 && d.options.centerMode === !1 && (0 > e || e > d.getDotCount() * d.options.slidesToScroll) ? void(d.options.fade === !1 && (n = d.currentSlide, i !== !0 && d.slideCount > d.options.slidesToShow ? d.animateSlide(r, function() {
                        d.postSlide(n)
                    }) : d.postSlide(n))) : d.options.infinite === !1 && d.options.centerMode === !0 && (0 > e || e > d.slideCount - d.options.slidesToScroll) ? void(d.options.fade === !1 && (n = d.currentSlide, i !== !0 && d.slideCount > d.options.slidesToShow ? d.animateSlide(r, function() {
                        d.postSlide(n)
                    }) : d.postSlide(n))) : (d.options.autoplay && clearInterval(d.autoPlayTimer), s = 0 > n ? d.slideCount % d.options.slidesToScroll !== 0 ? d.slideCount - d.slideCount % d.options.slidesToScroll : d.slideCount + n : n >= d.slideCount ? d.slideCount % d.options.slidesToScroll !== 0 ? 0 : n - d.slideCount : n, d.animating = !0, d.$slider.trigger("beforeChange", [d, d.currentSlide, s]), o = d.currentSlide, d.currentSlide = s, d.setSlideClasses(d.currentSlide), d.options.asNavFor && (a = d.getNavTarget(), a = a.slick("getSlick"), a.slideCount <= a.options.slidesToShow && a.setSlideClasses(d.currentSlide)), d.updateDots(), d.updateArrows(), d.options.fade === !0 ? (i !== !0 ? (d.fadeSlideOut(o), d.fadeSlide(s, function() {
                        d.postSlide(s)
                    })) : d.postSlide(s), void d.animateHeight()) : void(i !== !0 && d.slideCount > d.options.slidesToShow ? d.animateSlide(l, function() {
                        d.postSlide(s)
                    }) : d.postSlide(s))))
                }, t.prototype.startLoad = function() {
                    var e = this;
                    e.options.arrows === !0 && e.slideCount > e.options.slidesToShow && (e.$prevArrow.hide(), e.$nextArrow.hide()), e.options.dots === !0 && e.slideCount > e.options.slidesToShow && e.$dots.hide(), e.$slider.addClass("slick-loading")
                }, t.prototype.swipeDirection = function() {
                    var e, t, i, n, s = this;
                    return e = s.touchObject.startX - s.touchObject.curX, t = s.touchObject.startY - s.touchObject.curY, i = Math.atan2(t, e), n = Math.round(180 * i / Math.PI), 0 > n && (n = 360 - Math.abs(n)), 45 >= n && n >= 0 ? s.options.rtl === !1 ? "left" : "right" : 360 >= n && n >= 315 ? s.options.rtl === !1 ? "left" : "right" : n >= 135 && 225 >= n ? s.options.rtl === !1 ? "right" : "left" : s.options.verticalSwiping === !0 ? n >= 35 && 135 >= n ? "down" : "up" : "vertical"
                }, t.prototype.swipeEnd = function(e) {
                    var t, i, n = this;
                    if (n.dragging = !1, n.swiping = !1, n.scrolling) return n.scrolling = !1, !1;
                    if (n.interrupted = !1, n.shouldClick = n.touchObject.swipeLength > 10 ? !1 : !0, void 0 === n.touchObject.curX) return !1;
                    if (n.touchObject.edgeHit === !0 && n.$slider.trigger("edge", [n, n.swipeDirection()]), n.touchObject.swipeLength >= n.touchObject.minSwipe) {
                        switch (i = n.swipeDirection()) {
                            case "left":
                            case "down":
                                t = n.options.swipeToSlide ? n.checkNavigable(n.currentSlide + n.getSlideCount()) : n.currentSlide + n.getSlideCount(), n.currentDirection = 0;
                                break;
                            case "right":
                            case "up":
                                t = n.options.swipeToSlide ? n.checkNavigable(n.currentSlide - n.getSlideCount()) : n.currentSlide - n.getSlideCount(), n.currentDirection = 1
                        }
                        "vertical" != i && (n.slideHandler(t), n.touchObject = {}, n.$slider.trigger("swipe", [n, i]))
                    } else n.touchObject.startX !== n.touchObject.curX && (n.slideHandler(n.currentSlide), n.touchObject = {})
                }, t.prototype.swipeHandler = function(e) {
                    var t = this;
                    if (!(t.options.swipe === !1 || "ontouchend" in document && t.options.swipe === !1 || t.options.draggable === !1 && -1 !== e.type.indexOf("mouse"))) switch (t.touchObject.fingerCount = e.originalEvent && void 0 !== e.originalEvent.touches ? e.originalEvent.touches.length : 1, t.touchObject.minSwipe = t.listWidth / t.options.touchThreshold, t.options.verticalSwiping === !0 && (t.touchObject.minSwipe = t.listHeight / t.options.touchThreshold), e.data.action) {
                        case "start":
                            t.swipeStart(e);
                            break;
                        case "move":
                            t.swipeMove(e);
                            break;
                        case "end":
                            t.swipeEnd(e)
                    }
                }, t.prototype.swipeMove = function(e) {
                    var t, i, n, s, o, r, a = this;
                    return o = void 0 !== e.originalEvent ? e.originalEvent.touches : null, !a.dragging || a.scrolling || o && 1 !== o.length ? !1 : (t = a.getLeft(a.currentSlide), a.touchObject.curX = void 0 !== o ? o[0].pageX : e.clientX, a.touchObject.curY = void 0 !== o ? o[0].pageY : e.clientY, a.touchObject.swipeLength = Math.round(Math.sqrt(Math.pow(a.touchObject.curX - a.touchObject.startX, 2))), r = Math.round(Math.sqrt(Math.pow(a.touchObject.curY - a.touchObject.startY, 2))), !a.options.verticalSwiping && !a.swiping && r > 4 ? (a.scrolling = !0, !1) : (a.options.verticalSwiping === !0 && (a.touchObject.swipeLength = r), i = a.swipeDirection(), void 0 !== e.originalEvent && a.touchObject.swipeLength > 4 && (a.swiping = !0, e.preventDefault()), s = (a.options.rtl === !1 ? 1 : -1) * (a.touchObject.curX > a.touchObject.startX ? 1 : -1), a.options.verticalSwiping === !0 && (s = a.touchObject.curY > a.touchObject.startY ? 1 : -1), n = a.touchObject.swipeLength, a.touchObject.edgeHit = !1, a.options.infinite === !1 && (0 === a.currentSlide && "right" === i || a.currentSlide >= a.getDotCount() && "left" === i) && (n = a.touchObject.swipeLength * a.options.edgeFriction, a.touchObject.edgeHit = !0), a.options.vertical === !1 ? a.swipeLeft = t + n * s : a.swipeLeft = t + n * (a.$list.height() / a.listWidth) * s, a.options.verticalSwiping === !0 && (a.swipeLeft = t + n * s), a.options.fade === !0 || a.options.touchMove === !1 ? !1 : a.animating === !0 ? (a.swipeLeft = null, !1) : void a.setCSS(a.swipeLeft)))
                }, t.prototype.swipeStart = function(e) {
                    var t, i = this;
                    return i.interrupted = !0, 1 !== i.touchObject.fingerCount || i.slideCount <= i.options.slidesToShow ? (i.touchObject = {}, !1) : (void 0 !== e.originalEvent && void 0 !== e.originalEvent.touches && (t = e.originalEvent.touches[0]), i.touchObject.startX = i.touchObject.curX = void 0 !== t ? t.pageX : e.clientX, i.touchObject.startY = i.touchObject.curY = void 0 !== t ? t.pageY : e.clientY, void(i.dragging = !0))
                }, t.prototype.unfilterSlides = t.prototype.slickUnfilter = function() {
                    var e = this;
                    null !== e.$slidesCache && (e.unload(), e.$slideTrack.children(this.options.slide).detach(), e.$slidesCache.appendTo(e.$slideTrack), e.reinit())
                }, t.prototype.unload = function() {
                    var t = this;
                    e(".slick-cloned", t.$slider).remove(), t.$dots && t.$dots.remove(), t.$prevArrow && t.htmlExpr.test(t.options.prevArrow) && t.$prevArrow.remove(), t.$nextArrow && t.htmlExpr.test(t.options.nextArrow) && t.$nextArrow.remove(), t.$slides.removeClass("slick-slide slick-active slick-visible slick-current").attr("aria-hidden", "true").css("width", "")
                }, t.prototype.unslick = function(e) {
                    var t = this;
                    t.$slider.trigger("unslick", [t, e]), t.destroy()
                }, t.prototype.updateArrows = function() {
                    var e, t = this;
                    e = Math.floor(t.options.slidesToShow / 2), t.options.arrows === !0 && t.slideCount > t.options.slidesToShow && !t.options.infinite && (t.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), t.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false"), 0 === t.currentSlide ? (t.$prevArrow.addClass("slick-disabled").attr("aria-disabled", "true"), t.$nextArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : t.currentSlide >= t.slideCount - t.options.slidesToShow && t.options.centerMode === !1 ? (t.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), t.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")) : t.currentSlide >= t.slideCount - 1 && t.options.centerMode === !0 && (t.$nextArrow.addClass("slick-disabled").attr("aria-disabled", "true"), t.$prevArrow.removeClass("slick-disabled").attr("aria-disabled", "false")))
                }, t.prototype.updateDots = function() {
                    var e = this;
                    null !== e.$dots && (e.$dots.find("li").removeClass("slick-active").end(), e.$dots.find("li").eq(Math.floor(e.currentSlide / e.options.slidesToScroll)).addClass("slick-active"))
                }, t.prototype.visibility = function() {
                    var e = this;
                    e.options.autoplay && (document[e.hidden] ? e.interrupted = !0 : e.interrupted = !1)
                }, e.fn.slick = function() {
                    var e, i, n = this,
                        s = arguments[0],
                        o = Array.prototype.slice.call(arguments, 1),
                        r = n.length;
                    for (e = 0; r > e; e++)
                        if ("object" == typeof s || "undefined" == typeof s ? n[e].slick = new t(n[e], s) : i = n[e].slick[s].apply(n[e].slick, o), "undefined" != typeof i) return i;
                    return n
                }
            }), i("assets/js/theme-slider/slick-carousel", ["jquery", "underscore", "SlickCarousel", "isElementInView"], function(e, t, i, n) {
                "use strict";
                var s = {
                        container: e(".js-pt-slick-carousel-captions"),
                        title: e(".js-pt-slick-carousel-captions__title"),
                        text: e(".js-pt-slick-carousel-captions__text")
                    },
                    o = "is-in-transition",
                    r = function(e) {
                        return this.$slider = e, this.$parentContainer = e.parent(), this.$slider.length && "object" == typeof ShakaSliderCaptions && this.changeCaptions(), this.$slider.length && (this.initializeCarousel(), this.pauseCarouselIfNotVisible()), this
                    };
                return t.extend(r.prototype, {
                    changeCaptions: function() {
                        return this.$slider.on("beforeChange", function(e, t, i, n) {
                            s.container.addClass(o), ("" === ShakaSliderCaptions[n].title || ShakaSliderCaptions[n].is_video) && (Modernizr.mq("(max-width: 991px)") ? s.container.slideUp(300) : s.container.hide()), setTimeout(function() {
                                s.title.html(ShakaSliderCaptions[n].title), s.text.html(ShakaSliderCaptions[n].text), "" === ShakaSliderCaptions[n].title || ShakaSliderCaptions[n].is_video || (Modernizr.mq("(max-width: 991px)") ? s.container.slideDown(300) : s.container.show())
                            }, t.options.speed)
                        }), this.$slider.on("afterChange", function() {
                            s.container.removeClass(o)
                        }), this
                    },
                    pauseCarouselIfNotVisible: function() {
                        return e(document).on("scroll", t.bind(t.throttle(function() {
                            this.$slider.slick("slickGetOption", "autoplay") && (n(this.$slider) ? this.$slider.slick("slickPlay") : this.$slider.slick("slickPause"))
                        }, 1e3, {
                            leading: !1
                        }), this)), this
                    },
                    initializeCarousel: function() {
                        return this.$slider.slick(), this.$parentContainer.css("visibility", "visible"), this
                    }
                }), r
            }), i("assets/js/theme-slider/vimeo-events", ["jquery", "underscore"], function(e, t) {
                "use strict";
                var i = "*",
                    n = ".js-carousel-item-vimeo-video",
                    s = function(t) {
                        return this.sc = t, this.personProfileSliders = e(".js-person-profile-initialize-carousel"), this.pauseOnHover = this.sc.$slider.slick("slickGetOption", "pauseOnHover"), this.autoplay = this.sc.$slider.slick("slickGetOption", "autoplay"), this.sc.$slider.length && this.registerEventListeners(), this.registerSliderEvents(), this
                    };
                return t.extend(s.prototype, {
                    registerEventListeners: function() {
                        return window.addEventListener ? window.addEventListener("message", t.bind(this.onMessageReceived, this), !1) : window.attachEvent("onmessage", t.bind(this.onMessageReceived, this), !1), this
                    },
                    onMessageReceived: function(e) {
                        if (!/^https?:\/\/player.vimeo.com/.test(e.origin)) return !1;
                        "*" === i && (i = e.origin);
                        var t = JSON.parse(e.data);
                        switch (t.event) {
                            case "ready":
                                this.onReady(t);
                                break;
                            case "play":
                                this.onPlay();
                                break;
                            case "pause":
                                this.onPause()
                        }
                    },
                    post: function(t, n, s) {
                        var o = {
                            method: t
                        };
                        n && (o.value = n);
                        var r = JSON.stringify(o);
                        e("#" + s.player_id)[0].contentWindow.postMessage(r, i)
                    },
                    onReady: function(e) {
                        this.post("addEventListener", "play", e), this.post("addEventListener", "pause", e)
                    },
                    onPause: function() {
                        this.pauseOnHover && this.sc.$slider.slick("slickSetOption", "pauseOnHover", !0, !1)
                    },
                    onPlay: function() {
                        this.sc.$slider.slick("slickSetOption", "pauseOnHover", !1, !1), this.sc.$slider.slick("slickPause")
                    },
                    registerSliderEvents: function() {
                        this.sc.$slider.on("beforeChange", t.bind(function(e, t, i, n) {
                            this.onBeforeChange(e, t, i, n)
                        }, this)), this.personProfileSliders.on("beforeChange", t.bind(function(e, t, i, n) {
                            this.onBeforeChange(e, t, i, n)
                        }, this))
                    },
                    onBeforeChange: function(t, i, s, o) {
                        var r = e(t.target).find('.slick-slide[data-slick-index="' + s + '"] ' + n);
                        r.length && this.post("pause", "", {
                            player_id: r.children("iframe").attr("id")
                        })
                    }
                }), s
            }), i("assets/js/theme-slider/youtube-events", ["jquery"], function(e) {
                "use strict";

                function t(e) {
                    YT.PlayerState.PLAYING === e.data ? i() : YT.PlayerState.PAUSED === e.data && n()
                }

                function i() {
                    s.$slider.slick("slickSetOption", "pauseOnHover", !1, !1), s.$slider.slick("slickPause")
                }

                function n() {
                    o.pauseOnHover && s.$slider.slick("slickSetOption", "pauseOnHover", !0, !1)
                }
                var s, o = {},
                    r = ".js-carousel-item-yt-video",
                    a = e(".js-person-profile-initialize-carousel"),
                    l = function(i) {
                        s = i, o.pauseOnHover = s.$slider.slick("slickGetOption", "pauseOnHover"), o.autoplay = s.$slider.slick("slickGetOption", "autoplay"), window.onYouTubeIframeAPIReady = function() {
                            s.$slider.length && s.$slider.find(r + " iframe").each(function(i, n) {
                                new YT.Player(e(n).attr("id"), {
                                    events: {
                                        onStateChange: t
                                    }
                                })
                            }), a.length && a.find(r + " iframe").each(function(t, i) {
                                new YT.Player(e(i).attr("id"))
                            })
                        }, this.initializeYoutubeIframeApi(), this.registerSliderEvents()
                    };
                return _.extend(l.prototype, {
                    registerSliderEvents: function() {
                        s.$slider.on("beforeChange", _.bind(function(e, t, i, n) {
                            this.onSliderBeforeChange(e, t, i, n)
                        }, this)), a.on("beforeChange", _.bind(function(e, t, i, n) {
                            this.onSliderBeforeChange(e, t, i, n)
                        }, this))
                    },
                    onSliderBeforeChange: function(t, i, n, s) {
                        var o = e(t.target).find('.slick-slide[data-slick-index="' + n + '"] ' + r);
                        o.length && YT.get(o.children("iframe").attr("id")).pauseVideo()
                    },
                    initializeYoutubeIframeApi: function() {
                        var e = document.createElement("script"),
                            t = document.getElementsByTagName("script")[0];
                        e.src = "https://www.youtube.com/iframe_api", t.parentNode.insertBefore(e, t)
                    }
                }), l
            }), i("assets/js/instagram-widget", ["jquery", "underscore"], function(e, t) {
                "use strict";
                var i = {
                        ctaClass: ".js-pw-instagram-cta",
                        photoClass: ".pw-instagram__photo",
                        eventNS: "instagramWidget"
                    },
                    n = {
                        item: t.template('<a class="pw-instagram__item" href="<%= link %>" target="_blank"><img class="pw-instagram__photo" src="<%= thumb %>" srcset="<%= thumb %> 150w, <%= image %> 320w" alt="<%= title %>" sizes="(min-width: 768px) 12.5vw, 50vw"></a>'),
                        error: t.template('<p class="pw-instagram__error"><%= errorCode %> - <%= errorMessage %></p>')
                    },
                    s = function(e) {
                        return this.$widget = e, this.accessToken = this.$widget.data("access-token"), this.hasCTA = this.$widget.data("has-cta"), this.numImages = this.$widget.data("has-cta") ? this.$widget.data("num-images") - 1 : this.$widget.data("num-images"), this.ctaPosition = 0, this.getDataFromInstagramAPI(), this
                    };
                return t.extend(s.prototype, {
                    getDataFromInstagramAPI: function() {
                        return e.ajax({
                            method: "GET",
                            url: ShakaVars.ajax_url,
                            data: {
                                action: "pt_shaka_get_instagram_data",
                                security: ShakaVars.ajax_nonce,
                                access_token: this.accessToken
                            },
                            context: this,
                            beforeSend: function() {
                                this.$widget.append('<p class="pw-instagram__loader"><i class="fa fa-spinner fa-spin fa-3x fa-fw"></i><span class="screen-reader-text">Loading...</span></p>')
                            },
                            complete: function() {
                                this.$widget.find(".pw-instagram__loader").remove()
                            }
                        }).done(function(e) {
                            this.outputData(JSON.parse(e))
                        }), this
                    },
                    outputData: function(s) {
                        200 === s.meta.code ? (this.numImages = Math.min(this.numImages, s.data.length), this.hasCTA && (this.ctaPosition = this.getCtaPosition(this.numImages)), e.each(s.data, t.bind(function(e, t) {
                            if (this.numImages === e) return !1;
                            this.ctaPosition === e && this.repositionCta();
                            var i = this.getCaption(t);
                            this.$widget.append(n.item({
                                link: t.link,
                                image: t.images.low_resolution.url,
                                thumb: t.images.thumbnail.url,
                                title: i
                            }))
                        }, this)), this.hasCTA && t.defer(t.bind(function() {
                            var e = this.$widget.find(i.ctaClass),
                                t = e.siblings().first().find(i.photoClass);
                            e.append(t.clone())
                        }, this))) : this.$widget.append(n.error({
                            errorCode: s.meta.code,
                            errorMessage: s.meta.error_message
                        }))
                    },
                    getCaption: function(e) {
                        return e.caption ? e.caption.text : "Instagram image"
                    },
                    getCtaPosition: function(e) {
                        var t = 0 === e % 2 ? 1 : 0;
                        return Math.ceil(e / 2 + t)
                    },
                    repositionCta: function() {
                        this.$widget.append(this.$widget.find(i.ctaClass).detach().css("display", "block"))
                    }
                }), s
            }), i("assets/js/weather-widget", ["jquery", "underscore"], function(e, t) {
                "use strict";
                var i = {
                        currentDayClass: ".js-weather-current",
                        forecastClass: ".js-weather-forecast"
                    },
                    n = {
                        currentWeather: t.template('<img class="weather__current-icon" src="<%= pathToTheme %>/assets/images/weather-widget/color-icons/<%= icon %>.svg" alt="<%= icon %>"> <div class="weather__current-temperature-container"><p class="weather__current-temperature"><%= temperature %><sup><%= temperatureUnit %></sup></p> <p class="weather__current-description"><%= weatherInWords %></p></div> <div class="weather__current-wind"><img src="<%= pathToTheme %>/assets/images/weather-widget/color-icons/compass.svg" style="-webkit-transform: rotate( <%= windDirection %>deg ); -ms-transform: rotate( <%= windDirection %>deg ); transform: rotate( <%= windDirection %>deg );"><div class="weather__current-wind-speed-container"><span class="weather__current-wind-speed"><%= wind %></span><span class="weather__current-wind-speed-unit"><%= windUnit %></span></div></div>'),
                        weatherRow: t.template('<div class="weather__forecast"><span class="weather__forecast-day"><%= dayOfTheWeek %></span> <div class="weather__forecast-temperature"><img class="weather__forecast-icon" src="<%= pathToTheme %>/assets/images/weather-widget/gray-icons/<%= icon %>.svg" alt="<%= icon %>"> <span><%= temperature %><%= temperatureUnit %></span></div> <div class="weather__forecast-wind"><img src="<%= pathToTheme %>/assets/images/weather-widget/gray-icons/compass.svg" style="-webkit-transform: rotate( <%= windDirection %>deg ); -ms-transform: rotate( <%= windDirection %>deg ); transform: rotate( <%= windDirection %>deg );"><span><%= wind %> <%= windUnit %></span></div></div>'),
                        error: t.template('<div class="weather__error"><%= error %></div>')
                    },
                    s = function(e) {
                        return this.$widget = e, this.latitude = this.$widget.data("latitude"), this.longitude = this.$widget.data("longitude"), this.temperatureUnit = this.$widget.data("temperature-unit"), this.windUnit = this.$widget.data("wind-unit"), this.forecastDays = this.$widget.data("forecast"), this.currentWeatherEnabled = this.$widget.data("current-weather") || "", this.getDataFromWeatherAPI(), this
                    };
                return t.extend(s.prototype, {
                    getDataFromWeatherAPI: function() {
                        return e.ajax({
                            method: "GET",
                            url: ShakaVars.ajax_url,
                            data: {
                                action: "pt_shaka_get_weather_data",
                                security: ShakaVars.ajax_nonce,
                                latitude: this.latitude,
                                longitude: this.longitude,
                                current_weather_enabled: this.currentWeatherEnabled
                            },
                            context: this,
                            beforeSend: function() {
                                this.$widget.append('<p class="weather__loader"><i class="fa fa-spinner fa-spin fa-3x fa-fw"></i><span class="screen-reader-text">Loading...</span></p>')
                            },
                            complete: function() {
                                this.$widget.find(".weather__loader").remove()
                            }
                        }).done(function(e) {
                            e.success ? this.outputData(e) : this.outputError(e.data)
                        }), this
                    },
                    outputData: function(e) {
                        var i = t.first(e.data),
                            n = t.chain(e.data).rest().first(this.forecastDays).value();
                        this.render(i, !0), t.each(n, function(e) {
                            this.render(e)
                        }, this)
                    },
                    render: function(e, s) {
                        var o = {
                            icon: e.icon,
                            temperature: this.getCorrectTemperatureValue(e.temperature_max),
                            temperatureUnit: this.getCorrectTemperatureUnit(e.temperature_max),
                            wind: this.getCorrectWindValue(e.wind_speed),
                            windUnit: this.getCorrectWindUnit(e.wind_speed),
                            windDirection: e.wind_direction,
                            pathToTheme: ShakaVars.pathToTheme
                        };
                        s ? this.$widget.find(i.currentDayClass).append(n.currentWeather(t.extend(o, {
                            weatherInWords: e.weather_in_words
                        }))) : this.$widget.find(i.forecastClass).append(n.weatherRow(t.extend(o, {
                            dayOfTheWeek: e.day_of_the_week_short
                        })))
                    },
                    outputError: function(e) {
                        this.$widget.find(i.forecastClass).after(n.error({
                            error: e
                        }))
                    },
                    getCorrectTemperatureValue: function(e) {
                        return "fahrenheit" === this.temperatureUnit ? e.fahrenheit.value : e.celsius.value
                    },
                    getCorrectTemperatureUnit: function(e) {
                        return "fahrenheit" === this.temperatureUnit ? e.fahrenheit.unit : e.celsius.unit
                    },
                    getCorrectWindValue: function(e) {
                        return "kilometers_per_hour" === this.windUnit ? e.kilometers_per_hour.value : "knots" === this.windUnit ? e.knots.value : "miles_per_hour" === this.windUnit ? e.miles_per_hour.value : e.meters_per_second.value
                    },
                    getCorrectWindUnit: function(e) {
                        return "kilometers_per_hour" === this.windUnit ? e.kilometers_per_hour.unit : "knots" === this.windUnit ? e.knots.unit : "miles_per_hour" === this.windUnit ? e.miles_per_hour.unit : e.meters_per_second.unit
                    }
                }), s
            }), i("vendor/proteusthemes/sticky-menu/assets/js/sticky-menu", ["jquery", "underscore"], function(e, t) {
                "use strict";
                var i = {
                        bodyStickyClass: "js-sticky-navigation",
                        bodyStickyVisibilityClass: "js-sticky-all",
                        stickyOffsetClass: "js-sticky-offset",
                        stickyContainerClass: "js-pt-sticky-menu",
                        stickyMenuActiveClass: "is-shown",
                        scrollDownIgnore: 7
                    },
                    n = function() {
                        this.windowTop = 0, this.stickyOffset = 0, this.initializeStickyMenu(), this.registerResizeEventListener(), this.registerClickEventListeners()
                    };
                t.extend(n.prototype, {
                    initializeStickyMenu: function() {
                        this.windowTop = e(window).scrollTop(), this.stickyOffset = this.getStickyMenuOffset(), this.registerScrollEventListner(), e(window).trigger("scroll.ptStickyMenu")
                    },
                    registerScrollEventListner: function() {
                        var n = !1,
                            s = !1;
                        e(window).on("scroll.ptStickyMenu", t.bind(t.throttle(function() {
                            if (s = (this.isScrollDirectionUp() || this.isAllDirectionEnabled()) && this.isWindowTopBellowOffset(), n !== s) {
                                n = s, e("." + i.stickyContainerClass).toggleClass(i.stickyMenuActiveClass, n);
                                var t = n ? "ptStickyMenuShow" : "ptStickyMenuHide";
                                e("." + i.stickyContainerClass + " .js-dropdown").trigger(t)
                            }
                        }, 20), this))
                    },
                    registerClickEventListeners: function() {
                        e(document).on("click", ".js-pt-sticky-menu-back-to-top-open-menu", t.bind(function() {
                            return e("html, body").animate({
                                scrollTop: e(".js-sticky-mobile-option").offset().top - this.getAdminBarHeight()
                            }, 500, "swing", function() {
                                e(".js-sticky-mobile-option").click()
                            }), !1
                        }, this))
                    },
                    setStickyOffsetClass: function() {
                        e(".js-sticky-desktop-option").toggleClass(i.stickyOffsetClass, Modernizr.mq("(min-width: 992px)")), e(".js-sticky-mobile-option").toggleClass(i.stickyOffsetClass, Modernizr.mq("(max-width: 991px)"))
                    },
                    getStickyMenuOffset: function() {
                        return this.setStickyOffsetClass(), 0 < e("." + i.stickyOffsetClass).length ? e("." + i.stickyOffsetClass).offset().top : 0
                    },
                    registerResizeEventListener: function() {
                        e(window).on("resize.ptStickyMenu", t.bind(t.debounce(function() {
                            this.stickyOffset = this.getStickyMenuOffset()
                        }, 100), this))
                    },
                    getAdminBarHeight: function() {
                        return e("body").hasClass("admin-bar") && "fixed" === e("#wpadminbar").css("position") ? e("#wpadminbar").height() : 0
                    },
                    getScrollDirection: function() {
                        var t = e(window).scrollTop(),
                            i = t - this.windowTop;
                        return this.windowTop = t, i
                    },
                    isAllDirectionEnabled: function() {
                        return e("body").hasClass(i.bodyStickyVisibilityClass)
                    },
                    isScrollDirectionUp: function() {
                        var t = this.getScrollDirection();
                        return 0 > t || t < i.scrollDownIgnore && t >= 0 && e("." + i.stickyContainerClass).hasClass(i.stickyMenuActiveClass) ? !0 : !1
                    },
                    isWindowTopBellowOffset: function() {
                        return e(window).scrollTop() > this.stickyOffset - this.getAdminBarHeight()
                    }
                }), e("body").hasClass(i.bodyStickyClass) && new n
            }), i("assets/js/TouchDropdown", ["jquery"], function(e) {
                "use strict";
                Modernizr && Modernizr.touchevents && Modernizr.mq("(min-width: 992px)") && (e("ul.js-dropdown").find(".sub-menu").addClass("js-dropdown"), e("ul.js-dropdown").each(function(t, i) {
                    e(i).children(".menu-item-has-children").on("click.td", "a", function(t) {
                        t.preventDefault(), e(i).children(".is-hover").removeClass("is-hover"), e(t.delegateTarget).addClass("is-hover"), e(t.delegateTarget).off("click.td")
                    })
                }))
            }), i("assets/js/funky-item/module/utils", ["stampit", "underscore"], function(e, t) {
                return e().methods({
                    randomizeNumber: function(e, i) {
                        return i = t.isNumber(i) ? i : 8, e + Math.round((Math.random() - .5) * i)
                    },
                    isBetween: function(e, t, i) {
                        return e >= t && i >= e
                    },
                    inlineCssFromObject: function(e) {
                        var i = t.map(e, function(e, t) {
                            return /^\-?\d+$/.test(e) && (e += "px"), t + ": " + e
                        });
                        return i.join("; ")
                    }
                })
            }), i("assets/js/funky-item/module/canvas", ["underscore", "stampit", "jquery", "assets/js/funky-item/module/utils"], function(e, t, i, n) {
                return t({
                    props: {
                        canvasEl: null,
                        canvasContext: null,
                        fillColor: "#000000",
                        canvasHtmlClass: "funky-item"
                    },
                    methods: {
                        createCanvas: function(e, t) {
                            var n = document.createElement("canvas");
                            return n.width = e, n.height = t, this.canvasHtmlClass && i(n).addClass(this.canvasHtmlClass), this.canvasEl = n, this
                        },
                        setContext: function(e) {
                            return e = e || this.canvasEl, this.canvasContext = e.getContext("2d"), this
                        },
                        removeCanvas: function() {
                            return this.canvasEl && this.canvasEl.remove(), this
                        },
                        cleanCanvas: function(e) {
                            return this.canvasContext.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height), this
                        },
                        hideCanvas: function() {
                            return i(this.canvasEl).hide(), this
                        },
                        showCanvas: function() {
                            return i(this.canvasEl).show(), this
                        },
                        setCanvasPosition: function() {
                            var t = e.pick(this.css, "position", "top", "left", "bottom");
                            return i(this.canvasEl).css(t), this
                        },
                        setFillStyle: function(e) {
                            return e = e || this.fillColor, this.fillColor = e, this.canvasContext && (this.canvasContext.fillStyle = e), this
                        }
                    }
                }).compose(n)
            }), i("assets/js/funky-item/module/drunk-box", ["underscore", "stampit", "assets/js/funky-item/module/utils"], function(e, t, i) {
                var n = t({
                    props: {
                        width: 0,
                        height: 0,
                        coordinates: [
                            [0, 0],
                            [0, 0],
                            [0, 0],
                            [0, 0]
                        ],
                        drunkness: 8
                    },
                    methods: {
                        applyFunctionToCoordinates: function(t) {
                            return this.coordinates = e.map(this.coordinates, function(i, n) {
                                return e.map(i, function(e, i) {
                                    return t.call(this, e, n, i)
                                }, this)
                            }, this), this
                        },
                        randomizeCoordinates: function() {
                            return this.setCoorinatesToBoudingCanvas().applyFunctionToCoordinates(function(e) {
                                return this.randomizeNumber(e, this.drunkness)
                            }), this
                        },
                        setCoorinatesToBoudingCanvas: function() {
                            return this.applyFunctionToCoordinates(function(e, t, i) {
                                return 0 === i ? -1 !== [0, 3].indexOf(t) ? this.drunkness / 2 : this.width - this.drunkness / 2 : 2 > t ? this.drunkness / 2 : this.height - this.drunkness / 2
                            }), this
                        }
                    }
                }).compose(i);
                return n
            }), i("assets/js/funky-item/module/box-renderer", ["underscore", "stampit", "assets/js/funky-item/module/drunk-box"], function(e, t, i) {
                return t({
                    init: function() {
                        this.currentBox = this.createNewRandomizedBox(), this.renderIfAllowed()
                    },
                    props: {
                        animationDuration: 100,
                        animationProgress: 0
                    },
                    methods: {
                        createNewBox: function(t) {
                            return t = t || {}, t = e.defaults(t, {
                                width: this.getCalculatedWidth(),
                                height: this.dimensions.height,
                                drunkness: this.drunkness
                            }), i(t)
                        },
                        createNewRandomizedBox: function(e) {
                            return this.createNewBox().randomizeCoordinates()
                        },
                        renderIfAllowed: function(e) {
                            var t = !0;
                            return this.shouldBeRenderedAtWindowWidth() || (t = !1), this.$el.is(":visible") || (t = !1), t && this.render(e), this
                        },
                        render: function(t) {
                            t = t || this.currentBox, this.cleanCanvas(), this.canvasContext.beginPath();
                            var i = e.clone(t.coordinates),
                                n = i.shift();
                            return this.canvasContext.moveTo(n[0], n[1]), e.forEach(i, function(e) {
                                this.canvasContext.lineTo(e[0], e[1])
                            }, this), this.canvasContext.fill(), this
                        },
                        rerender: function() {
                            return this.currentBox = this.createNewRandomizedBox(), this.renderIfAllowed(), this
                        },
                        animate: function() {
                            if (this.shouldBeRenderedAtWindowWidth()) {
                                var t = this.createNewRandomizedBox(),
                                    i = this.currentBox,
                                    n = null,
                                    s = 0,
                                    o = null,
                                    r = function(a) {
                                        o = o || a, s = (a - o) / this.animationDuration, n = this.mixTwoBoxes(i, t, s), this.render(n), 1 > s ? window.requestAnimationFrame(e.bind(r, this)) : this.currentBox = t
                                    };
                                return window.requestAnimationFrame(e.bind(r, this)), this
                            }
                        },
                        mixTwoBoxes: function(e, t, n) {
                            var s = i(e);
                            return s.applyFunctionToCoordinates(function(e, i, s) {
                                return e + n * (t.coordinates[i][s] - e)
                            }), s
                        }
                    }
                })
            }), i("assets/js/funky-item/facade/funky-underline", ["jquery", "stampit", "assets/js/funky-item/module/canvas", "assets/js/funky-item/module/box-renderer"], function(e, t, i, n) {
                var s = t({
                    init: function() {
                        return this.$el = this.$el || e(this.el), this.attachEventListeners(), this.shouldBeRenderedAtWindowWidth() && this.setupCanvas(), this
                    },
                    props: {
                        css: {
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0
                        },
                        dimensions: {
                            width: void 0,
                            height: 10
                        },
                        responsive: [{
                            min: 0,
                            max: 1 / 0
                        }],
                        eventNS: "funkyItem",
                        rerenderOnHover: !1
                    },
                    methods: {
                        getCalculatedWidth: function() {
                            return this.getContainerWidth() - (this.css.left + this.css.right)
                        },
                        getContainerWidth: function() {
                            return this.$el.width()
                        },
                        setupCanvas: function() {
                            return this.createCanvas(this.getCalculatedWidth(), this.dimensions.height).putCanvasInsideEl().setCanvasPosition().setContext().setFillStyle(), this
                        },
                        putCanvasInsideEl: function() {
                            return this.$el.append(this.canvasEl), this
                        },
                        shouldBeRenderedAtWindowWidth: function(t) {
                            return t = t || e(window).width(), void 0 !== _.find(this.responsive, function(e) {
                                return this.isBetween(t, e.min, e.max)
                            }, this)
                        },
                        attachEventListeners: function() {
                            return this.rerenderOnHover && this.$el.on("mouseenter." + this.eventNS + " focusin." + this.eventNS, _.bind(this.rerender, this)), e(window).on("resize." + this.eventNS, _(this.resizeHandler).debounce(500).bind(this)), this
                        },
                        resizeHandler: function() {
                            this.removeCanvas(), this.shouldBeRenderedAtWindowWidth() && this.setupCanvas().render()
                        }
                    }
                }).compose(i, n);
                return s
            }), i("assets/js/funky-item/facade/funky-box", ["jquery", "stampit", "assets/js/funky-item/module/canvas", "assets/js/funky-item/module/box-renderer"], function(e, t, i, n) {
                var s = t({
                    init: function() {
                        this.$el = this.$el || e(this.el), _.each(["top", "bottom", "left", "right"], function(e) {
                            this.css[e] = -this.drunkness
                        }, this), this.attachEventListeners(), this.setHeight();
                        var t = this.$el.text(),
                            i = e('<div class="js-' + this.eventNS + '-text-holder" style="position: absolute; z-index: 2; top: 0; left: 0; right: 0; bottom: 0;"></div>');
                        return i.css({
                            paddingLeft: this.$el.css("padding-left"),
                            paddingRight: this.$el.css("padding-right"),
                            paddingTop: this.$el.css("padding-top")
                        }), i.text(t), this.$el.append(i), this.shouldBeRenderedAtWindowWidth() && this.setupCanvas(), this
                    },
                    props: {
                        css: {
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0
                        },
                        responsive: [{
                            min: 0,
                            max: 1 / 0
                        }],
                        dimensions: {
                            height: 30
                        },
                        eventNS: "funkyItem"
                    },
                    methods: {
                        getContainerWidth: function() {
                            return this.$el.outerWidth()
                        },
                        getCalculatedWidth: function() {
                            return this.getContainerWidth() - (this.css.left + this.css.right)
                        },
                        getCalculatedHeight: function() {
                            return this.$el.outerHeight() - (this.css.top + this.css.bottom)
                        },
                        setHeight: function() {
                            return this.dimensions.height = this.getCalculatedHeight(), this
                        },
                        setupCanvas: function() {
                            return this.createCanvas(this.getCalculatedWidth(), this.getCalculatedHeight()).putCanvasInsideEl().setCanvasPosition().setContext().setFillStyle(), this
                        },
                        putCanvasInsideEl: function() {
                            return this.$el.append(this.canvasEl), this
                        },
                        shouldBeRenderedAtWindowWidth: function(t) {
                            return t = t || e(window).width(), void 0 !== _.find(this.responsive, function(e) {
                                return this.isBetween(t, e.min, e.max)
                            }, this)
                        },
                        attachEventListeners: function() {
                            return e(window).on("resize." + this.eventNS, _(this.resizeHandler).debounce(500).bind(this)), this
                        },
                        resizeHandler: function() {
                            this.removeCanvas(), this.shouldBeRenderedAtWindowWidth() && this.setupCanvas().render()
                        }
                    }
                }).compose(i, n);
                return s
            }), i("assets/js/funky-item/funky-item", ["stampit", "assets/js/funky-item/facade/funky-underline", "assets/js/funky-item/facade/funky-box"], function(e, t, i) {
                return function(e) {
                    switch (e.type) {
                        case "underline":
                            return t(e);
                        case "box":
                            return i(e)
                    }
                }
            }), i("assets/js/funky-item/funky-menu", ["jquery", "underscore", "stampit", "assets/js/funky-item/funky-item"], function(e, t, i, n) {
                return i({
                    init: function() {
                        var e = [];
                        return this.createFunkyItem = function(t) {
                            var i = n(t);
                            return e.push(i), i
                        }, this.getFunkyItemOfHtmlEl = function(i) {
                            return t.find(e, function(e) {
                                return e.$el.is(i)
                            })
                        }, this.addAllFunkyUnderlines().addEventListeners(), this
                    },
                    props: {
                        $menuItems: null,
                        regularFillColor: "",
                        activeItemSel: "",
                        activeFillColor: "",
                        funkyItemDefaults: {
                            type: "underline",
                            drunkness: 5,
                            canvasHtmlClass: "funky-underline",
                            css: {
                                bottom: 10,
                                left: 10,
                                right: 10
                            },
                            responsive: [{
                                min: 992,
                                max: 1 / 0
                            }],
                            dimensions: {
                                height: 15
                            }
                        },
                        optsModifier: null,
                        onclick: null
                    },
                    methods: {
                        addAllFunkyUnderlines: function() {
                            return this.$menuItems.each(t.bind(function(t, i) {
                                var n = e(i);
                                n.is(this.activeItemSel) ? this.addActiveUnderline(n) : this.addRegularUnderlines(n)
                            }, this)), this
                        },
                        addRegularUnderlines: function(e) {
                            var t = this.regularUnderlinesFunkyItemOpts(e);
                            return t = this.modifyOpts(t, e, !1), this.createFunkyItem(t), this
                        },
                        addActiveUnderline: function(e) {
                            var t = this.activeUnderlinesFunkyItemOpts(e);
                            return t = this.modifyOpts(t, e, !0), this.createFunkyItem(t), this
                        },
                        activeUnderlinesFunkyItemOpts: function(e) {
                            return t.extend({}, this.regularUnderlinesFunkyItemOpts(e), {
                                fillColor: this.activeFillColor,
                                rerenderOnHover: !1
                            })
                        },
                        regularUnderlinesFunkyItemOpts: function(e) {
                            return t.extend({}, this.funkyItemDefaults, {
                                fillColor: this.regularFillColor,
                                rerenderOnHover: !0,
                                el: e
                            })
                        },
                        modifyOpts: function(i, n, s) {
                            return t.isFunction(this.optsModifier) && (i = this.optsModifier(e.extend(!0, {}, i), n, s)), i
                        },
                        addEventListeners: function() {
                            return t.isFunction(this.onclick) && this.$menuItems.on("click", "a", t.bind(function(e) {
                                this.onclick(e)
                            }, this)), this
                        },
                        swapRenderColors: function(e, t, i) {
                            var n = e.fillColor,
                                s = t.fillColor;
                            return e.setFillStyle(s).renderIfAllowed(), t.setFillStyle(n).renderIfAllowed(), this
                        }
                    }
                })
            }), i("assets/js/funky-item/cutting-mustard", [], function() {
                return Modernizr.requestanimationframe && Modernizr.canvas
            }), i("assets/js/FunkyMenus", ["jquery", "assets/js/funky-item/funky-menu", "assets/js/funky-item/cutting-mustard"], function(e, t, i) {
                i && (t({
                    $menuItems: e(".js-main-nav > .menu-item"),
                    activeItemSel: ".current-menu-item",
                    activeFillColor: e(".js-main-nav > .current-menu-item > a").css("color"),
                    regularFillColor: "rgba(0,0,0,0.15)",
                    funkyItemDefaults: {
                        css: {
                            bottom: 38
                        }
                    },
                    optsModifier: function(e, t) {
                        return t.is(":last-child") && (e.css.right = -3), e
                    }
                }), e(".js-wpg-nav-holder").each(function() {
                    t({
                        $menuItems: e(this).find(".portfolio-grid__nav-item"),
                        activeItemSel: ".is-active",
                        activeFillColor: "#ffffff",
                        regularFillColor: "rgba(255,255,255,0.5)",
                        funkyItemDefaults: {
                            css: {
                                bottom: 0
                            }
                        },
                        optsModifier: function(e, t) {
                            return t.is(":last-child") && (e.css.right = 0), e
                        },
                        onclick: function(t) {
                            var i = this.getFunkyItemOfHtmlEl(this.$menuItems.filter(this.activeItemSel)),
                                n = this.getFunkyItemOfHtmlEl(e(t.currentTarget).parent());
                            this.swapRenderColors(i, n)
                        }
                    })
                }))
            }), i("assets/js/FunkyBoxes", ["jquery", "assets/js/funky-item/funky-item", "assets/js/funky-item/cutting-mustard"], function(e, t, i) {
                i && ([".person-profile__label", ".contact-profile__label", ".special-offer__label", ".latest-news--block .latest-news__date", ".latest-news--featured .latest-news__date", ".featured-product__price", ".masonry .hentry__date"].forEach(function(i) {
                    e(i).each(function() {
                        t({
                            type: "box",
                            $el: e(this),
                            drunkness: 10,
                            fillColor: e(this).css("backgroundColor")
                        })
                    })
                }), e(".js-funky-box").each(function() {
                    t({
                        type: "box",
                        $el: e(this),
                        drunkness: 8,
                        fillColor: e(this).css("backgroundColor")
                    })
                }), e(".portfolio-grid__card-price").each(function() {
                    ! function(e) {
                        var i = t({
                                type: "box",
                                $el: e,
                                drunkness: 10,
                                fillColor: e.css("backgroundColor")
                            }),
                            n = i.$el.parents(".carousel"),
                            s = i.$el.parents(".portfolio-grid"),
                            o = function(e) {
                                e.removeCanvas().setHeight().setupCanvas().rerender()
                            };
                        n.on("slid.bs.carousel", function() {
                            o(i)
                        }), s.on("wpge_on_elements_switch", function() {
                            setTimeout(function() {
                                o(i)
                            }, 200)
                        })
                    }(e(this))
                }), e(".sidebar .menu > .current-menu-item > a, .sidebar .product-categories .current-cat > a").each(function() {
                    t({
                        type: "box",
                        $el: e(this),
                        drunkness: 7,
                        fillColor: e(this).css("backgroundColor")
                    })
                }))
            }),
            function(e, t) {
                if ("function" == typeof i && i.amd) i("util", ["exports", "module"], t);
                else if ("undefined" != typeof exports && "undefined" != typeof module) t(exports, module);
                else {
                    var n = {
                        exports: {}
                    };
                    t(n.exports, n), e.util = n.exports
                }
            }(this, function(e, t) {
                "use strict";
                var i = function(e) {
                    function t(e) {
                        return {}.toString.call(e).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
                    }

                    function i(e) {
                        return (e[0] || e).nodeType
                    }

                    function n() {
                        return {
                            bindType: a.end,
                            delegateType: a.end,
                            handle: function(t) {
                                return e(t.target).is(this) ? t.handleObj.handler.apply(this, arguments) : void 0
                            }
                        }
                    }

                    function s() {
                        if (window.QUnit) return !1;
                        var e = document.createElement("bootstrap");
                        for (var t in l)
                            if (void 0 !== e.style[t]) return {
                                end: l[t]
                            };
                        return !1
                    }

                    function o(t) {
                        var i = this,
                            n = !1;
                        return e(this).one(d.TRANSITION_END, function() {
                            n = !0
                        }), setTimeout(function() {
                            n || d.triggerTransitionEnd(i)
                        }, t), this
                    }

                    function r() {
                        a = s(), e.fn.emulateTransitionEnd = o, d.supportsTransitionEnd() && (e.event.special[d.TRANSITION_END] = n())
                    }
                    var a = !1,
                        l = {
                            WebkitTransition: "webkitTransitionEnd",
                            MozTransition: "transitionend",
                            OTransition: "oTransitionEnd otransitionend",
                            transition: "transitionend"
                        },
                        d = {
                            TRANSITION_END: "bsTransitionEnd",
                            getUID: function(e) {
                                do e += ~~(1e6 * Math.random()); while (document.getElementById(e));
                                return e
                            },
                            getSelectorFromElement: function(e) {
                                var t = e.getAttribute("data-target");
                                return t || (t = e.getAttribute("href") || "", t = /^#[a-z]/i.test(t) ? t : null), t
                            },
                            reflow: function(e) {
                                new Function("bs", "return bs")(e.offsetHeight)
                            },
                            triggerTransitionEnd: function(t) {
                                e(t).trigger(a.end)
                            },
                            supportsTransitionEnd: function() {
                                return Boolean(a)
                            },
                            typeCheckConfig: function(e, n, s) {
                                for (var o in s)
                                    if (s.hasOwnProperty(o)) {
                                        var r = s[o],
                                            a = n[o],
                                            l = void 0;
                                        if (l = a && i(a) ? "element" : t(a), !new RegExp(r).test(l)) throw new Error(e.toUpperCase() + ": " + ('Option "' + o + '" provided type "' + l + '" ') + ('but expected type "' + r + '".'))
                                    }
                            }
                        };
                    return r(), d
                }(jQuery);
                t.exports = i
            }),
            function(e, n) {
                if ("function" == typeof i && i.amd) i("carousel", ["exports", "module", "./util"], n);
                else if ("undefined" != typeof exports && "undefined" != typeof module) n(exports, module, t("./util"));
                else {
                    var s = {
                        exports: {}
                    };
                    n(s.exports, s, e.Util),
                        e.carousel = s.exports
                }
            }(this, function(e, t, i) {
                "use strict";

                function n(e) {
                    return e && e.__esModule ? e : {
                        "default": e
                    }
                }

                function s(e, t) {
                    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")
                }
                var o = function() {
                        function e(e, t) {
                            for (var i = 0; i < t.length; i++) {
                                var n = t[i];
                                n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(e, n.key, n)
                            }
                        }
                        return function(t, i, n) {
                            return i && e(t.prototype, i), n && e(t, n), t
                        }
                    }(),
                    r = n(i),
                    a = function(e) {
                        var t = "carousel",
                            i = "4.0.0-alpha",
                            n = "bs.carousel",
                            a = "." + n,
                            l = ".data-api",
                            d = e.fn[t],
                            c = 600,
                            u = {
                                interval: 5e3,
                                keyboard: !0,
                                slide: !1,
                                pause: "hover",
                                wrap: !0
                            },
                            p = {
                                interval: "(number|boolean)",
                                keyboard: "boolean",
                                slide: "(boolean|string)",
                                pause: "(string|boolean)",
                                wrap: "boolean"
                            },
                            h = {
                                NEXT: "next",
                                PREVIOUS: "prev"
                            },
                            f = {
                                SLIDE: "slide" + a,
                                SLID: "slid" + a,
                                KEYDOWN: "keydown" + a,
                                MOUSEENTER: "mouseenter" + a,
                                MOUSELEAVE: "mouseleave" + a,
                                LOAD_DATA_API: "load" + a + l,
                                CLICK_DATA_API: "click" + a + l
                            },
                            m = {
                                CAROUSEL: "carousel",
                                ACTIVE: "active",
                                SLIDE: "slide",
                                RIGHT: "right",
                                LEFT: "left",
                                ITEM: "carousel-item"
                            },
                            v = {
                                ACTIVE: ".active",
                                ACTIVE_ITEM: ".active.carousel-item",
                                ITEM: ".carousel-item",
                                NEXT_PREV: ".next, .prev",
                                INDICATORS: ".carousel-indicators",
                                DATA_SLIDE: "[data-slide], [data-slide-to]",
                                DATA_RIDE: '[data-ride="carousel"]'
                            },
                            g = function() {
                                function l(t, i) {
                                    s(this, l), this._items = null, this._interval = null, this._activeElement = null, this._isPaused = !1, this._isSliding = !1, this._config = this._getConfig(i), this._element = e(t)[0], this._indicatorsElement = e(this._element).find(v.INDICATORS)[0], this._addEventListeners()
                                }
                                return o(l, [{
                                    key: "next",
                                    value: function() {
                                        this._isSliding || this._slide(h.NEXT)
                                    }
                                }, {
                                    key: "nextWhenVisible",
                                    value: function() {
                                        document.hidden || this.next()
                                    }
                                }, {
                                    key: "prev",
                                    value: function() {
                                        this._isSliding || this._slide(h.PREVIOUS)
                                    }
                                }, {
                                    key: "pause",
                                    value: function(t) {
                                        t || (this._isPaused = !0), e(this._element).find(v.NEXT_PREV)[0] && r["default"].supportsTransitionEnd() && (r["default"].triggerTransitionEnd(this._element), this.cycle(!0)), clearInterval(this._interval), this._interval = null
                                    }
                                }, {
                                    key: "cycle",
                                    value: function(t) {
                                        t || (this._isPaused = !1), this._interval && (clearInterval(this._interval), this._interval = null), this._config.interval && !this._isPaused && (this._interval = setInterval(e.proxy(document.visibilityState ? this.nextWhenVisible : this.next, this), this._config.interval))
                                    }
                                }, {
                                    key: "to",
                                    value: function(t) {
                                        var i = this;
                                        this._activeElement = e(this._element).find(v.ACTIVE_ITEM)[0];
                                        var n = this._getItemIndex(this._activeElement);
                                        if (!(t > this._items.length - 1 || 0 > t)) {
                                            if (this._isSliding) return void e(this._element).one(f.SLID, function() {
                                                return i.to(t)
                                            });
                                            if (n === t) return this.pause(), void this.cycle();
                                            var s = t > n ? h.NEXT : h.PREVIOUS;
                                            this._slide(s, this._items[t])
                                        }
                                    }
                                }, {
                                    key: "dispose",
                                    value: function() {
                                        e(this._element).off(a), e.removeData(this._element, n), this._items = null, this._config = null, this._element = null, this._interval = null, this._isPaused = null, this._isSliding = null, this._activeElement = null, this._indicatorsElement = null
                                    }
                                }, {
                                    key: "_getConfig",
                                    value: function(i) {
                                        return i = e.extend({}, u, i), r["default"].typeCheckConfig(t, i, p), i
                                    }
                                }, {
                                    key: "_addEventListeners",
                                    value: function() {
                                        this._config.keyboard && e(this._element).on(f.KEYDOWN, e.proxy(this._keydown, this)), "hover" !== this._config.pause || "ontouchstart" in document.documentElement || e(this._element).on(f.MOUSEENTER, e.proxy(this.pause, this)).on(f.MOUSELEAVE, e.proxy(this.cycle, this))
                                    }
                                }, {
                                    key: "_keydown",
                                    value: function(e) {
                                        if (e.preventDefault(), !/input|textarea/i.test(e.target.tagName)) switch (e.which) {
                                            case 37:
                                                this.prev();
                                                break;
                                            case 39:
                                                this.next();
                                                break;
                                            default:
                                                return
                                        }
                                    }
                                }, {
                                    key: "_getItemIndex",
                                    value: function(t) {
                                        return this._items = e.makeArray(e(t).parent().find(v.ITEM)), this._items.indexOf(t)
                                    }
                                }, {
                                    key: "_getItemByDirection",
                                    value: function(e, t) {
                                        var i = e === h.NEXT,
                                            n = e === h.PREVIOUS,
                                            s = this._getItemIndex(t),
                                            o = this._items.length - 1,
                                            r = n && 0 === s || i && s === o;
                                        if (r && !this._config.wrap) return t;
                                        var a = e === h.PREVIOUS ? -1 : 1,
                                            l = (s + a) % this._items.length;
                                        return -1 === l ? this._items[this._items.length - 1] : this._items[l]
                                    }
                                }, {
                                    key: "_triggerSlideEvent",
                                    value: function(t, i) {
                                        var n = e.Event(f.SLIDE, {
                                            relatedTarget: t,
                                            direction: i
                                        });
                                        return e(this._element).trigger(n), n
                                    }
                                }, {
                                    key: "_setActiveIndicatorElement",
                                    value: function(t) {
                                        if (this._indicatorsElement) {
                                            e(this._indicatorsElement).find(v.ACTIVE).removeClass(m.ACTIVE);
                                            var i = this._indicatorsElement.children[this._getItemIndex(t)];
                                            i && e(i).addClass(m.ACTIVE)
                                        }
                                    }
                                }, {
                                    key: "_slide",
                                    value: function(t, i) {
                                        var n = this,
                                            s = e(this._element).find(v.ACTIVE_ITEM)[0],
                                            o = i || s && this._getItemByDirection(t, s),
                                            a = Boolean(this._interval),
                                            l = t === h.NEXT ? m.LEFT : m.RIGHT;
                                        if (o && e(o).hasClass(m.ACTIVE)) return void(this._isSliding = !1);
                                        var d = this._triggerSlideEvent(o, l);
                                        if (!d.isDefaultPrevented() && s && o) {
                                            this._isSliding = !0, a && this.pause(), this._setActiveIndicatorElement(o);
                                            var u = e.Event(f.SLID, {
                                                relatedTarget: o,
                                                direction: l
                                            });
                                            r["default"].supportsTransitionEnd() && e(this._element).hasClass(m.SLIDE) ? (e(o).addClass(t), r["default"].reflow(o), e(s).addClass(l), e(o).addClass(l), e(s).one(r["default"].TRANSITION_END, function() {
                                                e(o).removeClass(l).removeClass(t), e(o).addClass(m.ACTIVE), e(s).removeClass(m.ACTIVE).removeClass(t).removeClass(l), n._isSliding = !1, setTimeout(function() {
                                                    return e(n._element).trigger(u)
                                                }, 0)
                                            }).emulateTransitionEnd(c)) : (e(s).removeClass(m.ACTIVE), e(o).addClass(m.ACTIVE), this._isSliding = !1, e(this._element).trigger(u)), a && this.cycle()
                                        }
                                    }
                                }], [{
                                    key: "_jQueryInterface",
                                    value: function(t) {
                                        return this.each(function() {
                                            var i = e(this).data(n),
                                                s = e.extend({}, u, e(this).data());
                                            "object" == typeof t && e.extend(s, t);
                                            var o = "string" == typeof t ? t : s.slide;
                                            if (i || (i = new l(this, s), e(this).data(n, i)), "number" == typeof t) i.to(t);
                                            else if ("string" == typeof o) {
                                                if (void 0 === i[o]) throw new Error('No method named "' + o + '"');
                                                i[o]()
                                            } else s.interval && (i.pause(), i.cycle())
                                        })
                                    }
                                }, {
                                    key: "_dataApiClickHandler",
                                    value: function(t) {
                                        var i = r["default"].getSelectorFromElement(this);
                                        if (i) {
                                            var s = e(i)[0];
                                            if (s && e(s).hasClass(m.CAROUSEL)) {
                                                var o = e.extend({}, e(s).data(), e(this).data()),
                                                    a = this.getAttribute("data-slide-to");
                                                a && (o.interval = !1), l._jQueryInterface.call(e(s), o), a && e(s).data(n).to(a), t.preventDefault()
                                            }
                                        }
                                    }
                                }, {
                                    key: "VERSION",
                                    get: function() {
                                        return i
                                    }
                                }, {
                                    key: "Default",
                                    get: function() {
                                        return u
                                    }
                                }]), l
                            }();
                        return e(document).on(f.CLICK_DATA_API, v.DATA_SLIDE, g._dataApiClickHandler), e(window).on(f.LOAD_DATA_API, function() {
                            e(v.DATA_RIDE).each(function() {
                                var t = e(this);
                                g._jQueryInterface.call(t, t.data())
                            })
                        }), e.fn[t] = g._jQueryInterface, e.fn[t].Constructor = g, e.fn[t].noConflict = function() {
                            return e.fn[t] = d, g._jQueryInterface
                        }, g
                    }(jQuery);
                t.exports = a
            }),
            function(e, n) {
                if ("function" == typeof i && i.amd) i("collapse", ["exports", "module", "./util"], n);
                else if ("undefined" != typeof exports && "undefined" != typeof module) n(exports, module, t("./util"));
                else {
                    var s = {
                        exports: {}
                    };
                    n(s.exports, s, e.Util), e.collapse = s.exports
                }
            }(this, function(e, t, i) {
                "use strict";

                function n(e) {
                    return e && e.__esModule ? e : {
                        "default": e
                    }
                }

                function s(e, t) {
                    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")
                }
                var o = function() {
                        function e(e, t) {
                            for (var i = 0; i < t.length; i++) {
                                var n = t[i];
                                n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(e, n.key, n)
                            }
                        }
                        return function(t, i, n) {
                            return i && e(t.prototype, i), n && e(t, n), t
                        }
                    }(),
                    r = n(i),
                    a = function(e) {
                        var t = "collapse",
                            i = "4.0.0-alpha",
                            n = "bs.collapse",
                            a = "." + n,
                            l = ".data-api",
                            d = e.fn[t],
                            c = 600,
                            u = {
                                toggle: !0,
                                parent: ""
                            },
                            p = {
                                toggle: "boolean",
                                parent: "string"
                            },
                            h = {
                                SHOW: "show" + a,
                                SHOWN: "shown" + a,
                                HIDE: "hide" + a,
                                HIDDEN: "hidden" + a,
                                CLICK_DATA_API: "click" + a + l
                            },
                            f = {
                                IN: "in",
                                COLLAPSE: "collapse",
                                COLLAPSING: "collapsing",
                                COLLAPSED: "collapsed"
                            },
                            m = {
                                WIDTH: "width",
                                HEIGHT: "height"
                            },
                            v = {
                                ACTIVES: ".panel > .in, .panel > .collapsing",
                                DATA_TOGGLE: '[data-toggle="collapse"]'
                            },
                            g = function() {
                                function a(t, i) {
                                    s(this, a), this._isTransitioning = !1, this._element = t, this._config = this._getConfig(i), this._triggerArray = e.makeArray(e('[data-toggle="collapse"][href="#' + t.id + '"],' + ('[data-toggle="collapse"][data-target="#' + t.id + '"]'))), this._parent = this._config.parent ? this._getParent() : null, this._config.parent || this._addAriaAndCollapsedClass(this._element, this._triggerArray), this._config.toggle && this.toggle()
                                }
                                return o(a, [{
                                    key: "toggle",
                                    value: function() {
                                        e(this._element).hasClass(f.IN) ? this.hide() : this.show()
                                    }
                                }, {
                                    key: "show",
                                    value: function() {
                                        var t = this;
                                        if (!this._isTransitioning && !e(this._element).hasClass(f.IN)) {
                                            var i = void 0,
                                                s = void 0;
                                            if (this._parent && (i = e.makeArray(e(v.ACTIVES)), i.length || (i = null)), !(i && (s = e(i).data(n), s && s._isTransitioning))) {
                                                var o = e.Event(h.SHOW);
                                                if (e(this._element).trigger(o), !o.isDefaultPrevented()) {
                                                    i && (a._jQueryInterface.call(e(i), "hide"), s || e(i).data(n, null));
                                                    var l = this._getDimension();
                                                    e(this._element).removeClass(f.COLLAPSE).addClass(f.COLLAPSING), this._element.style[l] = 0, this._element.setAttribute("aria-expanded", !0), this._triggerArray.length && e(this._triggerArray).removeClass(f.COLLAPSED).attr("aria-expanded", !0), this.setTransitioning(!0);
                                                    var d = function() {
                                                        e(t._element).removeClass(f.COLLAPSING).addClass(f.COLLAPSE).addClass(f.IN), t._element.style[l] = "", t.setTransitioning(!1), e(t._element).trigger(h.SHOWN)
                                                    };
                                                    if (!r["default"].supportsTransitionEnd()) return void d();
                                                    var u = l[0].toUpperCase() + l.slice(1),
                                                        p = "scroll" + u;
                                                    e(this._element).one(r["default"].TRANSITION_END, d).emulateTransitionEnd(c), this._element.style[l] = this._element[p] + "px"
                                                }
                                            }
                                        }
                                    }
                                }, {
                                    key: "hide",
                                    value: function() {
                                        var t = this;
                                        if (!this._isTransitioning && e(this._element).hasClass(f.IN)) {
                                            var i = e.Event(h.HIDE);
                                            if (e(this._element).trigger(i), !i.isDefaultPrevented()) {
                                                var n = this._getDimension(),
                                                    s = n === m.WIDTH ? "offsetWidth" : "offsetHeight";
                                                this._element.style[n] = this._element[s] + "px", r["default"].reflow(this._element), e(this._element).addClass(f.COLLAPSING).removeClass(f.COLLAPSE).removeClass(f.IN), this._element.setAttribute("aria-expanded", !1), this._triggerArray.length && e(this._triggerArray).addClass(f.COLLAPSED).attr("aria-expanded", !1), this.setTransitioning(!0);
                                                var o = function() {
                                                    t.setTransitioning(!1), e(t._element).removeClass(f.COLLAPSING).addClass(f.COLLAPSE).trigger(h.HIDDEN)
                                                };
                                                return this._element.style[n] = 0, r["default"].supportsTransitionEnd() ? void e(this._element).one(r["default"].TRANSITION_END, o).emulateTransitionEnd(c) : void o()
                                            }
                                        }
                                    }
                                }, {
                                    key: "setTransitioning",
                                    value: function(e) {
                                        this._isTransitioning = e
                                    }
                                }, {
                                    key: "dispose",
                                    value: function() {
                                        e.removeData(this._element, n), this._config = null, this._parent = null, this._element = null, this._triggerArray = null, this._isTransitioning = null
                                    }
                                }, {
                                    key: "_getConfig",
                                    value: function(i) {
                                        return i = e.extend({}, u, i), i.toggle = Boolean(i.toggle), r["default"].typeCheckConfig(t, i, p), i
                                    }
                                }, {
                                    key: "_getDimension",
                                    value: function() {
                                        var t = e(this._element).hasClass(m.WIDTH);
                                        return t ? m.WIDTH : m.HEIGHT
                                    }
                                }, {
                                    key: "_getParent",
                                    value: function() {
                                        var t = this,
                                            i = e(this._config.parent)[0],
                                            n = '[data-toggle="collapse"][data-parent="' + this._config.parent + '"]';
                                        return e(i).find(n).each(function(e, i) {
                                            t._addAriaAndCollapsedClass(a._getTargetFromElement(i), [i])
                                        }), i
                                    }
                                }, {
                                    key: "_addAriaAndCollapsedClass",
                                    value: function(t, i) {
                                        if (t) {
                                            var n = e(t).hasClass(f.IN);
                                            t.setAttribute("aria-expanded", n), i.length && e(i).toggleClass(f.COLLAPSED, !n).attr("aria-expanded", n)
                                        }
                                    }
                                }], [{
                                    key: "_getTargetFromElement",
                                    value: function(t) {
                                        var i = r["default"].getSelectorFromElement(t);
                                        return i ? e(i)[0] : null
                                    }
                                }, {
                                    key: "_jQueryInterface",
                                    value: function(t) {
                                        return this.each(function() {
                                            var i = e(this),
                                                s = i.data(n),
                                                o = e.extend({}, u, i.data(), "object" == typeof t && t);
                                            if (!s && o.toggle && /show|hide/.test(t) && (o.toggle = !1), s || (s = new a(this, o), i.data(n, s)), "string" == typeof t) {
                                                if (void 0 === s[t]) throw new Error('No method named "' + t + '"');
                                                s[t]()
                                            }
                                        })
                                    }
                                }, {
                                    key: "VERSION",
                                    get: function() {
                                        return i
                                    }
                                }, {
                                    key: "Default",
                                    get: function() {
                                        return u
                                    }
                                }]), a
                            }();
                        return e(document).on(h.CLICK_DATA_API, v.DATA_TOGGLE, function(t) {
                            t.preventDefault();
                            var i = g._getTargetFromElement(this),
                                s = e(i).data(n),
                                o = s ? "toggle" : e(this).data();
                            g._jQueryInterface.call(e(i), o)
                        }), e.fn[t] = g._jQueryInterface, e.fn[t].Constructor = g, e.fn[t].noConflict = function() {
                            return e.fn[t] = d, g._jQueryInterface
                        }, g
                    }(jQuery);
                t.exports = a
            }),
            function(e, n) {
                if ("function" == typeof i && i.amd) i("tab", ["exports", "module", "./util"], n);
                else if ("undefined" != typeof exports && "undefined" != typeof module) n(exports, module, t("./util"));
                else {
                    var s = {
                        exports: {}
                    };
                    n(s.exports, s, e.Util), e.tab = s.exports
                }
            }(this, function(e, t, i) {
                "use strict";

                function n(e) {
                    return e && e.__esModule ? e : {
                        "default": e
                    }
                }

                function s(e, t) {
                    if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")
                }
                var o = function() {
                        function e(e, t) {
                            for (var i = 0; i < t.length; i++) {
                                var n = t[i];
                                n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0), Object.defineProperty(e, n.key, n)
                            }
                        }
                        return function(t, i, n) {
                            return i && e(t.prototype, i), n && e(t, n), t
                        }
                    }(),
                    r = n(i),
                    a = function(e) {
                        var t = "tab",
                            i = "4.0.0-alpha",
                            n = "bs.tab",
                            a = "." + n,
                            l = ".data-api",
                            d = e.fn[t],
                            c = 150,
                            u = {
                                HIDE: "hide" + a,
                                HIDDEN: "hidden" + a,
                                SHOW: "show" + a,
                                SHOWN: "shown" + a,
                                CLICK_DATA_API: "click" + a + l
                            },
                            p = {
                                DROPDOWN_MENU: "dropdown-menu",
                                ACTIVE: "active",
                                FADE: "fade",
                                IN: "in"
                            },
                            h = {
                                A: "a",
                                LI: "li",
                                DROPDOWN: ".dropdown",
                                UL: "ul:not(.dropdown-menu)",
                                FADE_CHILD: "> .nav-item .fade, > .fade",
                                ACTIVE: ".active",
                                ACTIVE_CHILD: "> .nav-item > .active, > .active",
                                DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"]',
                                DROPDOWN_TOGGLE: ".dropdown-toggle",
                                DROPDOWN_ACTIVE_CHILD: "> .dropdown-menu .active"
                            },
                            f = function() {
                                function t(e) {
                                    s(this, t), this._element = e
                                }
                                return o(t, [{
                                    key: "show",
                                    value: function() {
                                        var t = this;
                                        if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE || !e(this._element).hasClass(p.ACTIVE)) {
                                            var i = void 0,
                                                n = void 0,
                                                s = e(this._element).closest(h.UL)[0],
                                                o = r["default"].getSelectorFromElement(this._element);
                                            s && (n = e.makeArray(e(s).find(h.ACTIVE)), n = n[n.length - 1]);
                                            var a = e.Event(u.HIDE, {
                                                    relatedTarget: this._element
                                                }),
                                                l = e.Event(u.SHOW, {
                                                    relatedTarget: n
                                                });
                                            if (n && e(n).trigger(a), e(this._element).trigger(l), !l.isDefaultPrevented() && !a.isDefaultPrevented()) {
                                                o && (i = e(o)[0]), this._activate(this._element, s);
                                                var d = function() {
                                                    var i = e.Event(u.HIDDEN, {
                                                            relatedTarget: t._element
                                                        }),
                                                        s = e.Event(u.SHOWN, {
                                                            relatedTarget: n
                                                        });
                                                    e(n).trigger(i), e(t._element).trigger(s)
                                                };
                                                i ? this._activate(i, i.parentNode, d) : d()
                                            }
                                        }
                                    }
                                }, {
                                    key: "dispose",
                                    value: function() {
                                        e.removeClass(this._element, n), this._element = null
                                    }
                                }, {
                                    key: "_activate",
                                    value: function(t, i, n) {
                                        var s = e(i).find(h.ACTIVE_CHILD)[0],
                                            o = n && r["default"].supportsTransitionEnd() && (s && e(s).hasClass(p.FADE) || Boolean(e(i).find(h.FADE_CHILD)[0])),
                                            a = e.proxy(this._transitionComplete, this, t, s, o, n);
                                        s && o ? e(s).one(r["default"].TRANSITION_END, a).emulateTransitionEnd(c) : a(), s && e(s).removeClass(p.IN)
                                    }
                                }, {
                                    key: "_transitionComplete",
                                    value: function(t, i, n, s) {
                                        if (i) {
                                            e(i).removeClass(p.ACTIVE);
                                            var o = e(i).find(h.DROPDOWN_ACTIVE_CHILD)[0];
                                            o && e(o).removeClass(p.ACTIVE), i.setAttribute("aria-expanded", !1)
                                        }
                                        if (e(t).addClass(p.ACTIVE), t.setAttribute("aria-expanded", !0), n ? (r["default"].reflow(t), e(t).addClass(p.IN)) : e(t).removeClass(p.FADE), t.parentNode && e(t.parentNode).hasClass(p.DROPDOWN_MENU)) {
                                            var a = e(t).closest(h.DROPDOWN)[0];
                                            a && e(a).find(h.DROPDOWN_TOGGLE).addClass(p.ACTIVE), t.setAttribute("aria-expanded", !0)
                                        }
                                        s && s()
                                    }
                                }], [{
                                    key: "_jQueryInterface",
                                    value: function(i) {
                                        return this.each(function() {
                                            var s = e(this),
                                                o = s.data(n);
                                            if (o || (o = o = new t(this), s.data(n, o)), "string" == typeof i) {
                                                if (void 0 === o[i]) throw new Error('No method named "' + i + '"');
                                                o[i]()
                                            }
                                        })
                                    }
                                }, {
                                    key: "VERSION",
                                    get: function() {
                                        return i
                                    }
                                }]), t
                            }();
                        return e(document).on(u.CLICK_DATA_API, h.DATA_TOGGLE, function(t) {
                            t.preventDefault(), f._jQueryInterface.call(e(this), "show")
                        }), e.fn[t] = f._jQueryInterface, e.fn[t].Constructor = f, e.fn[t].noConflict = function() {
                            return e.fn[t] = d, f._jQueryInterface
                        }, f
                    }(jQuery);
                t.exports = a
            }), t.config({
                paths: {
                    jquery: "assets/js/fix.jquery",
                    underscore: "assets/js/fix.underscore",
                    util: "bower_components/bootstrap/dist/js/umd/util",
                    alert: "bower_components/bootstrap/dist/js/umd/alert",
                    button: "bower_components/bootstrap/dist/js/umd/button",
                    carousel: "bower_components/bootstrap/dist/js/umd/carousel",
                    collapse: "bower_components/bootstrap/dist/js/umd/collapse",
                    dropdown: "bower_components/bootstrap/dist/js/umd/dropdown",
                    modal: "bower_components/bootstrap/dist/js/umd/modal",
                    scrollspy: "bower_components/bootstrap/dist/js/umd/scrollspy",
                    tab: "bower_components/bootstrap/dist/js/umd/tab",
                    tooltip: "bower_components/bootstrap/dist/js/umd/tooltip",
                    popover: "bower_components/bootstrap/dist/js/umd/popover",
                    stampit: "assets/js/vendor/stampit",
                    SlickCarousel: "bower_components/slick-carousel/slick/slick",
                    isElementInView: "assets/js/utils/isElementInView"
                }
            }), t.config({
                baseUrl: ShakaVars.pathToTheme
            }), t(["jquery", "underscore", "isElementInView", "assets/js/utils/objectFitFallback", "assets/js/portfolio-grid-filter/gridFilter", "assets/js/portfolio-grid-filter/sliderFilter", "assets/js/utils/easeInOutQuad", "vendor/proteusthemes/proteuswidgets/assets/js/NumberCounter", "assets/js/theme-slider/slick-carousel", "assets/js/theme-slider/vimeo-events", "assets/js/theme-slider/youtube-events", "assets/js/instagram-widget", "assets/js/weather-widget", "vendor/proteusthemes/sticky-menu/assets/js/sticky-menu", "assets/js/TouchDropdown", "assets/js/FunkyMenus", "assets/js/FunkyBoxes", "SlickCarousel", "carousel", "collapse", "tab"], function(e, t, i, n, s, o, r, a, l, d, c, u, p) {
                "use strict";
                e(".col-lg-__col-num__").removeClass("col-lg-__col-num__").addClass("col-lg-3");
                var h = e(".number-counters");
                h.length && (r(), h.each(function() {
                        new a(e(this))
                    })),
                    function() {
                        Modernizr.objectfit || e(".shaka-gallery__item").each(function() {
                            n({
                                $container: e(this)
                            })
                        })
                    }(), e(".portfolio-grid").each(function() {
                        var t, i = window.location.hash;
                        t = "slider" === e(this).data("type") ? o({
                            $container: e(this)
                        }) : s({
                            $container: e(this)
                        }), new RegExp("^#" + t.hashPrefix).test(i) ? e(this).find('a[href="' + i.replace(t.hashPrefix, "") + '"]').trigger("click") : e(this).find(".portfolio-grid__nav-item").first().hasClass("is-disabled") && e(this).find(".portfolio-grid__nav-item:nth-child(2)").children(".portfolio-grid__nav-link").data("skip-hash-update", !0).trigger("click").removeData("skip-hash-update"), !t.isDesktopLayout() && e(this).find(".portfolio-grid__nav-item").first().hasClass("is-disabled") && t.initNavHolderHeight()
                    }), e(".js-person-profile-initialize-carousel").slick(),
                    function() {
                        var t = new l(e(".js-pt-slick-carousel-initialize-slides"));
                        new d(t), (e(".js-person-profile-initialize-carousel .js-carousel-item-yt-video").length > 0 || e(".js-pt-slick-carousel-initialize-slides .js-carousel-item-yt-video").length > 0) && new c(t)
                    }(), e(".js-pw-instagram").each(function() {
                        new u(e(this))
                    }), e(".js-weather").each(function() {
                        new p(e(this))
                    }),
                    function() {
                        var t = e(".js-pt-masonry");
                        if (e.isFunction(e.fn.masonry) && t.length) {
                            var i = function() {
                                t.masonry("layout")
                            };
                            e(document).ready(function() {
                                t.masonry({
                                    itemSelector: ".grid-item"
                                })
                            }), e(window).on("load", function() {
                                i(), setTimeout(i, 1e3)
                            })
                        }
                    }()
            }), i("assets/js/main", function() {})
    }();
} catch (e) {}
try {
    jQuery(function($) {
        $('nav > ul').on('focus.wparia  mouseenter.wparia', '[aria-haspopup="true"]', function(ev) {
            $(ev.currentTarget).attr('aria-expanded', true);
        });
        $('nav > ul').on('blur.wparia  mouseleave.wparia', '[aria-haspopup="true"]', function(ev) {
            $(ev.currentTarget).attr('aria-expanded', false);
        });
    });
} catch (e) {}
try {
    ! function(e) {
        "function" == typeof define && define.amd ? define(["jquery"], e) : "object" == typeof exports ? module.exports = e(require("jquery")) : e(jQuery)
    }(function(s) {
        var c, l, u = !(s.detectSwipe = {
            version: "2.1.2",
            enabled: "ontouchstart" in document.documentElement,
            preventDefault: !0,
            threshold: 20
        });

        function f() {
            this.removeEventListener("touchmove", t), this.removeEventListener("touchend", f), u = !1
        }

        function t(e) {
            if (s.detectSwipe.preventDefault && e.preventDefault(), u) {
                var t, n = e.touches[0].pageX,
                    i = e.touches[0].pageY,
                    r = c - n,
                    a = l - i,
                    o = window.devicePixelRatio || 1;
                Math.abs(r) * o >= s.detectSwipe.threshold ? t = 0 < r ? "left" : "right" : Math.abs(a) * o >= s.detectSwipe.threshold && (t = 0 < a ? "up" : "down"), t && (f.call(this), s(this).trigger("swipe", t).trigger("swipe" + t))
            }
        }

        function e(e) {
            1 == e.touches.length && (c = e.touches[0].pageX, l = e.touches[0].pageY, u = !0, this.addEventListener("touchmove", t, !1), this.addEventListener("touchend", f, !1))
        }
        s.event.special.swipe = {
            setup: function() {
                this.addEventListener && this.addEventListener("touchstart", e, !1)
            }
        }, s.each(["left", "up", "down", "right"], function() {
            s.event.special["swipe" + this] = {
                setup: function() {
                    s(this).on("swipe", s.noop)
                }
            }
        })
    }),
    function(u) {
        "use strict";
        if (void 0 !== u)
            if (u.fn.jquery.match(/-ajax/)) "console" in window && window.console.info("Featherlight needs regular jQuery, not the slim version.");
            else {
                var i = [],
                    r = function(t) {
                        return i = u.grep(i, function(e) {
                            return e !== t && 0 < e.$instance.closest("body").length
                        })
                    },
                    a = {
                        allow: 1,
                        allowfullscreen: 1,
                        frameborder: 1,
                        height: 1,
                        longdesc: 1,
                        marginheight: 1,
                        marginwidth: 1,
                        mozallowfullscreen: 1,
                        name: 1,
                        referrerpolicy: 1,
                        sandbox: 1,
                        scrolling: 1,
                        src: 1,
                        srcdoc: 1,
                        style: 1,
                        webkitallowfullscreen: 1,
                        width: 1
                    },
                    n = {
                        keyup: "onKeyUp",
                        resize: "onResize"
                    },
                    o = function(e) {
                        u.each(c.opened().reverse(), function() {
                            if (!e.isDefaultPrevented() && !1 === this[n[e.type]](e)) return e.preventDefault(), e.stopPropagation(), !1
                        })
                    },
                    s = function(e) {
                        if (e !== c._globalHandlerInstalled) {
                            c._globalHandlerInstalled = e;
                            var t = u.map(n, function(e, t) {
                                return t + "." + c.prototype.namespace
                            }).join(" ");
                            u(window)[e ? "on" : "off"](t, o)
                        }
                    };
                c.prototype = {
                    constructor: c,
                    namespace: "featherlight",
                    targetAttr: "data-featherlight",
                    variant: null,
                    resetCss: !1,
                    background: null,
                    openTrigger: "click",
                    closeTrigger: "click",
                    filter: null,
                    root: "body",
                    openSpeed: 250,
                    closeSpeed: 250,
                    closeOnClick: "background",
                    closeOnEsc: !0,
                    closeIcon: "&#10005;",
                    loading: "",
                    persist: !1,
                    otherClose: null,
                    beforeOpen: u.noop,
                    beforeContent: u.noop,
                    beforeClose: u.noop,
                    afterOpen: u.noop,
                    afterContent: u.noop,
                    afterClose: u.noop,
                    onKeyUp: u.noop,
                    onResize: u.noop,
                    type: null,
                    contentFilters: ["jquery", "image", "html", "ajax", "iframe", "text"],
                    setup: function(e, t) {
                        "object" != typeof e || e instanceof u != !1 || t || (t = e, e = void 0);
                        var n = u.extend(this, t, {
                                target: e
                            }),
                            i = n.resetCss ? n.namespace + "-reset" : n.namespace,
                            r = u(n.background || ['<div class="' + i + "-loading " + i + '">', '<div class="' + i + '-content">', '<button class="' + i + "-close-icon " + n.namespace + '-close" aria-label="Close">', n.closeIcon, "</button>", '<div class="' + n.namespace + '-inner">' + n.loading + "</div>", "</div>", "</div>"].join("")),
                            a = "." + n.namespace + "-close" + (n.otherClose ? "," + n.otherClose : "");
                        return n.$instance = r.clone().addClass(n.variant), n.$instance.on(n.closeTrigger + "." + n.namespace, function(e) {
                            if (!e.isDefaultPrevented()) {
                                var t = u(e.target);
                                ("background" === n.closeOnClick && t.is("." + n.namespace) || "anywhere" === n.closeOnClick || t.closest(a).length) && (n.close(e), e.preventDefault())
                            }
                        }), this
                    },
                    getContent: function() {
                        if (!1 !== this.persist && this.$content) return this.$content;
                        var t = this,
                            e = this.constructor.contentFilters,
                            n = function(e) {
                                return t.$currentTarget && t.$currentTarget.attr(e)
                            },
                            i = n(t.targetAttr),
                            r = t.target || i || "",
                            a = e[t.type];
                        if (!a && r in e && (a = e[r], r = t.target && i), r = r || n("href") || "", !a)
                            for (var o in e) t[o] && (a = e[o], r = t[o]);
                        if (!a) {
                            var s = r;
                            if (r = null, u.each(t.contentFilters, function() {
                                    return (a = e[this]).test && (r = a.test(s)), !r && a.regex && s.match && s.match(a.regex) && (r = s), !r
                                }), !r) return "console" in window && window.console.error("Featherlight: no content filter found " + (s ? ' for "' + s + '"' : " (no target specified)")), !1
                        }
                        return a.process.call(t, r)
                    },
                    setContent: function(e) {
                        return this.$instance.removeClass(this.namespace + "-loading"), this.$instance.toggleClass(this.namespace + "-iframe", e.is("iframe")), this.$instance.find("." + this.namespace + "-inner").not(e).slice(1).remove().end().replaceWith(u.contains(this.$instance[0], e[0]) ? "" : e), this.$content = e.addClass(this.namespace + "-inner"), this
                    },
                    open: function(t) {
                        var n = this;
                        if (n.$instance.hide().appendTo(n.root), !(t && t.isDefaultPrevented() || !1 === n.beforeOpen(t))) {
                            t && t.preventDefault();
                            var e = n.getContent();
                            if (e) return i.push(n), s(!0), n.$instance.fadeIn(n.openSpeed), n.beforeContent(t), u.when(e).always(function(e) {
                                n.setContent(e), n.afterContent(t)
                            }).then(n.$instance.promise()).done(function() {
                                n.afterOpen(t)
                            })
                        }
                        return n.$instance.detach(), u.Deferred().reject().promise()
                    },
                    close: function(e) {
                        var t = this,
                            n = u.Deferred();
                        return !1 === t.beforeClose(e) ? n.reject() : (0 === r(t).length && s(!1), t.$instance.fadeOut(t.closeSpeed, function() {
                            t.$instance.detach(), t.afterClose(e), n.resolve()
                        })), n.promise()
                    },
                    resize: function(e, t) {
                        if (e && t) {
                            this.$content.css("width", "").css("height", "");
                            var n = Math.max(e / (this.$content.parent().width() - 1), t / (this.$content.parent().height() - 1));
                            1 < n && (n = t / Math.floor(t / n), this.$content.css("width", e / n + "px").css("height", t / n + "px"))
                        }
                    },
                    chainCallbacks: function(e) {
                        for (var t in e) this[t] = u.proxy(e[t], this, u.proxy(this[t], this))
                    }
                }, u.extend(c, {
                    id: 0,
                    autoBind: "[data-featherlight]",
                    defaults: c.prototype,
                    contentFilters: {
                        jquery: {
                            regex: /^[#.]\w/,
                            test: function(e) {
                                return e instanceof u && e
                            },
                            process: function(e) {
                                return !1 !== this.persist ? u(e) : u(e).clone(!0)
                            }
                        },
                        image: {
                            regex: /\.(png|jpg|jpeg|gif|tiff?|bmp|svg)(\?\S*)?$/i,
                            process: function(e) {
                                var t = u.Deferred(),
                                    n = new Image,
                                    i = u('<img src="' + e + '" alt="" class="' + this.namespace + '-image" />');
                                return n.onload = function() {
                                    i.naturalWidth = n.width, i.naturalHeight = n.height, t.resolve(i)
                                }, n.onerror = function() {
                                    t.reject(i)
                                }, n.src = e, t.promise()
                            }
                        },
                        html: {
                            regex: /^\s*<[\w!][^<]*>/,
                            process: function(e) {
                                return u(e)
                            }
                        },
                        ajax: {
                            regex: /./,
                            process: function(e) {
                                var n = u.Deferred(),
                                    i = u("<div></div>").load(e, function(e, t) {
                                        "error" !== t && n.resolve(i.contents()), n.fail()
                                    });
                                return n.promise()
                            }
                        },
                        iframe: {
                            process: function(e) {
                                var t = new u.Deferred,
                                    n = u("<iframe/>"),
                                    i = function(e, t) {
                                        var n = {},
                                            i = new RegExp("^" + t + "([A-Z])(.*)");
                                        for (var r in e) {
                                            var a = r.match(i);
                                            a && (n[(a[1] + a[2].replace(/([A-Z])/g, "-$1")).toLowerCase()] = e[r])
                                        }
                                        return n
                                    }(this, "iframe"),
                                    r = function(e, t) {
                                        var n = {};
                                        for (var i in e) i in t && (n[i] = e[i], delete e[i]);
                                        return n
                                    }(i, a);
                                return n.hide().attr("src", e).attr(r).css(i).on("load", function() {
                                    t.resolve(n.show())
                                }).appendTo(this.$instance.find("." + this.namespace + "-content")), t.promise()
                            }
                        },
                        text: {
                            process: function(e) {
                                return u("<div>", {
                                    text: e
                                })
                            }
                        }
                    },
                    functionAttributes: ["beforeOpen", "afterOpen", "beforeContent", "afterContent", "beforeClose", "afterClose"],
                    readElementConfig: function(e, t) {
                        var i = this,
                            r = new RegExp("^data-" + t + "-(.*)"),
                            a = {};
                        return e && e.attributes && u.each(e.attributes, function() {
                            var e = this.name.match(r);
                            if (e) {
                                var t = this.value,
                                    n = u.camelCase(e[1]);
                                if (0 <= u.inArray(n, i.functionAttributes)) t = new Function(t);
                                else try {
                                    t = JSON.parse(t)
                                } catch (e) {}
                                a[n] = t
                            }
                        }), a
                    },
                    extend: function(e, t) {
                        var n = function() {
                            this.constructor = e
                        };
                        return n.prototype = this.prototype, e.prototype = new n, e.__super__ = this.prototype, u.extend(e, this, t), e.defaults = e.prototype, e
                    },
                    attach: function(r, a, o) {
                        var s = this;
                        "object" != typeof a || a instanceof u != !1 || o || (o = a, a = void 0);
                        var c, e = (o = u.extend({}, o)).namespace || s.defaults.namespace,
                            l = u.extend({}, s.defaults, s.readElementConfig(r[0], e), o),
                            t = function(e) {
                                var t = u(e.currentTarget),
                                    n = u.extend({
                                        $source: r,
                                        $currentTarget: t
                                    }, s.readElementConfig(r[0], l.namespace), s.readElementConfig(e.currentTarget, l.namespace), o),
                                    i = c || t.data("featherlight-persisted") || new s(a, n);
                                "shared" === i.persist ? c = i : !1 !== i.persist && t.data("featherlight-persisted", i), n.$currentTarget.blur && n.$currentTarget.blur(), i.open(e)
                            };
                        return r.on(l.openTrigger + "." + l.namespace, l.filter, t), {
                            filter: l.filter,
                            handler: t
                        }
                    },
                    current: function() {
                        var e = this.opened();
                        return e[e.length - 1] || null
                    },
                    opened: function() {
                        var t = this;
                        return r(), u.grep(i, function(e) {
                            return e instanceof t
                        })
                    },
                    close: function(e) {
                        var t = this.current();
                        if (t) return t.close(e)
                    },
                    _onReady: function() {
                        var i = this;
                        if (i.autoBind) {
                            var r = u(i.autoBind);
                            r.each(function() {
                                i.attach(u(this))
                            }), u(document).on("click", i.autoBind, function(e) {
                                if (!e.isDefaultPrevented()) {
                                    var t = u(e.currentTarget);
                                    if (r.length !== (r = r.add(t)).length) {
                                        var n = i.attach(t);
                                        (!n.filter || 0 < u(e.target).parentsUntil(t, n.filter).length) && n.handler(e)
                                    }
                                }
                            })
                        }
                    },
                    _callbackChain: {
                        onKeyUp: function(e, t) {
                            return 27 === t.keyCode ? (this.closeOnEsc && u.featherlight.close(t), !1) : e(t)
                        },
                        beforeOpen: function(e, t) {
                            return u(document.documentElement).addClass("with-featherlight"), this._previouslyActive = document.activeElement, this._$previouslyTabbable = u("a, input, select, textarea, iframe, button, iframe, [contentEditable=true]").not("[tabindex]").not(this.$instance.find("button")), this._$previouslyWithTabIndex = u("[tabindex]").not('[tabindex="-1"]'), this._previousWithTabIndices = this._$previouslyWithTabIndex.map(function(e, t) {
                                return u(t).attr("tabindex")
                            }), this._$previouslyWithTabIndex.add(this._$previouslyTabbable).attr("tabindex", -1), document.activeElement.blur && document.activeElement.blur(), e(t)
                        },
                        afterClose: function(e, t) {
                            var n = e(t),
                                i = this;
                            return this._$previouslyTabbable.removeAttr("tabindex"), this._$previouslyWithTabIndex.each(function(e, t) {
                                u(t).attr("tabindex", i._previousWithTabIndices[e])
                            }), this._previouslyActive.focus(), 0 === c.opened().length && u(document.documentElement).removeClass("with-featherlight"), n
                        },
                        onResize: function(e, t) {
                            return this.resize(this.$content.naturalWidth, this.$content.naturalHeight), e(t)
                        },
                        afterContent: function(e, t) {
                            var n = e(t);
                            return this.$instance.find("[autofocus]:not([disabled])").focus(), this.onResize(t), n
                        }
                    }
                }), u.featherlight = c, u.fn.featherlight = function(e, t) {
                    return c.attach(this, e, t), this
                }, u(document).ready(function() {
                    c._onReady()
                })
            }
        else "console" in window && window.console.info("Too much lightness, Featherlight needs jQuery.");

        function c(e, t) {
            if (!(this instanceof c)) {
                var n = new c(e, t);
                return n.open(), n
            }
            this.id = c.id++, this.setup(e, t), this.chainCallbacks(c._callbackChain)
        }
    }(jQuery),
    function(a) {
        "use strict";
        var e = function(e) {
            window.console && window.console.warn && window.console.warn("FeatherlightGallery: " + e)
        };
        if (void 0 === a) return e("Too much lightness, Featherlight needs jQuery.");
        if (!a.featherlight) return e("Load the featherlight plugin before the gallery plugin");
        var t = "ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch,
            n = a.event && a.event.special.swipeleft && a,
            i = window.Hammer && function(e) {
                var t = new window.Hammer.Manager(e[0]);
                return t.add(new window.Hammer.Swipe), t
            },
            r = t && (n || i);
        t && !r && e("No compatible swipe library detected; one must be included before featherlightGallery for swipe motions to navigate the galleries.");
        var o = {
            afterClose: function(e, t) {
                var n = this;
                return n.$instance.off("next." + n.namespace + " previous." + n.namespace), n._swiper && (n._swiper.off("swipeleft", n._swipeleft).off("swiperight", n._swiperight), n._swiper = null), e(t)
            },
            beforeOpen: function(e, t) {
                var n = this;
                return n.$instance.on("next." + n.namespace + " previous." + n.namespace, function(e) {
                    var t = "next" === e.type ? 1 : -1;
                    n.navigateTo(n.currentNavigation() + t)
                }), r && (n._swiper = r(n.$instance).on("swipeleft", n._swipeleft = function() {
                    n.$instance.trigger("next")
                }).on("swiperight", n._swiperight = function() {
                    n.$instance.trigger("previous")
                }), n.$instance.addClass(this.namespace + "-swipe-aware", r)), n.$instance.find("." + n.namespace + "-content").append(n.createNavigation("previous")).append(n.createNavigation("next")), e(t)
            },
            beforeContent: function(e, t) {
                var n = this.currentNavigation(),
                    i = this.slides().length;
                return this.$instance.toggleClass(this.namespace + "-first-slide", 0 === n).toggleClass(this.namespace + "-last-slide", n === i - 1), e(t)
            },
            onKeyUp: function(e, t) {
                var n = {
                    37: "previous",
                    39: "next"
                }[t.keyCode];
                return n ? (this.$instance.trigger(n), !1) : e(t)
            }
        };

        function s(e, t) {
            if (!(this instanceof s)) {
                var n = new s(a.extend({
                    $source: e,
                    $currentTarget: e.first()
                }, t));
                return n.open(), n
            }
            a.featherlight.apply(this, arguments), this.chainCallbacks(o)
        }
        a.featherlight.extend(s, {
            autoBind: "[data-featherlight-gallery]"
        }), a.extend(s.prototype, {
            previousIcon: "&#9664;",
            nextIcon: "&#9654;",
            galleryFadeIn: 100,
            galleryFadeOut: 300,
            slides: function() {
                return this.filter ? this.$source.find(this.filter) : this.$source
            },
            images: function() {
                return e("images is deprecated, please use slides instead"), this.slides()
            },
            currentNavigation: function() {
                return this.slides().index(this.$currentTarget)
            },
            navigateTo: function(e) {
                var t = this,
                    n = t.slides(),
                    i = n.length,
                    r = t.$instance.find("." + t.namespace + "-inner");
                return e = (e % i + i) % i, t.$currentTarget = n.eq(e), t.beforeContent(), a.when(t.getContent(), r.fadeTo(t.galleryFadeOut, .2)).always(function(e) {
                    t.setContent(e), t.afterContent(), e.fadeTo(t.galleryFadeIn, 1)
                })
            },
            createNavigation: function(t) {
                var n = this;
                return a('<span title="' + t + '" class="' + this.namespace + "-" + t + '"><span>' + this[t + "Icon"] + "</span></span>").click(function(e) {
                    a(this).trigger(t + "." + n.namespace), e.preventDefault()
                })
            }
        }), a.featherlightGallery = s, a.fn.featherlightGallery = function(e) {
            return s.attach(this, e), this
        }, a(document).ready(function() {
            s._onReady()
        })
    }(jQuery),
    function(e, i, t) {
        "use strict";
        var n = i(document.body);

        function r(e, t) {
            return /(.png|.jpg|.jpeg|.gif|.tiff|.bmp)$/.test(i(t).attr("href").toLowerCase().split("?")[0].split("#")[0])
        }

        function a(e, t) {
            var n = i(t).find("a[data-featherlight]");
            n.attr("data-featherlight") && n.featherlightGallery({
                previousIcon: "",
                nextIcon: ""
            })
        }

        function o() {
            var e;
            i.featherlight.defaults.closeIcon = "", n.find("a[href]").filter(r).attr("data-featherlight", "image"), 0 !== (e = n.find('[class*="gallery"]')).length && i.each(e, a), n.hasClass("wp-featherlight-captions") && (i.featherlight.prototype.afterContent = function() {
                var e = this.$instance,
                    t = function(e) {
                        var t = e.parent().find(".wp-caption-text");
                        if (0 !== t.length) return t;
                        var n = e.parent().find("figcaption");
                        if (0 !== n.length) return n;
                        var i = e.parents(".gallery-item");
                        if (0 !== i.length) return i.find(".wp-caption-text");
                        var r = e.parents(".blocks-gallery-item");
                        if (0 !== r.length) return r.find("figcaption");
                        var a = e.parents(".tiled-gallery-item");
                        return 0 !== a.length ? a.find(".tiled-gallery-caption") : ""
                    }(this.$currentTarget);
                e.find(".caption").remove(), 0 !== t.length && (i('<div class="caption">').appendTo(e.find(".featherlight-content"))[0].innerHTML = t.html())
            })
        }
        i(document).ready(function() {
            o()
        })
    }(0, jQuery);
} catch (e) {}
try { /*! This file is auto-generated */
    ! function(d, l) {
        "use strict";
        var e = !1,
            o = !1;
        if (l.querySelector)
            if (d.addEventListener) e = !0;
        if (d.wp = d.wp || {}, !d.wp.receiveEmbedMessage)
            if (d.wp.receiveEmbedMessage = function(e) {
                    var t = e.data;
                    if (t)
                        if (t.secret || t.message || t.value)
                            if (!/[^a-zA-Z0-9]/.test(t.secret)) {
                                var r, a, i, s, n, o = l.querySelectorAll('iframe[data-secret="' + t.secret + '"]'),
                                    c = l.querySelectorAll('blockquote[data-secret="' + t.secret + '"]');
                                for (r = 0; r < c.length; r++) c[r].style.display = "none";
                                for (r = 0; r < o.length; r++)
                                    if (a = o[r], e.source === a.contentWindow) {
                                        if (a.removeAttribute("style"), "height" === t.message) {
                                            if (1e3 < (i = parseInt(t.value, 10))) i = 1e3;
                                            else if (~~i < 200) i = 200;
                                            a.height = i
                                        }
                                        if ("link" === t.message)
                                            if (s = l.createElement("a"), n = l.createElement("a"), s.href = a.getAttribute("src"), n.href = t.value, n.host === s.host)
                                                if (l.activeElement === a) d.top.location.href = t.value
                                    }
                            }
                }, e) d.addEventListener("message", d.wp.receiveEmbedMessage, !1), l.addEventListener("DOMContentLoaded", t, !1), d.addEventListener("load", t, !1);

        function t() {
            if (!o) {
                o = !0;
                var e, t, r, a, i = -1 !== navigator.appVersion.indexOf("MSIE 10"),
                    s = !!navigator.userAgent.match(/Trident.*rv:11\./),
                    n = l.querySelectorAll("iframe.wp-embedded-content");
                for (t = 0; t < n.length; t++) {
                    if (!(r = n[t]).getAttribute("data-secret")) a = Math.random().toString(36).substr(2, 10), r.src += "#?secret=" + a, r.setAttribute("data-secret", a);
                    if (i || s)(e = r.cloneNode(!0)).removeAttribute("security"), r.parentNode.replaceChild(e, r)
                }
            }
        }
    }(window, document);
} catch (e) {}
try {
    var panelsStyles = {
        "fullContainer": ".boxed-container"
    };
} catch (e) {}
try {
    jQuery((function(e) {
        var t = function() {
            var t = e(panelsStyles.fullContainer);
            0 === t.length && (t = e("body"));
            var r = e(".siteorigin-panels-stretch.panel-row-style");
            r.each((function() {
                var r = e(this),
                    i = r.data("stretch-type"),
                    n = "full-stretched-padded" === i ? "" : 0;
                r.css({
                    "margin-left": 0,
                    "margin-right": 0,
                    "padding-left": n,
                    "padding-right": n
                });
                var l = r.offset().left - t.offset().left,
                    a = t.outerWidth() - l - r.parent().outerWidth();
                r.css({
                    "margin-left": -l,
                    "margin-right": -a,
                    "padding-left": "full" === i ? l : n,
                    "padding-right": "full" === i ? a : n
                });
                var d = r.find("> .panel-grid-cell");
                "full-stretched" === i && 1 === d.length && d.css({
                    "padding-left": 0,
                    "padding-right": 0
                }), r.css({
                    "border-left": n,
                    "border-right": n
                })
            })), r.length && e(window).trigger("panelsStretchRows")
        };
        e(window).on("resize load", t), t(), e("body").removeClass("siteorigin-panels-before-js")
    }));
} catch (e) {}
try {
    window.onload = function() {
        Trustindex.init_pager(document.querySelectorAll(".ti-widget"))
    };
} catch (e) {}
try {
    document.body.className = document.body.className.replace("siteorigin-panels-before-js", "");
} catch (e) {}