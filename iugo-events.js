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
				mvvc.controller[handler].call(target, mvvc, event);
				return false;
			}
		}
		
		return true;
	};
}