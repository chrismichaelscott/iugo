/**
 * Author Chris Scott <chris.scott@factmint.com>
 * Delivered with and licensed under the MIT licence
 */
// This initializer swaps ${var} for <spans> with attributes for use with the VC below
$iugo.$internals.MVVC.prototype.initializers.push(function(view) {
	var regex = /(>[^<$]*)\$\{([^.}<]+)\.?([^}<]*)\}([^<]*<)/g;
	while (view.innerHTML.match(regex)) {
		view.innerHTML = view.innerHTML.replace(regex, '$1<span class="bindto-$2" data-bind_key="$3"></span>$4');
	}
	// This regex may be useable as an attribute replacement - this is currently not supported by the default view-controller and is possibly counter to the lightweight approach of this MVVC environment.
	//view.innerHTML = view.innerHTML.replace(/(<[^><]*) ([^ =]+)="\$\{([^.}]+)\.?([^}]*)\}"([^><]*>)/g, '$1 data-iugo_bind_attribute_name="$2" data-iugo_bind_attribute_value="$3" data-iugo_bind_attribute_path="$4" $5');
});
// This VC binds values to the DOM tree, when a class "bindto-property" is applied
$iugo.$internals.MVVC.prototype.defaultViewcontrollers.push(function(property, value, view, path) {
	var attributeRegex = /\$\{([^}]+)\}/g;
	
	function process(value, view, path) {
		if (view.hasAttribute('data-bind_attribute')) {
			var attributes = view.getAttribute('data-bind_attribute').split(" ");
			for (var x = 0; x < attributes.length; x++) {
				var attribute = attributes[x];
				if (!view.hasAttribute('data-iugo_original_' + attribute)) {
					view.setAttribute('data-iugo_original_' + attribute, view.getAttribute(attribute));
				}
				
				var template = view.getAttribute('data-iugo_original_' + attribute);
				var compiledAttribute = template.replace(attributeRegex, function(match, address) {			
					var source = address.split('.');
					var workingValue = value;
					for (var x = 0; x < source.length; x++) {
						workingValue = workingValue[source[x]];
					}
					return workingValue;
				});
				view.setAttribute(attribute, compiledAttribute);
			}
		}
		if (value instanceof Array) {
			var numberOfChildren = view.children.length;
			for (var x = 0; x < numberOfChildren; x++) {
				var elementView;
				if (view.children[x].hasAttribute('data-bind_each')) {
					elementView = view.children[x];
				} else {
					continue;
				}
				
				if (value.length == 0) {
					elementView.setAttribute("data-iugo_display", elementView.style.display);
					elementView.style.display = "none";
				} else {
					elementView.style.display = elementView.getAttribute("data-iugo_display");
				}
				
				for (var y = 0; y < value.length; y++) {
					if (y >= 1) {
						elementView = elementView.cloneNode(true);
						elementView.className = elementView.className + " iugo_cloned";
						view.appendChild(elementView);
					}
					process(value[y], elementView);
				}
			}
		} else if (value instanceof Object) {
			var attribute = view.getAttribute('data-bind_key');
			if (attribute != null && attribute != "") {
				if (path == null) {
					path = "";
				} else {
					path += ".";
				}
				var nextPath = attribute.slice(path.length).split('.')[0];
				
				process(value[nextPath], view, path + nextPath);
			}
			for (var x = 0; x < view.children.length; x++) {
				process(value, view.children[x], path);
			}
		} else {
			if (view.tagName == "INPUT") {
				view.value = value;
			} else {
				view.innerHTML = value;
			}
		}
	}
	
	var elements = view.getElementsByClassName("bindto-" + property);
	for (var x = 0; x < elements.length; x++ ) {
		var clones = elements[x].getElementsByClassName("iugo_cloned");
		// Move the count to a primitive as we are removing from the array itself!
		var numberOfClones = clones.length;
		for (var y = 0; y < numberOfClones; y++) {
			// Likewise, always remove the first element - as in an unset
			clones[0].parentNode.removeChild(clones[0]);
		}
		process(value, elements[x]);
	}
});