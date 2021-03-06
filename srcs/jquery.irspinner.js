(function($) {
	/**
	 * \brief .\n
	 * Auto-load the irSpinner modules for the tags with a data-irSpinner field.\n
	 * 
	 * \alias jQuery.irSpinner
	 *
	 * \param {String|Array} [action] The action to be passed to the function. If the instance is not created,
	 * \a action can be an \see Array that will be considered as the \a options.
	 * Otherwise \a action must be a \see String with the following value:
	 * \li \b create - Creates the object and associate it to a selector. \code $("#test").irSpinner("create"); \endcode
	 *
	 * \param {Array} [options] The options to be passed to the object during its creation.
	 * See \see $.fn.irSpinner.defaults a the complete list.
	 *
	 * \return {jQuery}
	 */
	$.fn.irSpinner = function(arg, data) {
		var retval;
		// Go through each objects
		$(this).each(function() {
			retval = $().irSpinner.x.call(this, arg, data);
		});
		// Make it chainable, or return the value if any
		return (typeof retval === "undefined") ? $(this) : retval;
	};

	/**
	 * This function handles a single object.
	 * \private
	 */
	$.fn.irSpinner.x = function(arg, data) {
		// Load the default options
		var options = $.fn.irSpinner.defaults;

		// --- Deal with the actions / options ---
		// Set the default action
		var action = "create";
		// Deal with the action argument if it has been set
		if (typeof arg === "string") {
			action = arg;
		}
		// If the module is already created and the action is not create, load its options
		if (action != "create" && $(this).data("irSpinner")) {
			options = $(this).data("irSpinner");
		}
		// If the first argument is an object, this means options have
		// been passed to the function. Merge them recursively with the
		// default options.
		if (typeof arg === "object" || action == "create") {
			options = $.extend(true, {}, options, arg);
		}
		// Store the options to the module
		$(this).data("irSpinner", options);

		// Handle the different actions
		switch (action) {
		// Create action
		case "create":
			$.fn.irSpinner.create.call(this);
			break;
		case "resize":
			$.fn.irSpinner.select.call(this, options.index, /*force*/data);
			break;
		case "previous":
			$.fn.irSpinner.select.call(this, options.index - 1);
			break;
		case "next":
			$.fn.irSpinner.select.call(this, options.index + 1);
			break;
		case "select":
			$.fn.irSpinner.select.call(this, data);
			break;
		};
	};

	$.fn.irSpinner.val = function(value) {
		var body = $(this).find("ul:first");
		var index = 0;

		// Look for the index of the value
		$(body).find("li").each(function(i) {
			if ($(this).data("value") == value) {
				index = i;
				return false;
			}
		});

		$.fn.irSpinner.select.call(this, index);
	};

	$.fn.irSpinner.select = function(index, force) {
		var options = $(this).data("irSpinner");

		// Make sure index is within the boundaries
		index = Math.max(index, 0);
		index = Math.min(index, options["list"].length - 1);

		var force = (typeof force !== "undefined");

		// Return if the same selection is already active
		if (!force && options["index"] == index) {
			return;
		}
		options["index"] = index;

		// Look for the value
		var body = $(this).find("ul:first");
		var item = $(body).find("li:nth-child(" + (index + 1) + ")");

		// Set the value
		var value = $(item).data("value");
		options["value"] = value;
		$(this).data("irSpinner", options);

		// Prevent animation
		if (force) {
			$(body).css("top", "auto");
			$(body).css("left", "auto");
		}

		if (options.vertical) {
			$(body).css("top", ($(this).height() - $(item).outerHeight()) / 2 - $(item).position().top);
		}
		else {
			$(body).css("left", ($(this).width() - $(item).outerWidth()) / 2 - $(item).position().left);
		}
		$(body).find("li").removeClass("selected");
		$(body).find(item).addClass("selected");
	};

	$.fn.irSpinner.create = function() {
		var obj = this;
		var options = $(this).data("irSpinner");

		$(this).addClass("irSpinner");

		var body = $("<ul>");

		// Build the list of elements
		var list = options["list"];
		var newList = [];
		var index = 0;
		for (var name in list) {
			var item = $("<li>");
			var value = ($.isArray(list)) ? list[name] : name;
			newList.push(value);
			$(item).data("value", value);
			$(item).data("index", index++);
			$(item).html(list[name]);
			$(item).on("click touch", function() {
				if (!$(obj).data("hasMoved")) {
					$(obj).irSpinner("select", $(this).data("index"));
				}
				//$(obj).val($(this).data("value")).trigger("change");
				// Stop event handlers
				$(document).off("mouseup touchend", $.fn.irSpinner.stopScrollingEvent);
				$(document).off("mousemove", $.fn.irSpinner.onMouseScrollingEvent);
				$(document).off("touchmove", $.fn.irSpinner.onTouchScrollingEvent);
			});
			$(body).append(item);
		}
		options["list"] = newList;

		$(this).html(body);

		// Set and pre-calculate some of the key values
		var isVertical = options.vertical;
		$(body).addClass((isVertical) ? "vertical" : "horizontal");
		$(this).data("irSpinner", options);

		// Select the first element by default
		$.fn.irSpinner.select.call(this, 0);
		$(body).find("img").on("load", function() {
			$(obj).irSpinner("resize", /*force*/true);
		});

		$(this).on("mousedown touchstart", obj, function(e) {
			var obj = e.data;
			var options = $(obj).data("irSpinner");
			var nbItems = $(body).children("li").length;
			var itemSize = ((isVertical) ? $(body).height() / nbItems : $(body).width() / nbItems) / options.sensitivity;
			var initialIndex = options.index;
			var initialPosition = ((isVertical) ? (e.pageY || e.originalEvent.touches[0].pageY) : (e.pageX || e.originalEvent.touches[0].pageX));
			var prevDelta = 0;

			$(obj).data("hasMoved", false);

			var setPositionFromDelta = function(obj, delta) {
				if (Math.abs(prevDelta) < itemSize / 4) {
					return;
				}
				var deltaIndex = Math.round(delta / itemSize);
				if (deltaIndex != 0) {
					$(obj).data("hasMoved", true);
				}
				$.fn.irSpinner.select.call(obj, initialIndex - deltaIndex);
			};

			var timeStartMs = performance.now();

			// Create an events and save them so it can be detached later on
			// These events are used to handle scrolling
			// Before doing this, delete previous events if any
			$(document).off("mouseup touchend", $.fn.irSpinner.stopScrollingEvent);
			$(document).off("mousemove", $.fn.irSpinner.onMouseScrollingEvent);
			$(document).off("touchmove", $.fn.irSpinner.onTouchScrollingEvent);

			$.fn.irSpinner.stopScrollingEvent = function(me) {
				// Ignore if the event is too small
				if (Math.abs(prevDelta) < itemSize / 2) {
					return;
				}
				var obj = me.data;
				var timeTotalMs = performance.now() - timeStartMs;
				var acceleration = Math.abs(prevDelta / timeTotalMs);
				if (acceleration > 0.5) {
					setPositionFromDelta(obj, prevDelta * acceleration * 2);
				}
				
				$(obj).trigger("change");
				// Stop event handlers
				$(document).off("mouseup touchend", $.fn.irSpinner.stopScrollingEvent);
				$(document).off("mousemove", $.fn.irSpinner.onMouseScrollingEvent);
				$(document).off("touchmove", $.fn.irSpinner.onTouchScrollingEvent);
			};
			$(document).on("mouseup touchend", obj, $.fn.irSpinner.stopScrollingEvent);

			$.fn.irSpinner.onMouseScrollingEvent = function(me) {
				// Ensure that only one event is taken into account
				me.preventDefault();
				if (me.buttons) {
					var obj = me.data;
					prevDelta = ((isVertical) ? me.pageY : me.pageX) - initialPosition;
					setPositionFromDelta(obj, prevDelta);
				}
				else {
					$.fn.irSpinner.stopScrollingEvent(me);
				}
			};
			$(document).on("mousemove", obj, $.fn.irSpinner.onMouseScrollingEvent);

			$.fn.irSpinner.onTouchScrollingEvent = function(me) {
				// Ensure that only one event is taken into account
				if (me.originalEvent.touches && me.originalEvent.touches.length > 0) {
					var obj = me.data;
					prevDelta = (((isVertical) ? me.originalEvent.touches[0].pageY : me.originalEvent.touches[0].pageX) - initialPosition);
					setPositionFromDelta(obj, prevDelta);
				}
				else {
					$.fn.irSpinner.stopScrollingEvent(me);
				}
			};
			$(document).on("touchmove", obj, $.fn.irSpinner.onTouchScrollingEvent);
		});
	};

	/**
	 * \brief Default options, can be overwritten. These options are used to customize the object.
	 * Change default values:
	 * \code $().irSpinner.defaults.theme = "aqua"; \endcode
	 * \type Array
	 */
	$.fn.irSpinner.defaults = {
		/**
		 * Specifies a custom theme for this element.
		 * By default the irSpinner class is assigned to this element, this theme
		 * is an additional class to be added to the element.
		 * \type String
		 */
		theme: "",
		/**
		 * Element list
		 */
		list: [],
		/**
		 * Current value of the element
		 */
		value: null,
		/**
		 * Sensitivity factor, 1 being the normal sensitivym hihgher number will give higher sensitivity and lower, less.
		 */
		sensitivity: 1,
		/**
		 * Orientation
		 */
		vertical: true
	};
})(jQuery);
