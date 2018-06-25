(function($, ko) {
	"use strict";

	var WMBuilder = function() {
		var self = this;

		self.indicators = {
			loading: ko.observable(true)
		};

		(function init() {

			$.getJSON('cards/__cardindex.json')
				.done(function(cardIndex) {

				})
				.fail(function() {

				})
				.always(function() {
					self.indicators.loading(false);
				});

		})();

	};

	ko.applyBindings(new WMBuilder(), document.getElementById('wmbuilder'));

})(jQuery, ko);