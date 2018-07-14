(function($, ko) {
	"use strict";

	ko.bindingHandlers['let'] = {
		'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
			var innerContext = bindingContext.extend(valueAccessor);
			ko.applyBindingsToDescendants(innerContext, element);
			return { 'controlsDescendantBindings': true };
		}
	};

	ko.virtualElements.allowedBindings['let'] = true;

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
		sortByKey: function(key) {
			return function(a, b) {
				if (a[key] === b[key]) {
					return 0;
				} else if (a[key] < b[key]) {
					return -1;
				} else {
					return 1;
				}
			};
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
		WARLOCK: 64,
		MERCENARY: 128,
		MINION: 256
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

		Object.defineProperty(self, 'attachTo', { 
			get: function() {
				return _unit.attachTo;
			}
		});

		Object.defineProperty(self, 'attachToType', { 
			get: function() {
				return _unit.attachToType;
			}
		});

		Object.defineProperty(self, 'battlegroupWarbeasts', { 
			get: function() {
				return _unit.battlegroupWarbeasts;
			}
		});

		Object.defineProperty(self, 'battlegroupWarjacks', { 
			get: function() {
				return _unit.battlegroupWarjacks;
			}
		});

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

		Object.defineProperty(self, 'jackMarshal', { 
			get: function() {
				return _unit.jackMarshal;
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

		Object.defineProperty(self, 'weaponAttachment', { 
			get: function() {
				return _unit.weaponAttachment;
			}
		});

		// public methods

		self.attach = function(unitEntry) {

			if (!(unitEntry instanceof WMUnitEntry)) {
				return;
			}

			var attachments = ko.unwrap(self.attachments);
			attachments.push(unitEntry);
			attachments.sort(Utils.sortByKey('title'));
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

		var _unitEntryRecurse = function(output, unitEntry) {
			output.push(unitEntry);
			$.each(ko.unwrap(unitEntry.attachments), function(i, a) {
				_unitEntryRecurse(output, a);
			});
		};
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

		var _updateCounter = function(unit, counter) {
			if (counter.hasOwnProperty(unit.id)) {
				counter[unit.id] += 1;
			} else {
				counter[unit.id] = 1;
			}

			return counter[unit.id];
		};

		var _enableDisableUnits = function() {

			// disable/enable units in the faction

			var selected = ko.unwrap(self.unitsSelected);
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
				_updateCounter(u, fa);
				$.each(ko.unwrap(u.attachments), function(j, ua) {
					_updateCounter(ua, fa);
				});
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
					} else if (u.hasOwnProperty('attachTo') && u.weaponAttachment && (!fa.hasOwnProperty(u.attachTo) || (fa.hasOwnProperty(u.id) && fa[u.id] >= (fa[u.attachTo] * 3)))) {
						u.disabled(true);
					} else if (u.hasOwnProperty('attachTo') && !u.weaponAttachment && (!fa.hasOwnProperty(u.attachTo) || (fa.hasOwnProperty(u.id) && fa[u.id] >= fa[u.attachTo]))) {
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

		var _unitAttachmentLocator = function(unit, unitNotAllowed) {

			var toAttach = undefined;
			var entries = ko.unwrap(self.unitEntriesFlattened);

			if (unitNotAllowed) {
				var idx = entries.indexOf(unitNotAllowed);
				entries = $.merge(
					entries.slice(idx + 1),
					entries.slice(0, idx)
				);
			}

			if (unit.type & UnitType.WARJACK) {

				toAttach = ko.utils.arrayFirst(entries, function(e) {
					return (e.type & UnitType.WARCASTER) || e.battlegroupWarjacks || e.jackMarshal;
				});

			} else if (unit.type & UnitType.WARBEAST) {
				
				toAttach = ko.utils.arrayFirst(entries, function(e) {
					return (e.type & UnitType.WARLOCK) || e.battlegroupWarbeasts;
				});

			} else if (unit.hasOwnProperty('attachToType')) {

				toAttach = ko.utils.arrayFirst(entries, function(e) {
					return e.type & unit.attachToType;
				});

			} else if (unit.hasOwnProperty('attachTo')) {
				
				toAttach = ko.utils.arrayFirst(entries, function(e) {
					
					var attachmentsOfSameType = ko.utils.arrayFilter(ko.unwrap(e.attachments), function(a) {
						return unit.id === a.id;
					});

					if (unit.weaponAttachment) {
						return e.id === unit.attachTo && attachmentsOfSameType.length < 3;
					} else {
						return e.id === unit.attachTo && attachmentsOfSameType.length === 0;
					}

				});

			}

			return toAttach;

		};

		var _unitAdd = function(unit, unitSize) {

			if (!unit || unit.disabled()) {
				return;
			}

			var unitEntry = new WMUnitEntry(unit, unitSize);
			var toAttach = _unitAttachmentLocator(unit);

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
			values.sort(Utils.sortByKey('title'));
			ko.utils.arrayPushAll(arr, values);

		};

		var _shortenFactionName = function(factionName) {
			var split = factionName.split(' ');
			if (split.length === 1 || split.length === 2) {
				return split[0];
			} else if (split.length === 3) {
				return split[0].substr(0, 1).toUpperCase() + split[1].substr(0, 1).toLowerCase() + split[2].substr(0, 1).toUpperCase();
			} else {
				return factionName.substr(0, 7);
			}
		};

		self.name = ko.observable(_shortenFactionName(_faction.factionName) + ' ' + _points.points + 'pts');
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
		var _updateTotal = function(unit) {

			var total = 0;

			if (unit.points) {
				total += unit.points;
			}

			$.each(ko.unwrap(unit.attachments), function(i, a) {
				total += _updateTotal(a);
			});

			return total;

		};

		self.pointsRemaining = ko.pureComputed(function() {
			var total = 0 + _points.points;

			var casters = $.merge([], ko.unwrap(_unitEntries[UnitType.WARCASTER])|| []);
			casters = $.merge(casters, (ko.unwrap(_unitEntries[UnitType.WARLOCK]) || []));

			$.each(casters, function(i, caster) {
				var bonus = Number.parseInt(caster.points, 10);

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
				total -= _updateTotal(u);
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

		self.unitEntriesFlattened = ko.pureComputed(function() {

			var selected = ko.unwrap(self.unitsSelected);
			var output = [];

			$.each(selected, function(i, e) {
				_unitEntryRecurse(output, e);
			});

			return output;

		});

		// public methods

		self.allowUnitMove = function(unitEntry, unitAttachment) {
			var toAttach = _unitAttachmentLocator(unitAttachment, unitEntry);
			return toAttach ? true : false;
		};

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

		self.unitMove = function(unitEntry, unitAttachment) {
			var entries = ko.unwrap(self.unitEntriesFlattened);
			var toAttach = _unitAttachmentLocator(unitAttachment, unitEntry);
			if (toAttach) {
				unitEntry.remove(unitAttachment);
				toAttach.attach(unitAttachment);
				_enableDisableUnits();
			}
		};

		self.unitRemove = function(unitEntry) {
			_unitEntries[unitEntry.type].remove(unitEntry);
			_enableDisableUnits();
		};

		self.unitRemoveAll = function() {
			for(var key in _unitEntries) {
				_unitEntries[key].removeAll();
			}
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

		self.imageDisplay = (function() {

			var pageSize = 2;
			var current = ko.observable(0);
			var images = ko.observableArray();

			var clear = function() {
				images.removeAll();
				current(0);
				document.body.classList.remove('overflow-hidden');
			};

			var hasPreviousPage = ko.pureComputed(function() {

				var i = ko.unwrap(images).length;
				var c = ko.unwrap(current);

				if (i === 0) {
					return false;
				} else {
					return c > 1;
				}

			});

			var hasNextPage = ko.pureComputed(function() {
				var i = ko.unwrap(images).length;
				var c = ko.unwrap(current);
				return (i / pageSize) !== c;
			});

			var pages = ko.pureComputed(function() {

				var c = ko.unwrap(current);
				var i = ko.unwrap(images);

				if (c === 0) {
					return [];
				}

				var start = (c - 1) * pageSize;
				return i.slice(start, start + pageSize);

			});

			var previous = function() {
				current(current() - 1);
			};

			var next = function() {
				current(current() + 1);
			};

			var update = function(unitImages) {
				current(1);
				Utils.arrayPushAndNotify(images, unitImages, true);
				document.body.classList.add('overflow-hidden');
			};

			return {
				clear: clear,
				hasNextPage: hasNextPage,
				hasPreviousPage : hasPreviousPage,
				next: next,
				pages: pages,
				previous: previous,
				update: update
			};

		})();

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
			listNew: ko.observable(false),
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
			self.listCancel();

		};

		self.listAdd = function() {
			self.selected.listNew(true);
			self.selected.faction(undefined);
			self.selected.points(undefined);
		};

		self.listCancel = function() {
			self.selected.listNew(false);
			self.selected.faction(undefined);
			self.selected.points(undefined);
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

			var lists = ko.unwrap(self.lookups.lists);
			if (lists.length > 0) {
				self.selected.list(lists[lists.length - 1]);
			} else {
				self.listAdd();
			}

		};

		self.listRequired = ko.pureComputed(function() {

			var lists = ko.unwrap(self.lookups.lists);
			return lists.length === 0;

		});

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

			self.imageDisplay.update(unit.images);

		};

		self.unitDisplayClear = function() {
			self.imageDisplay.clear();
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

					factions.sort(Utils.sortByKey('factionName'));
					Utils.arrayPushAndNotify(self.lookups.factions, factions, true);
					self.listAdd();

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