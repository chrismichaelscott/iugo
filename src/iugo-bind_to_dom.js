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
			
			replacement += 'data-path="' + address + '"></span>' + after;
			
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

// This VC binds values to the DOM tree, when a "data-path" property is applied
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
	function process(value, node, path) {
		
		// Is the node bound to the model?
		var bindKey = node.getAttribute('data-path');
		
		if (bindKey) {
			var namespaceEnd = bindKey.indexOf(':');
			if (namespaceEnd > 0) {
				value = mvvc.model[bindKey.substr(0, namespaceEnd)];
				bindKey = bindKey.substr(namespaceEnd + 1);
			}
		
			try {
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
					node.style.display = 'none';
					return;
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
					process(value[y], duplicateElement, path);
				}
			}
		} else {
			if (node.children.length > 0) {
				for (var x = 0; x < node.children.length; x++) {
					process(value, node.children[x], path);
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
	
	process(mvvc.model, mvvc.scope, '');
	
	/**
	var elementsToProcess = scope.querySelectorAll('[data-path]');
	for (var elementIndex = 0; elementIndex < elementsToProcess.length; elementIndex++) {
		if (elementsToProcess[elementIndex].getAttribute('data-path').substring(0, property.length) == property) {
			try {
				process(value, elementsToProcess[elementIndex], property, true);
			} catch (exception) {
				console.log('ERROR: ' + exception);
			}
		}
	}*/
});
