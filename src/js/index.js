(function($, ko) {
	"use strict";

	var WMPoints = function(points, description, casterAllowance) {

		if (!(this instanceof WMPoints)) {
			return new WMPoints();
		}

		this.points = points;
		this.description = description;
		this.casterAllowance = casterAllowance;

	};

	Object.defineProperty(WMPoints.prototype, 'fullDescription', {
		get: function() {
			return this.description + ' (' + this.casterAllowance + ' caster, ' + this.points + 'pts)';
		}
	});

	// ######################################################

	var WMList = function(faction, points) {
		var self = this;

		if (!(self instanceof WMList)) {
			return new WMList();
		}

		self.faction = faction;
		self.name = ko.observable('#Untitled');
		self.points = points;
	};

	// ######################################################

	var WMBuilder = function() {
		var self = this;

		if (!(self instanceof WMBuilder)) {
			return new WMBuilder();
		}

		var arrayPushAndNotify = function(obsv, arr, clear) {

			if (!obsv || !arr || !ko.isObservable(obsv) || !$.isArray(arr)) {
				throw new Error('Please provide a valid observable and data array.');
			}

			var observableValues = ko.unwrap(obsv);

			if (clear) {
				while(observableValues.length > 0) {
					observableValues.pop();
				}
			}

			ko.utils.arrayPushAll(observableValues, arr);
			obsv.valueHasMutated();

		};

		self.indicators = {
			loading: ko.observable(true)
		};

		self.images = ko.observableArray();

		self.lookups = {
			factions: ko.observableArray(),
			lists: ko.observableArray(),
			points: [ 
				new WMPoints(10, 'Skirmish', 1),
				new WMPoints(25, 'Rapid Assault', 1),
				new WMPoints(50, 'Clash of Arms', 1),
				new WMPoints(75, 'Pitched Battle', 1),
				new WMPoints(100, 'Grand Melee', 1),
				new WMPoints(125, 'Major Engagement', 2),
				new WMPoints(200, 'Open War', 3),
				new WMPoints(275, 'Open War', 4)
			]
		};

		self.selected = {
			faction: ko.observable(),
			list: ko.observable(),
			points: ko.observable()
		};

		// methods

		self.fieldAllowanceFormat = function(unit) {

			if (!unit || !unit.hasOwnProperty('fieldAllowance')) {
				return;
			}

			if (unit.fieldAllowance < 1) {
				return 0;
			} else if (unit.fieldAllowance >= 999) {
				return 'U';
			} else {
				return unit.fieldAllowance;
			}

		};

		self.listCreate = function() {

			var faction = ko.unwrap(self.selected.faction);
			var points = ko.unwrap(self.selected.points);

			if (!faction || !points) {
				return;
			}

			var list = new WMList(faction, points);
			self.lookups.lists.push(list);
			self.listDisplay(list);

		};

		self.listDisplay = function(list) {
			
			if (!list) {
				return;
			}

			self.selected.list(list);
			self.selected.faction(undefined);
			self.selected.points(undefined);

		};

		self.listRemove = function(list) {
			
			if (!list) {
				return;
			}

			self.lookups.lists.remove(list);
			self.selected.list(undefined);

		};

		self.noop = function() {
			// no operation for disabling links
		};

		self.unitDisplayCards = function(unit) {

			if (!unit || !unit.images || unit.images.length === 0) {
				return;
			}

			arrayPushAndNotify(self.images, unit.images, true);

		};

		(function init() {

			$.getJSON('cards/__cardindex.json')
				.done(function(cardIndex) {
					arrayPushAndNotify(self.lookups.factions, cardIndex, true);

					// remove me
					// ###
					self.selected.faction(cardIndex[9]);
					self.selected.points(self.lookups.points[3]);
					self.listCreate();
					// ###
				})
				.fail(function() {
					// display error message
				})
				.always(function() {
					self.indicators.loading(false);
				});

		})();

	};

	ko.applyBindings(new WMBuilder(), document.getElementById('wmbuilder'));

})(jQuery, ko);