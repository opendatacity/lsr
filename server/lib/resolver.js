var http = require('http');
var https = require('https');
var url = require('url');

var resolve = function (resolve_url, resolve_callback) {

	if (typeof redirect_count === "undefined") {
		var redirect_count = 0;
	}
	
	redirect_count++;
	
	if (redirect_count > 10) {
		
		console.warn('[error] '+resolve_url+' --- maximum redirects');
		resolve_callback(true);
		
	}

	var options = url.parse(resolve_url)

	switch (options.protocol) {
		
		case "http:": var prot = http; break;
		case "https:": var prot = https; break;
		
	}

	options.method = "HEAD";
	
	try {

		var req = prot.request(options, function(res) {

	      if (!('location' in res.headers)) {
				resolve_callback(null, resolve_url);
	      } else {
	
		      var redirect_url = url.resolve(resolve_url, res.headers['location']);
   
				if (redirect_url == resolve_url) {
				
					console.warn('[error] '+resolve_url+' --- infinite loop');
					resolve_callback(true);

				}

				console.warn('[redirect] '+resolve_url+' ➔ '+redirect_url);
			
				resolve (redirect_url, resolve_callback);
	
			}

		});
	
		req.on('error', function(e){
			console.warn('[error] '+resolve_url+' --- '+e.message);
			resolve_callback(true);
		})
	
		req.end();
		
	} catch(e) {
		
		console.warn('[error] uncaught exception '+resolve_url);
		resolve_callback(true);

	}

};

module.exports = resolve;