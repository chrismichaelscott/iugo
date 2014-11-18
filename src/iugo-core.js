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