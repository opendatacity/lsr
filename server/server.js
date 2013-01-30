var config = require('./config.js')
var robots = require('./lib/robotstxt');
var url = require('url');
var querystring = require('querystring');
var http = require('http');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

http.createServer(function(req, res){
	
	var query = url.parse(req.url,true).query; 

	if ("url" in query && query.url.match(/^http(s)?:\/\/[A-Za-z0-9\.]+\.[A-Za-z]+./)) {
		
		res.writeHead(200, {'Content-Type': config.contenttype});

		// check for cache
		
		var d = new Date();
		var date_hash = (d.getFullYear()*10000+d.getMonth()*100+d.getDate()).toString(16);
		
		var sha1 = crypto.createHash('sha1');
		
		var url_hash = sha1.update(config.salt+' '+query.url).digest('hex');
		
		var cache_file = path.resolve(__dirname, 'cache', date_hash+'-'+url_hash);
		
		fs.exists(cache_file, function(exists){
			
			if (exists && config.cache) {
				
				fs.readFile(cache_file, function (err, data) {

					console.log('[cache] '+query.url);

					res.end(data);

				});
				
			} else {
				
				robots.analyse(query.url, function (result) {
					
					result = JSON.stringify(result);
					res.end(result);
					
					if (config.cache) {
					
						fs.writeFile(cache_file, result, function(err){
						
							if (err) { 
							
								console.log('[error] could not write cache');
							
							} else {
							
								console.log('[cached] '+query.url);
							
							}
						
						});
						
					}
					
				});

			}
			
		});
		
	} else {
		
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.end("Nope.");
		
	}
	
}).listen(config.listen.port, config.listen.host);

console.log('[status] server up. '+config.listen.host+':'+config.listen.port);
