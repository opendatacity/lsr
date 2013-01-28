var http = require('http');
var https = require('https');
var url = require('url');
var fs = require("fs");
var util = require("util");
var crypto = require("crypto");
var path = require("path");

var d = new Date();
var date_hash = (d.getFullYear()*10000+d.getMonth()*100+d.getDate()).toString(16);

var robotstxt = {
	
	analyse: function(analyse_url, analyse_callback) {
	
		var analyse_result = {
			status: null,
			rules: {
				robots: null,
				meta: null
			},
			permissions: {
				robots: null,
				meta: null
			},
			info: {
				url: url.parse(analyse_url)
			},
		};
	
		var helper_called = 0;
	
		var helper_callback = function() {
			
			helper_called++;
			
			if (helper_called === 2) {
				
				analyse_result.answers = {};
				
				analyse_result.answers.medium = {
					"search": (analyse_result.permissions.robots['googlebot'] && (!"meta" in analyse_result.permissions || !"googlebot" in analyse_result.permissions.meta || !"index" in analyse_result.permissions.meta['googlebot'] || analyse_result.permissions.meta['googlebot'].index)),
					"image": (analyse_result.permissions.robots['googlebot-image'] && (!"meta" in analyse_result.permissions || !"googlebot-image" in analyse_result.permissions.meta || !"index" in analyse_result.permissions.meta['googlebot-image'] || analyse_result.permissions.meta['googlebot-image'].index)),
					"news": (analyse_result.permissions.robots['googlebot-news'] && (!"meta" in analyse_result.permissions || !"googlebot-news" in analyse_result.permissions.meta || !"index" in analyse_result.permissions.meta['googlebot-news'] || analyse_result.permissions.meta['googlebot-news'].index)),
					"snippet": (!"meta" in analyse_result.permissions || !"googlebot-news" in analyse_result.permissions.meta || !"snippet" in analyse_result.permissions.meta['googlebot-news'] || analyse_result.permissions.meta['googlebot-news'].snippet)
				}
				
				analyse_result.answers.simple = {};
				
				if (analyse_result.answers.medium.search && analyse_result.answers.medium.news && analyse_result.answers.medium.snippet && analyse_result.answers.medium.image) {
					
					analyse_result.answers.simple.is = "all";
					analyse_result.answers.simple.all = true;
					
				} else if (!analyse_result.answers.medium.search && !analyse_result.answers.medium.news && !analyse_result.answers.medium.snippet && !analyse_result.answers.medium.image) {
					
					analyse_result.answers.simple.is = "none";
					analyse_result.answers.simple.none = true;
					
				} else {
					
					analyse_result.answers.simple.is = "some";
					analyse_result.answers.simple.some = true;

				}
				
				analyse_result.answers.complicated = {};
				analyse_result.answers.complicated.robots = [];

				for (var key in analyse_result.rules.robots) {
					
					if (analyse_result.rules.robots[key].allow.length > 0 || analyse_result.rules.robots[key].disallow.length > 0) {

						analyse_result.answers.complicated.robots.push({
							name: key,
							default: (key === '*'),
							rules: analyse_result.rules.robots[key]
						});
						
					}

				}

				analyse_result.answers.complicated.meta = [];
				
				var meta = {};
				
				if ("meta" in analyse_result.rules && typeof analyse_result.rules.meta === "object") {
				
					for (var i = 0; i < analyse_result.rules.meta.length; i++) {
					
						meta = {
							line: analyse_result.rules.meta[i].line,
							robot: analyse_result.rules.meta[i].robot,
							default: (analyse_result.rules.meta[i].robot === '*'),
							index: false,
							follow: false,
							archive: false,
							noindex: false,
							nofollow: false,
							noarchive: false,
							snippet: false,
							nosnippet: false,
							noodp: false,
							none: false
						};
					
						for (var j = 0; j < analyse_result.rules.meta[i].values.length; j++) {
					
							meta[analyse_result.rules.meta[i].values[j].toLowerCase()] = true;
					
						}
					
						switch (analyse_result.rules.meta[i].robot) {
						
							case "googlebot": meta.name = "die Google-Suche"; break;
							case "googlebot-image": meta.name = "die Google-Bildersuche"; break;
							case "googlebot-news": meta.name = "die Google News"; break;
						
						}
					
						analyse_result.answers.complicated.meta.push(meta);
					
					}
					
				}

				analyse_callback(analyse_result);
				
			}
			
		}
		
		robotstxt.analyse_page(analyse_url, function(err, _result){
			
			if (!err) {
				
				analyse_result.permissions.meta = _result.rules;
				analyse_result.rules.meta = _result.tags;
				
			}
			
			helper_callback();
			
		});

		robotstxt.analyse_robots(analyse_url, function(_result){

			analyse_result.status = _result.status;
			analyse_result.rules.robots = _result.rules.robots;
			analyse_result.permissions.robots = _result.permissions.robots;
			analyse_result.info.robotstxt = _result.info.robotstxt;
				
			helper_callback();
			
		});
		
	},
	analyse_page: function(analyse_page_url, analyse_page_callback) {
	
		var rules = {
			'*': {'index': true, 'snippet': true},
			'googlebot': {'index': null, 'snippet': null},
			'googlebot-news': {'index': null, 'snippet': null},
			'googlebot-image': {'index': null, 'snippet': null}
		};
		var tags = [];
	
		robotstxt.check(analyse_page_url, function(err, analyse_page_url){
			
			if (err) { 
				
				analyse_page_callback(err);

			} else {

				robotstxt.fetch(analyse_page_url, function(err, content){
					
					if (err) { 

						/* no metatags because of, say, error 500? all allowed then, i guess */

						analyse_page_callback(null, {
							meta: [],
							rules: {
								'*': {'index': true, 'snippet': true},
								'googlebot': {'index': true, 'snippet': true},
								'googlebot-news': {'index': true, 'snippet': true},
								'googlebot-image': {'index': true, 'snippet': true}
							}
						});

					} else {
						
						var metatags = content.match(/\<meta.*?\>/gi);

						var metatag = '';

						if (metatags != null) {
							while (metatags.length > 0) {
								metatag = metatags.shift();
								var metatag_name_attr = metatag.match(/name\s*=\s*[\"\'](.*?)[\"\']/i);
								if (metatag_name_attr != null) {
									var metatag_name = metatag_name_attr[1];
									if ('|robots|googlebot|googlebot-news|googlebot-image|'.indexOf('|'+metatag_name+'|') >= 0) {
										var robot = (metatag_name === 'robots') ? '*' : metatag_name;
										var metatag_content_attr = metatag.match(/content\s*=\s*[\"\'](.*?)[\"\']/i);
										if (metatag_content_attr != null) {
											metatag_content = metatag_content_attr[1].split(',');

											for (var i = 0; i < metatag_content.length; i++) {
												metatag_content[i] = trim(metatag_content[i]);
												switch (metatag_content[i].toLowerCase()) {
													case 'index':
														rules[robot]['index'] = true;
													break;
													case 'noindex':
														rules[robot]['index'] = false;
													break;
													case 'snippet':
														rules[robot]['snippet'] = true;
													break;
													case 'nosnippet':
														rules[robot]['snippet'] = false;
													break;
													case 'none':
														rules[robot]['index'] = false;
														rules[robot]['snippet'] = false;
													break;
													
												}
											}

											tags.push({
												line: metatag,
												robot: robot,
												values: metatag_content
											});
										}
									}
								}
							};
							
							if (rules['*']['index'] === true && rules['googlebot']['index'] === null) rules['googlebot']['index'] = true;
							if (rules['*']['index'] === true && rules['googlebot-news']['index'] === null) rules['googlebot-news']['index'] = true;
							if (rules['*']['index'] === true && rules['googlebot-image']['index'] === null) rules['googlebot-image']['index'] = true;

							if (rules['*']['snippet'] === true && rules['googlebot']['snippet'] === null) rules['googlebot']['snippet'] = true;
							if (rules['*']['snippet'] === true && rules['googlebot-news']['snippet'] === null) rules['googlebot-news']['snippet'] = true;
							if (rules['*']['snippet'] === true && rules['googlebot-image']['snippet'] === null) rules['googlebot-image']['snippet'] = true;
							
						} else {
							
							// no metatags allowes all
							
							rules = {
								'*': {'index': true, 'snippet': true},
								'googlebot': {'index': true, 'snippet': true},
								'googlebot-news': {'index': true, 'snippet': true},
								'googlebot-image': {'index': true, 'snippet': true}
							};
							
						}
						
						analyse_page_callback(null, {
							rules: rules,
							tags: tags 
						});
						
					}
					
				});
				
			}
			
		});
		
	},
	analyse_robots: function(analyse_robots_url, analyse_robots_callback) {
	
		var _result = {
			"status": false,
			"rules": {
				"robots": [],
				"meta": []
			},
			"permissions": {
				"robots": {"*": false, "googlebot": false, "googlebot-news": false, "googlebot-image": false},
				"meta": {"access": false, "index": false, "snippets": false}
			},
			"info": {}
		}

		// robots.txt
		
		robotstxt.find(analyse_robots_url, function(err, analyse_robots_url_robots){
			
			if (err) {
				
				_result.message = "Diese URL ist ungültig.";
				analyse_robots_callback(_result);
				
			} else {
				
				_result.info.robotstxt = analyse_robots_url_robots;
				
				robotstxt.fetch(analyse_robots_url_robots, function(err, content){

					if (!err) {
						
						robotstxt.parse(content, function(all_rules){
							
							_result.rules.robots = all_rules;

							var count = 0;
							
							var lookup_agents = ["*", "googlebot","googlebot-news","googlebot-image"];
							
							while (lookup_agents.length > 0) {
							
								lookup_agent = lookup_agents.shift();
							
								robotstxt.rules(lookup_agent, all_rules, function(rules){

									robotstxt.access(analyse_robots_url, rules, function(access){
										
										_result.permissions.robots[lookup_agent] = access;
										
										count++;
										
										if (count === 4) {
								
											_result.status = true;
											analyse_robots_callback(_result);
											
										}
										
									});
									
								});
								
							};
							
						});

					} else {
						
						if (content !== undefined) {
						
							switch (content.toString()) {
							
								case "":
							
									_result.message = "Diese URL ist nicht erreichbar.";
							
								break;
								case "401":
								case "403":
							
									// disallow
								
									_result.permissions.robots = {
										'*': false,
										'googlebot': false,
										'googlebot-image': false,
										'googlebot-news':false
									};

									_result.status = true;
								
								break;
								default:
							
									// allow
									_result.permissions.robots = {
										'*': true,
										'googlebot': true,
										'googlebot-image': true,
										'googlebot-news': true
									};
									_result.message = "Es existiert keine robots.txt Datei";
									_result.status = true;
							
								break;
							
							}
							
						} else {
							
							_result.message = "Diese Datei robots.txt konnte nicht geladen werden.";
							
						}
						
						analyse_robots_callback(_result);
						
					}
					
				});
				
			}
			
		});
		
	},
	fetch: function(request_url, fetch_callback) {
	
		var sha1 = crypto.createHash('sha1');
		var url_hash = sha1.update('__wwwcache '+request_url).digest('hex');
		var cache_file = path.resolve(__dirname, '../cache', date_hash+'-'+url_hash+'-http');
	
		fs.exists(cache_file, function(exists){

			if (exists) {
				
				fs.readFile(cache_file, function (err, data) {

					console.warn('[www-cache] read '+request_url);

					fetch_callback(null, data.toString());
					
				});
		
			} else {
	
				request_url_parsed = url.parse(request_url);
		
				switch (request_url_parsed.protocol) {
			
					case "http:": var prot = http; break;
					case "https:": var prot = https; break;
			
				}
		
				prot.get(request_url, function(res){

					if (res.statusCode.toString() !== "200") {
				
						console.warn("[error] fetch '"+request_url+"': HTTP Status "+res.statusCode);
						fetch_callback(true, res.statusCode);
				
					} else {

						var data = '';
			
						res.on('data', function(chunk) { 
							data += chunk.toString();
						});
			
						res.on('end', function (){

							fetch_callback(null, data);
					
							fs.writeFile(cache_file, data);
					
						});
			
					}

				}).on('error', function(e) {
					console.warn("[error] fetch '"+request_url+"': " + e.message);
					fetch_callback(true)
				});
				
			}
			
		});
		
	},
	find: function(request_url, find_callback) {
		
		// find robotstxt matching url
		
		robotstxt.check(request_url, function(err,request_url){
			
			if (err) { 
				
				find_callback(err); 

			} else {
				
				request_url_parsed = url.parse(request_url);
				
				request_url_robots = url.format({
					protocol: request_url_parsed.protocol,
					auth: request_url_parsed.auth,
					hostname: request_url_parsed.hostname,
					port: request_url_parsed.port,
					auth: request_url_parsed.auth,
					pathname: "/robots.txt"
				});
				
				find_callback(null, request_url_robots);
				
			}
			
		});
		
	},
	check: function(request_url, check_callback) {
	
		if (typeof request_url !== "string") {
			console.error('[error] defekte url: keine.');
			check_callback(true);
			return;
		}
	
		// check url 
		
		request_url = trim(request_url);
		
		if (!request_url.match(/^(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+.*$/)) {
			var parts = request_url.split('/');
			if (!parts[0].startsWith('http')) {
				parts.unshift('http:/');
			}
			request_url = parts.join('/');

			if (!request_url.match(/^(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+.*$/)) {
				// Oh god, I failed! /o\
				console.error('[error] Defekte URL: "'+request_url);
				check_callback(true);
			} else {
				check_callback(null, request_url);
			}
		} else {
			check_callback(null, request_url);
		}
		
	},
	rules: function (agent, rules, agent_callback) {
		
		// get rules for an agent
		
		agent = agent.toLowerCase();
		
		var keys = Object.keys(rules);
		var key = '';
		var foundKey = '*';
		
		while (keys.length > 0) {
			
			key = keys.shift();
			if (key !== "*" && agent.match(new RegExp(RegExp.wildcard(key)))) {
			
				foundKey = key;
				break;
				
			}
			
		}
		
		if (rules[foundKey] !== undefined) {
			
			agent_callback(rules[foundKey]);
			
		} else {
			
			agent_callback({allow:[],disallow:[]});
			
		}
		
	},
	access: function (request_url, rules, access_callback) {
		
		var rule = 0;
	
		var request_url_parsed = url.parse(request_url);
	
		var disallowing_rules = [];
	
		for (var i = 0; i < rules.disallow.length; i++) {

			rule = rules.disallow[i];
			
			if (trim(rule) !== "") { // Ignore Disallow without Value
			
				if (request_url_parsed.path.match(robotstxt.pattern(rule))) {
				
					disallowing_rules.push(rule);
				
				}
				
			}
			
		}
		
		if (disallowing_rules.length === 0) {
			
			access_callback(true);
			
		} else {
			
			// FIXME: check allow rules
			
			access_callback(false);

		}
		
	},
	pattern: function(rule) {
	
		pattern = rule.replace(/[\(\)\\\[\]\{\}\?\+]/g, '\\$&');
		if (pattern.charAt(pattern.length - 1) != '*') pattern += '*';
		pattern = pattern.replace(/\*/g, '.*');
		pattern = new RegExp(pattern, 'g');
		
		return pattern;
		
	},
	parse: function (data, parse_callback) {
	
		var rules = {};
	
		var currentAgents = [];
		var resetAgents = false;

		data = data.replace(/[\n\r]+/g, '\n');
		var lines = data.split('\n');
		
		for (var i = 0; i < lines.length; i++) {
		
			line = trim(lines[i]);
			var parts = line.split(':');
	
			if ((line[0] !== '#') && (parts.length >= 2)) {
		
				var command = trim(parts[0]).toLowerCase();
				var value = trim(parts[1]);
			
				switch (command) {
				
					case 'user-agent':

						var agent = value.toLowerCase();
				
						if (resetAgents) {
						
							currentAgents = [];
							resetAgents = false;

						}
				
						if (rules[agent] === undefined) {
						
							rules[agent] = {allow:[],disallow:[]};
						
						}
				
						currentAgents.push(agent);
						
					break;
					case 'allow':
					case 'disallow':
				
						resetAgents = true;

						currentAgents.forEach(function(agent){
						
							rules[agent][command].push(value);
						
						});
				
					break;
					default: 

						resetAgents = true;

					break;
					
				}
			
			}
	
		};
	
		parse_callback(rules);
	
	}

}

function trim(text) {
	return text.replace(/^\s*|\s*$/g, '');
};

RegExp.escape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

RegExp.wildcard = function(s) {
    return this.escape(s).replace(/\\\*/g, '.*');
};

String.prototype.startsWith = function (text) {
	return this.substr(0, text.length) == text;
};

module.exports = robotstxt;
