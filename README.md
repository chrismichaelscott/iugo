# iugo.js

iugo is an extremely lightweight (2KB, minified and gzipped) Javascript MVVC (Model-View-View Controller) framework, used to bind models to the DOM dynamically.

### Why is iugo needed?

There are a number of Javascript MVVC frameworks out there, all with their own pros and cons. iugo focuses on binding one or more data models to a DOM tree. The framework is lightweight and only covers this core functionality - but can be extended in many ways.

In particular, iugo aims to septerate the view (the HTML) from data used to populate it, by allowing HTML developers to treat their markup as a template; much like popular server-side templating languages like Apache Velocity, etc. The rational behind this approach is very similar to the goal of seperating style from HTML, helping one maintain semantic and readable HTML.

One common situation front-end developers might find themselves in is making a call to a webservice, iterating over a JSON response and dynamically adding HTML to the document. With that approach the code may look like this:

HTML:

    <body>
    	<ul class="results"></ul>
    </body>
    
Javascript:

    var list = $('ul.results');
    $.get('http://example.com/endpoint', function(results) {
    	for (var x in results) {
    		$resultNode = $('<li>' + results[x] + '</li>');
    		$resultNode.appendTo(list);
    	}
    });

Looking at this code it is difficult to visualize the DOM and anyone inspecting the DOM would struggle to guess which file had created the HTML. In contrast, the same program written using iugo would look like this:

HTML:

    <body>
    	<ul class="bindto-results">
    		<li data-bind_each></li>
    	</ul>
    </body>

Javascript:

    var model = new iugo({results: []});
    $.get('http://example.com/endpoint', function(results) {
    	model.results = results;
    });

Now the HTML is clear and one can see what it will look like before the Javascript has executed and the Javascript itself does not need to contain ugly HTML clips.

### Installation

The simplest way to get started is to download the iugo.min.js script and include it in your HTML page. If you are using different view-controller plugins from the standard DOM binding then you need to include iugo.min.js and any plugins you want to use. See the wiki for full details.

### Plugins

At its core, iugo is a bubbling event mechanism for changes made to Javascript objects - the model. When the model is changes iugo call each of a collection of view-controller methods from a stack. The default package only contains a plugin which binds the model to a DOM tree. Other plugins can be developed and included to trigger other actions when a model is changed.
