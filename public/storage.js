/**
 * Copyright: (c) 2016 Max Klein
 * License: MIT
 */

(function (window, document) {
	'use strict';

	var parentWindow = window.parent;
	if(parentWindow === window) {
		console.error('This has to be loaded in an iframe');
		return;
	}

	var params = {};
	window.location.search.substr(1).split('&').forEach(function (part) {
		var parts = part.split('=');
		params[parts[0]] = parts[1] && decodeURIComponent(parts[1]);
	});

	var storageKey = params['name'];
	if(!storageKey) {
		console.error('No name parameter provided');
		return;
	}

	window.addEventListener('message', function (evt) {
		var origin = evt.origin || evt.originalEvent.origin;
		var source = evt.source;
		var data = evt.data;

		if(typeof data !== 'object') return;

		var type = data.type;

		if(type === 'actions') {
			var str = localStorage.getItem(storageKey);
			var storage;
			if(str === null) {
				storage = {};
			} else {
				try {
					storage = JSON.parse(str);
				} catch(e) {
					console.error(e);
					storage = {};
				}
			}

			var actions = data.actions;
			for(var i = 0; i < actions.length; i++) {
				var action = actions[i];
				var actionType = action[0];

				if(actionType === 'set') {
					storage[action[1]] = action[2];
				} else if(actionType === 'add') {
					var amount = action[2];
					if(typeof amount === 'number') {
						var property = action[1];
						var value = +storage[property];
						if(typeof value === 'number' && !isNaN(value)) {
							value += amount;
						} else {
							value = amount;
						}
						storage[property] = value;
					}
				} else if(actionType === 'query') {
					var result = {};
					var properties = action[2];
					for(var j = 0; j < properties.length; j++) {
						result[properties[j]] = storage[properties[j]];
					}
					source.postMessage({
						type: 'query result',
						queryId: action[1],
						result: result
					}, '*');
				}
			}

			try {
				str = JSON.stringify(storage);
			} catch(e) {
				console.error(e);
				str = '{}';
			}
			localStorage.setItem(storageKey, str);
		}
	});

	parentWindow.postMessage({
		type: 'storage ready'
	}, '*');
})(window, document);
