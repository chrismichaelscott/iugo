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

	var templateNodes = view.querySelectorAll('script[data-bindto][type="text/x-mustache-template"]');
	
	for (var templateNumber = 0; templateNumber < templateNodes.length; templateNumber++) {
		var template = templateNodes[templateNumber];
		
		var key = template.getAttribute('data-bindto');
		if (! key) {
			throw 'BINDING ERROR: attribute "data-bindto" must be set to a key from the model';
		}
		
		if (! store[key]) {
			store[key] = [];
		}
		
		var node = document.createElement("div");
		node.innerHTML = "<!-- Created by Iugo -->";
		template.parentNode.insertBefore(node, template);

		store[key].push({
			node: node,
			template: Hogan.compile(template.innerHTML)
		});
		
		template.parentNode.removeChild(template);
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
