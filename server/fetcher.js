var HTTP = require('http');
var URL = require('url');

exports.analyse = function (url, callback) {
	
	if (!url.match(/http(s)?:/)) callback({});
	
	url = url.replace(/^(http(s)?):\/([^/].*)$/,"$1://$3",url);
	
	console.log('Checking "'+url+'"');
	
	var rules = {};
	
	var finalize = function () {
		if ((rules.meta !== undefined) && (rules.robot !== undefined)) callback(rules);
	}
	
	var parsePage = function (res) {
		var data = '';
		rules.statusCode = res.statusCode;
		res.on('data', function (chunk) { data += chunk });
		res.on('end', function () {
			
			rules.meta = [];
						
			var metas = data.match(/\<meta.*?\>/g);
			
			if (metas != null) {
				metas.forEach(function (meta) {
					var name = meta.match(/name\s*=\s*[\"\'](.*?)[\"\']/i);
					if (name != null) {
						name = name[1];
						if ('|robots|googlebot|googlebot-news|googlebot-image|'.indexOf('|'+name+'|') >= 0) {
							var value = meta.match(/content\s*=\s*[\"\'](.*?)[\"\']/i);
							if (value != null) {
								value = value[1].split(',');
								rules.meta.push({
									line: meta,
									name: name,
									value: value
								});
							}
						}
					}
				});
			}
			finalize();
		});
	}
	
	var parseRobot = function (res) {
		var data = '';
		res.on('data', function (chunk) { data += chunk });
		res.on('end', function () {
			var isGooglebot = false;
			rules.robot = [];
			var robotLine, ruleLine;
			
			data = data.replace(/[\n\r]+/g, '\n');
			data.split('\n').forEach(function (line) {
				line = trim(line);
				if (line[0] != '#') {
					if (line.substr(0, 10).toLowerCase() == 'user-agent') {
						robotLine = line;
						var robot = trim(line.substr(11));
						isGooglebot = (robot == '*') || (robot == 'googlebot') || (robot == 'googlebot-image') || (robot == 'googlebot-news');
					}
					if (line.substr(0, 8) == 'disallow') {
						ruleLine = line;
						if (isGooglebot) {
							var rule = trim(line.substr(9));
							if (rule == opt.path.substr(0, line.length)) {
								rules.robot.push({
									line1: robotLine,
									line2: ruleLine,
									robot: robot,
									disallow:true 
								});
							}
						}
					}
				}
			});
			finalize();
		});
	}
	
	var opt = URL.parse(url);

	result.url = {
		prot: opt.protocol,
		host: opt.host,
		path: opt.path
	};

	var requestPage  = HTTP.get({ host:opt.host, path:opt.path     }, parsePage ).on('error', function(e) {
		console.log("Got error: " + e.message);
	});
	
	var requestRobot = HTTP.get({ host:opt.host, path:'/robots.txt'}, parseRobot).on('error', function(e) {
		console.log("Got error: " + e.message);
	});

}

/* Why is always this fucking */ function /* missing to */ trim /* a fucking */ (text) /* ???? */ {
	return text.replace(/^\s*|\s*$/g, '');
}