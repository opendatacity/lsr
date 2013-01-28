var config = require('./config.js')
var newspapers = require('../data/newspapers');
var robots = require('./lib/robotstxt');
var url = require('url');
var querystring = require('querystring');
var http = require('http');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var resolver = require('./lib/resolver');
var util = require('util');
var colors = require('colors');

process.on('uncaughtException', function(err) {
  console.warn('[error] uncaught exception', err);
});

fs.unlinkSync("../data/scraper.txt");

console.log('[status]'.blue, 'scraper started'.green);
console.log('[status]'.blue, newspapers.length+' to scan'.green);

var d = new Date();
var date_hash = (d.getFullYear()*10000+d.getMonth()*100+d.getDate()).toString(16);

newspapers.forEach(function(newspaper){

	var newspaper_title = newspaper[0];
	var newspaper_url_initial = newspaper[1];

	console.warn('[scrape]',newspaper_title);

	resolver(newspaper_url_initial, function(err,newspaper_url){
	
		if (err) {
		
			console.warn('[error] "'+newspaper_title+'" — '+newspaper_url_initial);
			interpret({
				"title": newspaper_title,
				"url": newspaper_url_initial,
				"status": false
			});
		
		} else {
			
			var sha1 = crypto.createHash('sha1');
			var url_hash = sha1.update(config.salt+' '+newspaper_url).digest('hex');
			var cache_file = path.resolve(__dirname, 'cache', date_hash+'-'+url_hash);
	
			fs.exists(cache_file, function(exists){
	
				if (config.cache && exists) {
		
					fs.readFile(cache_file, function (err, data) {

						console.warn('[cache] read '+newspaper_url);

						data = JSON.parse(data);
			
						data.title = newspaper_title;
						data.url = newspaper_url;
			
						interpret(data);

					});
		
				} else {
		
					robots.analyse(newspaper_url, function (result) {

						result.title = newspaper_title;
						result.url = newspaper_url;

						interpret(result);

						if (config.cache && result.status) {
							
							// cache only if everything went well

							result = JSON.stringify(result);

							fs.writeFile(cache_file, result, function(err){

								if (err) { 

									console.warn('[error] could not write cache');

								} else {

									console.warn('[cache] write '+newspaper_url);

								}

							});

						}
			
					});

				}
			
			});

		}
	
	});
	
});

function interpret(data) {

	console.warn("[interpret]", data.title);
	
	var _out = {
		"title": data.title,
		"url": data.url,
		"index": {
			"googlebot": (data.permissions.robots["googlebot"] && data.permissions.meta["googlebot"].index),
			"googlebot-news": (data.permissions.robots["googlebot-news"] && data.permissions.meta["googlebot-news"].index)
		},
		"snippet": {
			"googlebot": data.permissions.meta["googlebot"].snippet,
			"googlebot-news": data.permissions.meta["googlebot-news"].snippet
		}
	};
	
	_out.all = (_out.index['googlebot'] && _out.index['googlebot-news'] && _out.snippet['googlebot'] && _out.snippet['googlebot-news']);
	_out.none = (!_out.index['googlebot'] && !_out.index['googlebot-news'] && !_out.snippet['googlebot'] && !_out.snippet['googlebot-news']);
	
	if (_out.all) {
		
		console.log("[all allowed] ", data.title.green);
		
	} else if (_out.none){
		
		console.log("[none allowed]", data.title.red);

	} else {
		
		console.log("[some allowed]", data.title.yellow);
		
	}
	
	if (!_out.all) {
		
		console.log(util.inspect(data, true, 10, true));
		
	}
	
	// console.warn(util.inspect(_out, true, 10, true));

	var cache_file = path.resolve(__dirname, '../client/data/scraped-'+date_hash+'.txt');

	fs.appendFile('../data/scraper.txt', "\n"+JSON.stringify(_out)+',', function (err) {
	  if (err) throw err;
	  console.warn('[writeout] '+data.title);
	});
	
}
