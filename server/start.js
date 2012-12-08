var HTTP = require('http');

var analyse = require('./fetcher').analyse;


HTTP.createServer( function (req, res) {
	var url = req.url.substr(1);
	analyse(url, function (result) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		result = JSON.stringify(result);
		console.log(result);
		res.end(result);
	})
}).listen(8080);