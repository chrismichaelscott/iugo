// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name default.js
// @language ECMASCRIPT5
// ==/ClosureCompiler==

/**
 * Author Chris Scott <chris.scott@factmint.com>
 * Delivered with and licensed under the MIT licence
 */
window['$iugo'] = {};
$iugo.$internals = {};

$iugo.$internals.applyDeepGettersAndSetters = function(value, mvvc, path) {
	if (value instanceof Object || value instanceof Array) {
		for (var childProperty in value) {
			if (value.hasOwnProperty(childProperty)) {
				$iugo.$internals.applySetters(mvvc, value, childProperty, path.concat([childProperty]));
			}
		}
	}
	if (value instanceof Array) {
		$iugo.$internals.registerArray(value, mvvc, path);
	}
};


$iugo.$internals.setValue = function(value, mvvc, path, parent, property) {
	if (window['Promise'] && value instanceof Promise) {
		value.then(function(result) {
			parent[property] = result;
		});
	} else {
		mvvc.$[path.join('.')] = value;
		
		$iugo.$internals.applyDeepGettersAndSetters(value, mvvc, path);
	}
};


/**
 * Apply traverse the model looking for members to apply setters to
 * the setters are applied in a different method in order to create a closure
 */
$iugo.$internals.applySetters = function(mvvc, object, property, path) {
	
	$iugo.$internals.setValue(object[property], mvvc, path, object, property);
	
	Object.defineProperty(object, property, {
		get: function() {
			return mvvc.$[path.join('.')];
		},
		set: function(value) {
			$iugo.$internals.setValue(value, mvvc, path, object, property);
		
			mvvc.updateView(path);
		}
	});
};

/**
 * The array itself already has a setter (so changing it for another array will update the view)
 * however the element arr[n+1] will not have a setter to adding a new element will not trigger an update to the view
 * NB. the case where one adds the element arr[n+m] : m > 1, there will still be no update to the model - without adding setters blindly this will probably be a limitation that I have to live with. CMS
 */
$iugo.$internals.registerArray = function(arr, mvvc, path) {
	// Override the default mutating array methods to trigger model updates after mutation
	arr.push = function() {
		var retVal = Array.prototype.push.apply(this, arguments);
		mvvc.model[path[0]] = mvvc.model[path[0]];
		return retVal;
	}
	arr.pop = function() {
		// The return value must be cloned or it will be linked to arr[n] - which will change after the pop
		var retVal = $iugo.$internals.clone(Array.prototype.pop.call(arr));
		mvvc.model[path[0]] = mvvc.model[path[0]];
		return retVal;
	}
	arr.unshift = function() {
		// It is essencial to clone the array, otherwise - as the getter is used - the n+1 index is always set to n
		var holdingArray = $iugo.$internals.clone(this);
		var index = 0;
		for (; index < arguments.length; index++) {
			this[index] = arguments[index];
		}
		for (var x = 0; x < holdingArray.length; x++) {
			this[index++] = holdingArray[x];
		}
		mvvc.model[path[0]] = mvvc.model[path[0]];
		return this.length;
	}
	arr.shift = function() {
		// The return value must be cloned or it will be linked to arr[0] - which will change after the shift
		var retVal = $iugo.$internals.clone(Array.prototype.shift.call(this));
		mvvc.model[path[0]] = mvvc.model[path[0]];
		return retVal;
	}
	arr.reverse = function() {
		// It is essencial to clone the array, otherwise - as the getter is used - the reverse process for length 3 takes arr[2] and puts it in arr[0], leaves arr[1], then moves arr[2] (by pointer from arr[0]) back onto arr[2]
		var holdingArray = $iugo.$internals.clone(this);
		for (var x = 0; x < this.length; x++) {
			this[x] = holdingArray[this.length - 1 - x];
		}
		mvvc.model[path[0]] = mvvc.model[path[0]];
		return this;
	}
	arr.sort = function() {
		// It is essencial to clone the array, otherwise - as the getter is used - setting an index "n" alters the value of "n-1"
		var holdingArray = $iugo.$internals.clone(this);
		Array.prototype.sort.apply(holdingArray, arguments);
		for (var x = 0; x < this.length; x++) {
			this[x] = holdingArray[x];
		}
		mvvc.model[path[0]] = mvvc.model[path[0]];
		return this;
	}
	arr.splice = function() {
		// It is essencial to clone the array or the getters will be out of sync as the splice is executed
		var holdingArray = $iugo.$internals.clone(this);
		var index = 0;
		for (; index < holdingArray.length, index < arguments[0]; index++) {
			this[index] = holdingArray[index];
		}
		for (var x = 2; x < arguments.length; x++) {
			this[index++] = arguments[x];
		}
		for (var x = (arguments[0] + arguments[1]); x < holdingArray.length; x++) {
			this[index++] = holdingArray[x];
		}
		for (var x = index; x < holdingArray.length; x++) {
			this.pop();
		}
		mvvc.model[path[0]] = mvvc.model[path[0]];
		return this;
	}
};


/**
 * A simple deep clone method.
 * There are multiple cases where using an object by reference causes infinite recursion due to the setters
 */
$iugo.$internals.clone = function(obj) {
	var clone;
	if (obj instanceof Array) {
		clone = [];
	} else {
		clone = {};
	}
	for (var i in obj) {
		if(obj[i] instanceof Object || obj[i] instanceof Array)
			clone[i] = $iugo.$internals.clone(obj[i]);
		else
			clone[i] = obj[i];
	}
	return clone;
};


/**
 * Main MVVC constructor
 * NB. this is aliased by the Iugo Function
 */
$iugo.$internals.MVVC = function(model, scope) {
	this.store = {};
	this.scope = (scope) ? scope : document.body;
	
	this.controller = {};
	this.viewcontroller = {};
	
	for (var x = 0; x < this.initializers.length; x++ ) {
		if (this.initializers[x] instanceof Function) {
			this.initializers[x](this);
		}
	}
    
    // The "Dollar" field holds references to all members and sub-members of the model, without any getters or setters
    this.$ = {};
	// Lastly set the model
	$iugo.$internals.applySetters(this, this, 'model', []);
	this.model = model;
	
	this.updateView([]);
};


$iugo.$internals.MVVC.prototype = {
    // Trigger the view to update
    updateView: function(path) {
		for (var x = 0; x < this.defaultViewcontrollers.length; x++) {
			if (this.defaultViewcontrollers[x] instanceof Function) {
				this.defaultViewcontrollers[x](this, path);
			}
		}
		if (typeof(this.viewcontroller) !== 'undefined' && this.viewcontroller instanceof Function) {
			this.viewcontroller(this, path);
		}
    },
    
    // The deafultViewcontrollers and initializers are added as plugins
    "defaultViewcontrollers": [],
    "initializers": []
};


// Make the API available to plugins
$iugo["defaultViewcontrollers"] = $iugo.$internals.MVVC.prototype.defaultViewcontrollers;
$iugo["initializers"] = $iugo.$internals.MVVC.prototype.initializers;


/*
 * This is the "public" view on the framework
 *
 * Usage:
 *		var product = new Iugo({
 *			skuNumber: 0,
 *			manufacturer: {
 *				name: "Default Manufacturer",
 *				code: "001",
 *				vatNumber: ""
 *			},
 *			productName: "",
 *			description,
 *			stockests: []
 *		});
 *
 *		product.productName = "Foo";
 *
 * By default the view is document.body, but any part of the DOM tree can be used
 * 
 * The viewcontroller is an associative array which mirrors the top-level members of the model,
 * for each member, the viewcontroller hold a function which will be executed upon update.
 * By default this is an empty object which leaves processing to pluigns via the defaultViewcontroller stack
 */
window["Iugo"] = function(model, scope) {
    return new $iugo.$internals.MVVC(model, scope);
};
// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @output_file_name default.js
// @language ECMASCRIPT5
// ==/ClosureCompiler==

/** 
 * Note on minification: 
 *	the plugin name ("bind_to_dom") can be replaced by an abbreviation ("BD", for example) by find-and-replace, post compile
 */

/**
 * Author Chris Scott <chris.scott@factmint.com>
 * Delivered with and licensed under the MIT licence
 */
// This initializer swaps ${var} for <spans> with attributes for use with the VC below
$iugo['initializers'].push(function(mvvc) {
	mvvc.store.tags = {};
	mvvc.store.namespacedTagIndex = {};
	mvvc.store.idCounter = 0;
	
	var innerHTMLRegex = /(>[^<]*)\{\{([^}<]*)\}\}([^<]*<)/g;
	// it is important to repeat the regex as it will only match one ${var} per tag innerHTML
	while (mvvc.scope.innerHTML.match(innerHTMLRegex)) {
		mvvc.scope.innerHTML = mvvc.scope.innerHTML.replace(innerHTMLRegex, function(m, before, address, after) {
			var replacement = before + '<span ';
			
			replacement += 'data-bind="' + address + '"></span>' + after;
			
			return replacement;
		});
	}
	
	// First find tags that use a variable syntax in an attribute
	var tagRegex = /<[^>]+ [^ =]+="[^"]*\{\{[^}<"]+\}\}[^"]*"[^>]*>/g;
	mvvc.scope.innerHTML = mvvc.scope.innerHTML.replace(tagRegex, function(tag) {
		var tagId = mvvc.store.idCounter++;
		
		mvvc.store.tags[tagId] = {
			bindAttributes: [],
			attributeTemplates: {},
			replacements: {}
		};
		
		// Look for each attribute that uses a variable syntax...
		var attributeRegex = /([^ =]+)="([^"]*\{\{[^}"]+\}\}[^"]*)"/g;
		tag = tag.replace(attributeRegex, function(attribute, attributeName, attributeValue) {
			// If the attribute name begins with "data-iugo_alias-" then drop that prefix
			if (attributeName.substr(0, 16) == "data-iugo_alias-") {
				attributeName = attributeName.substr(16);
			}
			// add the attibute name to the bind attibute list (which will be processed at runtime)...
			mvvc.store.tags[tagId].bindAttributes.push(attributeName);
			// and store the template used as the attibute value
			mvvc.store.tags[tagId].attributeTemplates[attributeName] = attributeValue;
			
			// Check whether the value is namespaced
			var namespaceRegex = /\{\{([^"}:]+):[^}"]+\}\}/g;
			attributeValue.replace(namespaceRegex, function(m, namespace) {
				// Create a metadata store for the property
				if (! mvvc.store.namespacedTagIndex[namespace]) {
					mvvc.store.namespacedTagIndex[namespace] = [];
				}
				// Record that changes to the namespace will need to recompile this tag
				if (mvvc.store.namespacedTagIndex[namespace].indexOf(tagId) == -1) {
					mvvc.store.namespacedTagIndex[namespace].push(tagId);
				}
			});
			
			// finally, return an empty value for the attribute
			return attributeName + '=""';
		});
		
		tag = tag.replace(/ ?>$/, ' data-iugo_id="' + tagId + '">');
		return tag;
	});
});

// This VC binds values to the DOM tree, when a "data-bind" property is applied
$iugo['defaultViewcontrollers'].push(function(mvvc, change) {
	var attributeRegex = /\{\{([^:}]+:)?([^}]+)\}\}/g;
	
	function compileTagAttributes(tagId) {
		var tag = document.querySelector('[data-iugo_id="' + tagId + '"]');
		
		var attributes = mvvc.store.tags[tagId].bindAttributes;
		
		for (var x = 0; x < attributes.length; x++) {
			var template = mvvc.store.tags[tagId].attributeTemplates[attributes[x]];
			
			var compiledAttribute = template.replace(attributeRegex, function(match) {
				return (mvvc.store.tags[tagId].replacements[match]) ?
					mvvc.store.tags[tagId].replacements[match] :
					"";
			});
			
			tag.setAttribute(attributes[x], compiledAttribute);
		}
	}
	
	function updateTagReplacements(value, node) {
		if (node.hasAttribute('data-iugo_id')) {
			var tagId = node.getAttribute('data-iugo_id');
			
			var updateTagIndex = function(match, namespace, address) {
				var workingValue = null;
				if (namespace) {
					workingValue = mvvc.model[namespace.substr(0, namespace.length - 1)];
				} else {
					workingValue = value;
				}
				
				var source = address.split('.');
				for (var x = 0; x < source.length; x++) {
					if (source[x] === "") continue;
					if (workingValue[source[x]]) {
						workingValue = workingValue[source[x]];
					} else {
						throw 'bad bind address';
					}
				}
				mvvc.store.tags[tagId].replacements[match] = workingValue;
			};
	
			var attributes = mvvc.store.tags[tagId].bindAttributes;
			for (var x = 0; x < attributes.length; x++) {
				var attribute = attributes[x];
				
				// Add the variables to the store with their latest values
				var template = mvvc.store.tags[tagId].attributeTemplates[attribute];
				template.replace(attributeRegex, updateTagIndex);
			}
			
			compileTagAttributes(tagId);
		}
	}
	
	function cloneTagIndex(node) {
		var oldId = node.getAttribute("data-iugo_id");
		var newId = mvvc.store.idCounter++;
		
		var oldIndex = mvvc.store.tags[oldId];
		mvvc.store.tags[newId] = {
			bindAttributes: oldIndex.bindAttributes,
			attributeTemplates: oldIndex.attributeTemplates,
			replacements: {}
		};
		
		node.setAttribute("data-iugo_id", newId);
	}
	
	/**
	 * Recursively scan the given node looking for replacements to variables and
	 * marked tag's innerHTML.
	 * 
	 * The path argument tracks the deep recursion and is used to fill relative addresses
	 */
	function process(value, node) {
		
		// Is the node bound to the model?
		var bindKey = node.getAttribute('data-bind');
		
		if (bindKey) {
		
			var namespaceEnd = bindKey.indexOf(':');
			if (namespaceEnd > 0) {
				value = mvvc.model[bindKey.substr(0, namespaceEnd)];
				bindKey = bindKey.substr(namespaceEnd + 1);
			}
		
			try {
				var entryPoint = mvvc.store.domEntrypoints;
				
				bindKey.split('.').forEach(function(addressSegment) {
					if (addressSegment !== '') {
						if (value[addressSegment]) {
							value = value[addressSegment];
						} else {
							throw 'bad bind address';
						}
					}
				});
			} catch (exception) {
				return;
			}
		}
		
		var condition = node.getAttribute('data-if');
		if (condition) {
			var test = mvvc.controller[condition];
			if (test && test instanceof Function) {
				if (! test.call(node, value, mvvc)) {
					if (! node.hasAttribute('data-iugo_olddisplay')) {
						node.setAttribute('data-iugo_olddisplay', node.style.display);
					}
					
					node.style.display = 'none';
					return;
				} else {
					var oldDisplay = node.getAttribute('data-iugo_olddisplay');
					if (oldDisplay) {
						node.style.display = oldDisplay;
					} else {
						node.style.display = '';
					}
				}
			}
		}
		
		updateTagReplacements(value, node);
		
		// Recurse the DOM looking for substitutions
		if (value instanceof Array) {
			var numberOfChildren = node.children.length;
			for (var x = numberOfChildren - 1; x >= 0; x--) {
				if (node.children[x].classList.contains('iugo_cloned')) {
					node.removeChild(node.children[x]);
				}
			}
			numberOfChildren = node.children.length;
			for (var x = 0; x < numberOfChildren; x++) {
				var elementView;
				if (node.children[x].hasAttribute('data-each')) {
					elementView = node.children[x];
				} else {
					continue;
				}
				
				if (value.length === 0) {
					elementView.setAttribute("data-iugo_display", elementView.style.display);
					elementView.style.display = "none";
				} else {
					elementView.style.display = elementView.getAttribute("data-iugo_display");
				}
				
				for (var y = 0; y < value.length; y++) {
					var duplicateElement;
					if (y >= 1) {
						duplicateElement = elementView.cloneNode(true);
						duplicateElement.classList.add("iugo_cloned");
						
						// Look for cloned elements further down the hierarchy which have attributes with variables...
						// ...and unlink from the clone-template's ID
						if (duplicateElement.hasAttribute("data-iugo_id")) {
							cloneTagIndex(duplicateElement);
						}
						var clonedTagsWithAttributeReplacements = duplicateElement.querySelectorAll('[data-iugo_id]');
						for (var z = 0; z < clonedTagsWithAttributeReplacements.length; z++) {
							cloneTagIndex(clonedTagsWithAttributeReplacements[z]);
						}
						
						node.appendChild(duplicateElement);
					} else {
						duplicateElement = elementView;
					}
					process(value[y], duplicateElement);
				}
			}
		} else {
			if (node.children.length > 0) {
				for (var x = 0; x < node.children.length; x++) {
					process(value, node.children[x]);
				}
			} else if (! (value instanceof Object)) {
				if (node.tagName == "INPUT") {
					node.value = value;
				} else {
					node.innerHTML = value;
				}
			}
		}
	}
	
	console.log(change);
	
	process(mvvc.model, mvvc.scope);
});

// This initializer sets up event listening
$iugo['initializers'].push(function(mvvc) {
	
	// bubbling events
	[
		'click',
		'contextmenu',
		'hoverin', 'hoverout',
		'focus', 'blur',
		'change'
	].forEach(function(eventName) {
		mvvc.scope[getRealEvent(eventName)] = passEventToController(eventName, mvvc);
	});
	
});

function getRealEvent(name) {
	if (name == 'hoverin') name = 'mouseover';
	if (name == 'hoverout') name = 'mouseout';
	return 'on' + name;
}

function nodeToPath(node) {
	var path = [];
	for (; node; node = node.parentNode) {
		path.push(node);
	}
	
	return path;
}

function getPathFromSplit(main, fork) {
	var path = null;
	
	var eventPath = nodeToPath(main);
	
	for (; fork; fork = fork.parentNode) {
		for (var eventPathIndex = 0; eventPathIndex < eventPath.length; eventPathIndex++) {
			if (fork.isEqualNode(eventPath[eventPathIndex])) {
				path = [];
				
				for (var sharedPathIndex = 0; sharedPathIndex < eventPathIndex; sharedPathIndex++) {
					path[sharedPathIndex] = eventPath[sharedPathIndex];
				}
				
				break;
			}
		}
		
		if (path) break;
	}
	
	return path;
}

function passEventToController(eventName, mvvc, bubble) {
	return function(event) {

		var path = null;
		if (eventName == 'hoverin' || eventName == 'hoverout') {
			path = getPathFromSplit(event.target, event.relatedTarget);
		} else if (eventName == 'click') {
			path = (event.path) ? event.path : nodeToPath(event.target);
		} else {
			path = event.target;
		}
		
		if (path) for (var pathIndex = 0; pathIndex < path.length; pathIndex++) {
			var target = path[pathIndex];
			
			if (target.isEqualNode(this)) {
				break;
			}
			
			var handler = target.getAttribute('data-' + eventName);
			if (handler && mvvc.controller[handler] instanceof Function) {
				mvvc.controller[handler].call(target, event, mvvc);
				return false;
			}
		}
		
		return true;
	};
}
window["Iugo"]["http"] = {
	get: function(url, processor, username, password) {
		return this.xhr('get', url, undefined, {}, username, password);
	},
	xhr: function(method, url, body, processor, headers, username, password) {
		if (window['Promise']) {
			return new Promise(function(resolve, reject) {
				var request = new XMLHttpRequest();
				request.onload = function() {
					if (this.status >= 200 && this.status < 300) {
						if (processor instanceof Function) {
							resolve(processor(this.responseText));
						} else if (this.getResponseHeader('content-type') == "application/json") {
							resolve(JSON.parse(this.responseText));	
						} else {
							resolve(this.responseText);
						}
					} else {
						reject(this);
					}
				};
				request.onerror = request.onabort = function() {
					reject(this);
				};
				
				request.open(method, url, true, username, password);
				
				for (var header in headers) {
					if (headers.hasOwnProperty(header)) {
						request.setRequestHeader(header, headers[header]);
					}
				}
				
				request.send(body);
			});
		} else {
			console.log('To use the HTTP extension, load a Promise polyfill')
		}
	}
}