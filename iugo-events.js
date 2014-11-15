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

function getPathFromSplit(eventPath, fork) {
	var path = null;
	
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
		if (eventName == 'hoverin') {
			path = getPathFromSplit(event.path, event.fromElement);
		} else if (eventName == 'hoverout') {
			path = getPathFromSplit(event.path, event.toElement);
		} else if (eventName == 'click') {
			path = event.path;
		} else {
			path = [event.path[0]];
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