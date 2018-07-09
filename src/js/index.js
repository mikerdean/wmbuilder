(function($, ko) {
	"use strict";

	// ######################################################

	var Utils = {
		arrayPushAndNotify: function(obsv, arr, clear) {

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

		},
		sortByTitle: function(a, b) {
			if (a.title === b.title) {
				return 0;
			} else if (a.title < b.title) {
				return -1;
			} else {
				return 1;
			}
		}
	};

	// ######################################################

	var UnitSize = {
		MIN: 'Minimum',
		MAX: 'Maximum'
	};

	var UnitType = {
		SOLO: 1,
		UNIT: 2,
		UNITATTACHMENT: 4,
		WARBEAST: 8,
		WARCASTER: 16,
		WARJACK: 32,
		WARLOCK: 64
	};

	// ######################################################

	if ('freeze' in Object) {
		Object.freeze(Utils);
		Object.freeze(UnitSize);
		Object.freeze(UnitType);
	}

	// ######################################################

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

	var WMUnitEntry = function(unit, unitSize) {
		var self = this;

		if (!(this instanceof WMUnitEntry)) {
			return new WMUnitEntry(unit, unitSize);
		}

		var _unit = unit;
		var _unitSize = unitSize;

		var _points = (function() {
			var key = 'points' + (_unitSize || '');
			if (_unit.type & (UnitType.WARCASTER | UnitType.WARLOCK)) {
				return '+' + _unit['bonusPoints'];
			} else {
				return _unit[key];
			}
		})();

		var _title = (function() {
			var key = 'size' + (_unitSize || '');
			var title = _unit.title;
			if ((_unit.type & UnitType.UNIT) && _unit.hasOwnProperty(key)) {
				title += ' (Leader and ' + (_unit[key] - 1) + ' Grunts)';
			}
			return title;
		})();

		// public properties

		self.attachments = ko.observableArray();

		// getters

		Object.defineProperty(self, 'id', { 
			get: function() {
				return _unit.id;
			}
		});

		Object.defineProperty(self, 'images', { 
			get: function() {
				return _unit.images;
			}
		});

		Object.defineProperty(self, 'points', { 
			get: function() {
				return _points;
			}
		});

		Object.defineProperty(self, 'title', { 
			get: function() {
				return _title;
			}
		});

		Object.defineProperty(self, 'type', { 
			get: function() {
				return _unit.type;
			}
		});

		// public methods

		self.attach = function(unitEntry) {

			if (!(unitEntry instanceof WMUnitEntry)) {
				return;
			}

			var attachments = ko.unwrap(self.attachments);
			attachments.push(unitEntry);
			attachments.sort(Utils.sortByTitle);
			self.attachments.valueHasMutated();
			
		};

		self.remove = function(unitEntry) {
			
			if (!(unitEntry instanceof WMUnitEntry)) {
				return;
			}

			self.attachments.remove(unitEntry);

		};

	};

	// ######################################################

	var WMList = function(faction, points) {
		var self = this;

		if (!(self instanceof WMList)) {
			return new WMList();
		}

		var _faction = (function(f) {

			var output = $.extend({}, f);

			for(var key in output) {

				if (!$.isArray(output[key])) {
					continue;
				}

				$.each(output[key], function(i, u) {
					if (u.hasOwnProperty('pointsMinimum')) {
						u.disabled = ko.pureComputed({ 
							read: function() { return this.disabledMinimum() && this.disabledMaximum(); },
							write: function(value) { this.disabledMinimum(true); this.disabledMaximum(true); },
							owner: u
						});
						u.disabledMinimum = ko.observable(true);
						u.disabledMaximum = ko.observable(true);
					} else {
						u.disabled = ko.observable(!(u.type & (UnitType.WARLOCK | UnitType.WARCASTER)));
					}
				});

			}

			return output;

		})(faction);

		var _points = points;

		var _unitEntries = (function() {
			
			var hash = {};

			for(var key in UnitType) {
				hash[UnitType[key]] = ko.observableArray();
			}

			return hash;

		})();

		var _unitTypeFormatName = function(key) {
			var first = key.substr(0, 1).toUpperCase();
			return first + key.substr(1);
		};

		var _unitTypes = (function(f) {

			var output = [];

			for(var key in f) {

				if (!$.isArray(f[key])) {
					continue;
				}

				output.push({ propertyName: key, name: _unitTypeFormatName(key) });

			}

			return output;

		})(_faction);

		var _unitAttachmentLocator = function(unit, attachTo) {

			if (!_unitEntries.hasOwnProperty(attachTo)) {
				throw new Error('Error 00002: Could not attach unit to a viable entry. Validation must have gone awry.');
			}

			var entries = ko.unwrap(_unitEntries[attachTo]);

			if (attachTo & (UnitType.WARCASTER | UnitType.WARLOCK)) {

				if (entries.length === 0) {
					throw new Error('Error 00003: Could not attach unit to a viable warcaster/warlock. Validation must have gone awry.');
				} else {
					return entries[0];
				}

			} else {

				return undefined;

			}

		};

		var _enableDisableUnits = function() {

			// disable/enable units in the faction

			var selected = $.map(ko.unwrap(self.unitsSelected), function(u) {
				var output = [ u ];
				$.each(ko.unwrap(u.attachments), function(i, a) {
					output.push(a);
				});
				return output;
			});

			var pointsRemaining = ko.unwrap(self.pointsRemaining);
			var allow = {};

			for(var key in UnitType) {
				allow[UnitType[key]] = false;
			}

			// 1. if we have a warcaster/warlock then enable warjacks/warbeasts, units and solos

			var casters = ko.utils.arrayFilter(selected, function(u) {
				return u.type & (UnitType.WARCASTER | UnitType.WARLOCK);
			});

			if (ko.utils.arrayFirst(casters, function(u) { return u.type & UnitType.WARLOCK})) {
				allow[UnitType.WARBEAST] = true;
				allow[UnitType.UNIT] = true;
				allow[UnitType.SOLO] = true;
			}

			if (ko.utils.arrayFirst(casters, function(u) { return u.type & UnitType.WARCASTER})) {
				allow[UnitType.WARJACK] = true;
				allow[UnitType.UNIT] = true;
				allow[UnitType.SOLO] = true;
			}

			// 2. check the caster allowance and enable warlocks/warcasters if necessary

			if (casters.length < _points.casterAllowance) {
				allow[UnitType.WARCASTER] = true;
				allow[UnitType.WARLOCK] = true;
			}

			// 3. calculate a field allowance map from the selected units
			
			var fa = {};

			$.each(selected, function(i, u) {
				if (fa.hasOwnProperty(u.id)) {
					fa[u.id] += 1;
				} else {
					fa[u.id] = 1;
				}
			});

			// 4. loop through the units and enable/disable them based on the settings, FA and points remaining

			for(var key in _faction) {

				if (!$.isArray(_faction[key])) {
					continue;
				}

				$.each(_faction[key], function(i, u) {

					if (allow[u.type] === false) {
						u.disabled(true);
					} else if (fa.hasOwnProperty(u.id) && fa[u.id] >= u.fieldAllowance) {
						u.disabled(true);
					} else if (u.hasOwnProperty('points') && u.points > pointsRemaining) {
						u.disabled(true);
					} else if (u.hasOwnProperty('pointsMinimum')) {
						u.disabledMinimum(u.pointsMinimum > pointsRemaining);
						u.disabledMaximum(u.pointsMaximum > pointsRemaining);
					} else {
						u.disabled(false);
					}

				});

			}

		};

		var _unitAdd = function(unit, unitSize) {

			if (!unit || unit.disabled()) {
				return;
			}

			var toAttach = undefined;

			if (unit.type & UnitType.WARJACK) {
				toAttach = _unitAttachmentLocator(unit, UnitType.WARCASTER);
			} else if (unit.type & UnitType.WARBEAST) {
				toAttach = _unitAttachmentLocator(unit, UnitType.WARLOCK);
			} else if (unit.type & UnitType.UNITATTACHMENT) {
				toAttach = _unitAttachmentLocator(unit, UnitType.UNITATTACHMENT);
			}

			var unitEntry = new WMUnitEntry(unit, unitSize);

			if (toAttach) {
				toAttach.attach(unitEntry);
			} else {
				_unitEntries[unit.type].push(unitEntry);
			}

			_enableDisableUnits();

		};

		var _unitAddAndSort = function(arr, unitType) {

			if (!_unitEntries.hasOwnProperty(unitType)) {
				return;
			}

			var values = ko.unwrap(_unitEntries[unitType]);
			values.sort(Utils.sortByTitle);
			ko.utils.arrayPushAll(arr, values);

		};

		self.name = ko.observable('#Untitled');
		self.unitTypeSelected = ko.observable(_unitTypes[0]);

		// getters

		Object.defineProperty(self, 'faction', { 
			get: function() {
				return _faction;
			}
		});

		Object.defineProperty(self, 'points', { 
			get: function() {
				return _points;
			}
		});

		Object.defineProperty(self, 'unitTypes', {
			get: function() {
				return _unitTypes;
			}
		});

		// computed

		self.pointsRemaining = ko.pureComputed(function() {
			var total = 0 + _points.points;

			var casters = $.merge([], ko.unwrap(_unitEntries[UnitType.WARCASTER])|| []);
			casters = $.merge(casters, (ko.unwrap(_unitEntries[UnitType.WARLOCK]) || []));

			$.each(casters, function(i, caster) {
				var bonus = parseInt(caster.points, 10);

				$.each(ko.unwrap(caster.attachments), function(i, u) {
					if (u.type & (UnitType.WARBEAST | UnitType.WARJACK)) {
						if (bonus > u.points) {
							bonus -= u.points;
						} else if (bonus === 0) {
							total -= u.points;
						} else {
							var diff = u.points - bonus;
							bonus = 0;
							total -= diff;
						}
					} else {
						total -= u.points;
					}
				});
			});

			var others = $.merge([], ko.unwrap(_unitEntries[UnitType.UNIT]) || []);
			others = $.merge(others, ko.unwrap(_unitEntries[UnitType.SOLO]) || []);

			$.each(others, function(i, u) {
				if (u.points) {
					total -= u.points;
				}
			});

			return total;

		});

		self.unitsSelected = ko.pureComputed(function() {

			var units = [];

			_unitAddAndSort(units, UnitType.WARLOCK);
			_unitAddAndSort(units, UnitType.WARCASTER);
			_unitAddAndSort(units, UnitType.UNIT);
			_unitAddAndSort(units, UnitType.SOLO);

			return units;

		});

		// public methods

		self.unitAdd = function(unit) {

			if (unit.disabled()) {
				return;
			}

			_unitAdd(unit);

		};

		self.unitAddMaximum = function(unit) {

			if (unit.hasOwnProperty('disabledMaximum') && unit.disabledMaximum()) {
				return;
			}

			_unitAdd(unit, UnitSize.MAX);

		};

		self.unitAddMinimum = function(unit) {

			if (unit.hasOwnProperty('disabledMinimum') && unit.disabledMinimum()) {
				return;
			}

			_unitAdd(unit, UnitSize.MIN);
			
		};

		self.unitRemove = function(unitEntry) {
			_unitEntries[unitEntry.type].remove(unitEntry);
			_enableDisableUnits();
		};

		self.unitRemoveAttachment = function(unitEntry, unitAttachment) {
			unitEntry.remove(unitAttachment);
			_enableDisableUnits();
		};

		self.unitTypeSelect = function(unitType) {
			self.unitTypeSelected(unitType);
			window.scrollTo(0, 0);
		};

	};

	// ######################################################

	var WMBuilder = function() {
		var self = this;

		if (!(self instanceof WMBuilder)) {
			return new WMBuilder();
		}

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

		self.toggle = function(list) {
			list.visible(!list.visible());
		};

		self.unitDisplayCards = function(unit) {

			if (!unit || !unit.images || unit.images.length === 0) {
				return;
			}

			Utils.arrayPushAndNotify(self.images, unit.images, true);
			document.body.style.overflow = 'hidden';

		};

		self.unitDisplayClear = function() {
			self.images.removeAll();
			document.body.style.overflow = 'visible';	
		};

		(function init() {

			$.getJSON('cards/__cardindex.json')
				.done(function(factions) {

					// process the faction units to add a semantic type property

					var addUnitType = function(faction, propertyName, type) {
						
						if (!faction.hasOwnProperty(propertyName)) {
							return;
						}

						$.each(faction[propertyName], function(i, u) {
							u.type = type;
						});

					};

					$.each(factions, function(i, f) {
						addUnitType(f, 'warcasters', UnitType.WARCASTER);
						addUnitType(f, 'warlocks', UnitType.WARLOCK);
						addUnitType(f, 'warjacks', UnitType.WARJACK);
						addUnitType(f, 'warbeasts', UnitType.WARBEAST);
						addUnitType(f, 'solos', UnitType.SOLO);
						addUnitType(f, 'units', UnitType.UNIT);
					});

					Utils.arrayPushAndNotify(self.lookups.factions, factions, true);

					// remove me
					// ###
					self.selected.faction(factions[10]);
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

	ko.options.deferUpdates = true;
	ko.applyBindings(new WMBuilder(), document.getElementById('wmbuilder'));

})(jQuery, ko);