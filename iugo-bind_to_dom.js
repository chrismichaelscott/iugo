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
	
	var innerHTMLRegex = /(>[^<]*)\{\{([^:.}<]+:)?([^}<]*)\}\}([^<]*<)/g;
	// it is important to repeat the regex as it will only match one ${var} per tag innerHTML
	while (mvvc.scope.innerHTML.match(innerHTMLRegex)) {
		mvvc.scope.innerHTML = mvvc.scope.innerHTML.replace(innerHTMLRegex, function(m, before, namespace, address, after) {
			var replacement = before + '<span ';
			if (namespace) {
				replacement += 'class="bindto-' + namespace.substr(0, (namespace.length - 1)) + '" ';
			}
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
// This VC binds values to the DOM tree, when a class "bindto-property" is applied
$iugo['defaultViewcontrollers'].push(function(property, value, scope, store) {
	var attributeRegex = /\{\{([^:}]+:)?([^}]+)\}\}/g;
	
	function compileTagAttributes(tagId) {
		var tag = document.querySelector('[data-iugo_id="' + tagId + '"]');
		
		var attributes = store.tags[tagId].bindAttributes;
		
		for (var x = 0; x < attributes.length; x++) {
			var template = store.tags[tagId].attributeTemplates[attributes[x]];
			
			var compiledAttribute = template.replace(attributeRegex, function(match) {
				return (store.tags[tagId].replacements[match]) ?
					store.tags[tagId].replacements[match] :
					"";
			});
			
			tag.setAttribute(attributes[x], compiledAttribute);
		}
	}
	
	function updateTagReplacements(value, node, property) {
		if (node.hasAttribute('data-iugo_id')) {
			var tagId = node.getAttribute('data-iugo_id');
			
			var updateTagIndex = function(match, namespace, address) {			
				if ((!namespace && !property) || (namespace && namespace.substr(0, namespace.length - 1) == property)) {
					var source = address.split('.');
					var workingValue = value;
					for (var x = 0; x < source.length; x++) {
						if (source[x] === "") continue;
						
						workingValue = workingValue[source[x]];
					}
					store.tags[tagId].replacements[match] = workingValue;
				}
			};
	
			var attributes = store.tags[tagId].bindAttributes;
			for (var x = 0; x < attributes.length; x++) {
				var attribute = attributes[x];
				
				// Add the variables to the store with their latest values
				var template = store.tags[tagId].attributeTemplates[attribute];
				template.replace(attributeRegex, updateTagIndex);
			}
			
			compileTagAttributes(tagId);
		}
	}
	
	function cloneTagIndex(node) {
		var oldId = node.getAttribute("data-iugo_id");
		var newId = store.idCounter++;
		
		var oldIndex = store.tags[oldId];
		store.tags[newId] = {
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
		// Update the replacements for a tag marked with an iugo_id
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
		} else if (value instanceof Object) {
			var bindKey = node.getAttribute('data-path');
			if (bindKey != null && bindKey !== "") {
				if (path == null) {
					path = "";
				} else {
					path += ".";
				}
				var nextPath = bindKey.slice(path.length).split('.')[0];
				
				process(value[nextPath], node, path + nextPath);
			} else {
				for (var x = 0; x < node.children.length; x++) {
					// it is possible to use a bindto-XXX class in a sub-element of an already bound element
					// in that case we want to skip the DOM descent from the parent and wait until the child has its own binding iteration
					if (! node.children[x].className.match("bindto-")) {
						process(value, node.children[x], path);
					}
				}
			}
		} else {
			if (node.children.length > 0) {
				for (var x = 0; x < node.children.length; x++) {
					process(value, node.children[x], path);
				}
			} else {
				if (node.tagName == "INPUT") {
					node.value = value;
				} else {
					node.innerHTML = value;
				}
			}
		}
	}
	
	// Look for elements with a generated iugo id for processing
	if (store.namespacedTagIndex[property]) {
		var idList = store.namespacedTagIndex[property];
		for (var x = 0; x < idList.length; x++) {
			var elements = scope.querySelectorAll('[data-iugo_id="' + idList[x] + '"]');
			
			for (var y = 0; y < elements.length; y++ ) {
				// Update the replacements for a tag marked with an iugo_id
				updateTagReplacements(value, elements[y], property);
			}
		}
	}
	
	// Look for elements with a bindto-XXX class for processing
	var boundNodes = scope.getElementsByClassName("bindto-" + property);
	for (var x = 0; x < boundNodes.length; x++ ) {
		process(value, boundNodes[x]);
	}
});
