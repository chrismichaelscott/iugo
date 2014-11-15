window["Iugo"].http = {
	get: function(url, processor, username, password) {
		return this.xhr('get', url, undefined, {}, username, password);
	},
	xhr: function(method, url, body, processor, headers, username, password) {
		return new Promise(function(resolve, reject) {
			var request = new XMLHttpRequest();
			request.onload = function() {
				if (this.status >= 200 && this.status < 300) {
					if (processor instanceof Function) {
						resolve(processor(this.responseText));
					} else if (this.getResponseHeader('content-type')) {
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
	}
}