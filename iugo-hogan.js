// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @output_file_name default.js
// @language ECMASCRIPT5
// ==/ClosureCompiler==

/**
 * Author Chris Scott <chris.scott@factmint.com>
 * Delivered with and licensed under the MIT licence
 */
// This initializer compiles innerHTML (mustache templates) with Hogan
$iugo['initializers'].push(function(view, store) {

	var templateNodes = view.querySelectorAll('[data-bindto]');
	
	for (var nodeNumber = 0; nodeNumber < templateNodes.length; nodeNumber++) {
		var node = templateNodes[nodeNumber];
		
		var key = node.getAttribute('data-bindto');
		if (! key) {
			throw 'BINDING ERROR: attribute "data-bindto" must be set to a key from the model';
		}
		
		if (! store[key]) {
			store[key] = [];
		}
		
		store[key].push({
			node: node,
			template: Hogan.compile(node.innerHTML)
		});
	}
});
// This VC renders Hogan templates
$iugo['defaultViewcontrollers'].push(function(property, value, view, store) {
	var partials = store[property];
	
	if (partials) {
		for (var partialNumber = 0; partialNumber < partials.length; partialNumber++) {
			var partial = partials[partialNumber];
			
			partial.node.innerHTML = partial.template.render(value);
		}
	}
});
