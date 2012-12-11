var HTTP = require('http');
var HTTPS = require('https');
var URL = require('url');

exports.analyse = function (dirtyUrl, callback) {
	var url = dirtyUrl;
	
	// cleaning up url 
	url = trim(url);

	if (!url.match(/^(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+.*$/)) {
		var parts = url.split('/');
		if (!parts[0].startsWith('http')) {
			parts.unshift('http:/');
		}
		url = parts.join('/');
		
		if (!url.match(/^(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+.*$/)) {
			// Oh god, I failed! /o\
			console.error('Defekte URL: "'+url+'" ' + ((dirtyUrl == url) ? '' : ' - Original: "'+dirtyUrl+'")'));
		}
	}
	
	console.log('Checking "'+url+'"');
	
	var opt = URL.parse(url);
	
	var protocol = HTTP;
	if (opt.protocol == 'https') protocol = HTTP;
	
	var result = {
		rules: {},
		permissions: {
			'robots':          {access:true, index: true, snippets: true},
			'googlebot':       {access:true, index: true, snippets: true},
			'googlebot-news':  {access:true, index: true, snippets: true},
			'googlebot-image': {access:true, index: true, snippets: true}
		},
		summary: {},
		url: {
			prot: opt.protocol,
			host: opt.host,
			path: opt.path
		}
	};
	
	var updatePermissions = function (robot, type, value) {
		result.permissions[robot][type] = value;
		if (robot == 'robots') {
			updatePermissions('googlebot', type, value);
		}
		if (robot == 'googlebot') {
			updatePermissions('googlebot-news',  type, value);
			updatePermissions('googlebot-image', type, value);
		}
	}
	
	var finalize = function () {
		if ((result.rules.meta !== undefined) && (result.rules.robot !== undefined)) {
			for (var key in result.permissions) {
				var obj = result.permissions[key];
				obj.index    = obj.index    && obj.access;
				obj.snippets = obj.snippets && obj.index;
			}
			//result.summary = 'hallo';
			result.summary = {
				index:    result.permissions.googlebot.index,
				images:   result.permissions['googlebot-image'].index,
				news:     result.permissions['googlebot-news'].index,
				snippets: result.permissions['googlebot-news'].snippets,
			};
				
			callback(result);
		}
	}
	
	var parsePage = function (res) {
		var data = '';
		result.statusCode = res.statusCode;
		res.on('data', function (chunk) { data += chunk });
		res.on('end', function () {
			
			result.rules.meta = [];
						
			var metas = data.match(/\<meta.*?\>/gi);
			
			if (metas != null) {
				metas.forEach(function (meta) {
					var name = meta.match(/name\s*=\s*[\"\'](.*?)[\"\']/i);
					if (name != null) {
						var robot = name[1];
						if ('|robots|googlebot|googlebot-news|googlebot-image|'.indexOf('|'+robot+'|') >= 0) {
							var values = meta.match(/content\s*=\s*[\"\'](.*?)[\"\']/i);
							if (values != null) {
								values = values[1].split(',');
								
								for (var i = 0; i < values.length; i++) {
									values[i] = trim(values[i]);
									switch (values[i]) {
										case 'index':     updatePermissions(robot, 'index',   true); break;
										case 'noindex':   updatePermissions(robot, 'index',   false); break;
										case 'snippet':   updatePermissions(robot, 'snippets', true); break;
										case 'nosnippet': updatePermissions(robot, 'snippets', false); break;
									}
								}
								 
								result.rules.meta.push({
									line: meta,
									robot: robot,
									values: values
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
			result.rules.robot = [];
			var robotLine, ruleLine, robot = '';
			
			data = data.replace(/[\n\r]+/g, '\n');
			data.split('\n').forEach(function (line) {
				line = trim(line);
				var parts = line.split(':');
				if ((line[0] != '#') && (parts.length >= 2)) {
					var command = trim(parts[0]).toLowerCase();
					var value = trim(parts[1]);
					
					if (command == 'user-agent') {
						robotLine = line;
						robot = value;
						isGooglebot = ('|*|googlebot|googlebot-news|googlebot-image|'.indexOf('|'+robot+'|') >= 0);
					} else if ((command == 'disallow') || (command == 'allow')) {
						ruleLine = line;
						if (isGooglebot) {
							var pattern = trim(value);
							pattern = pattern.replace(/[\(\)\\\[\]\{\}\?\+]/g, '\\$&');
							if (pattern.charAt(pattern.length - 1) != '*') pattern += '*';
							pattern = pattern.replace(/\*/g, '.*');
							pattern = new RegExp(pattern, 'g');
							
							var matchedUrl = (opt.path.match(pattern) != null);
							
							result.rules.robot.push({
								line1: robotLine,
								line2: ruleLine,
								robot: robot,
								url: value,
								allow: command == 'allow',
								forGoogle: isGooglebot,
								matchedUrl: matchedUrl
							});
							
							if (matchedUrl) {
								updatePermissions(
									(robot == '*') ? 'robots' : robot,
									'access',
									command == 'allow'
								);
							}
						}
					}
				}
			});
			finalize();
		});
	}

	var requestPage  = protocol.get({ host:opt.host, path:opt.path     }, parsePage ).on('error', function(e) {
		console.log("Got error: " + e.message);
		result.rules.meta = [];
		finalize();
	});
	
	var requestRobot = protocol.get({ host:opt.host, path:'/robots.txt'}, parseRobot).on('error', function(e) {
		console.log("Got error: " + e.message);
		result.rules.robot = [];
		finalize();
	});

}

/* Why is always this fucking */ function /* missing to */ trim /* a fucking */ (text) /* ???? */ {
	return text.replace(/^\s*|\s*$/g, '');
}

String.prototype.startsWith = function (text) {
	return this.substr(0, text.length) == text;
}