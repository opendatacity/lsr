
$(document).ready(function(){
	/* hash check */
	window.currentHash = '#';
	var hashCheck = function(){ 
		if (window.currentHash !== location.hash) {
			window.currentHash = location.hash;
			hash = location.hash.match(/^#!\/(check|get)(\/(.*))?$/);
			if (hash) {
				switch(hash[1]) {
					case "get": if ($('#'+hash[3]).length > 0) $('#content').attr('class', hash[3]); break;
					case "check": 
						$('#content').attr('class','check');
						if (typeof hash[3] === "undefined" || hash[3] === undefined || hash[3] == "") {
							$('#result').attr('class','default');
						} else {
							$('#content').attr('class', 'check'); 
							check(hash[3]); 
						}
					break;
				}
			}
		}
	}
	if ("onhashchange" in window && (!document.documentMode || document.documentMode >= 8)) {
		window.onhashchange = hashCheck;
	} else {
		setInterval(hashCheck, 50);
	}
	hashCheck();
	/* button navigation */
	$('a.btn','#result-nav').click(function(evt){
		evt.preventDefault();
		$btn = $(this);
		$('a.btn.active','#result-nav').removeClass('active');
		$(this).addClass('active');
		$('#result').attr('class',$btn.attr('id'));
	});
	/* form listener */
	$('#queryform').submit(function (e) {
		e.preventDefault();
		location.hash = '!/check/'+$('#url').val();
		return false;
	});
});

function check(url) {
	/* check */
	var oldClass = $('#result').attr('class');
	$('#result').attr('class','spinner');
	$.ajax({
		dataType: "json",
		url: $server+url,
		success: function (data) {
			$('a.btn.active','#result-nav').removeClass('active');
			if (oldClass === 'medium'||oldClass === 'complicated') {
				$('#result').attr('class',oldClass);
				$('#'+oldClass).addClass('active');
			} else {
				$('#result').attr('class','complicated');//simple
				$('#simple').addClass('active');
			}
		},
		error: function (data) {
			$('#result').attr('class','fail');
			setTimeout(function(){
				$('#result').attr('class','default');
			},5000);
		}
	});
}

/*

var lastHash = '';

$(function () {
	setInterval(function () {
		var hash = window.location.hash;
		if (hash != lastHash) {
			$('#urlInput').val(hash.substr(1));
			check();
			lastHash = hash;	
		}
	}, 200);
	
	$('#checkForm').submit(function (e) {
		e.preventDefault();
		check();
		return false;
	});
	$('#submitButton').click(function (e) {
		e.preventDefault();
		check();
		return false;
	});
});

function check() {
	var url = $('#urlInput').val();
	
	lastHash = '#'+url;
	window.location.hash = lastHash;
	
	$('#result').html('Die Seite wird überprüft ...');
	
	$.getJSON($server+url, function (data) {
		var html = '';
		var code = data.response.statusCode; 
		if (code != 200) {
			if (code == 301) {
				var location = data.response.headers.location;
				$('#urlInput').val(location);
				lastHash = '#'+location;
				window.location.hash = lastHash;
				check();
			} else {
				console.log(data.response);
				html = '<div class="alert alert-error">Die Seite konnte nicht geladen werden!</div>';
			}
		} else {
			html += '<h2>Zusammenfassung</h2>';
			html += '<p class="lead">für '+data.url.prot+'//<strong>'+data.url.host+'</strong>'+data.url.path+'</p>';
			
			var table = '';
			function addRow(isTrue, question) {
				if (isTrue) {
					table += '<tr class="good"><td>'+question+'</td><td class="icon">&#10004;</td></tr>';
				} else {
					table += '<tr class="bad" ><td>'+question+'</td><td class="icon">&#10008;</td></tr>';
				}
			}
			addRow(data.summary.index,    'Darf diese Seite in <strong>Suchergebnissen</strong> aufgelistet werden?');
			addRow(data.summary.images,   'Dürfen die Bilder in der <strong>Bildersuche</strong> verwendet werden?');
			addRow(data.summary.news,     'Darf die Seite in <strong>Google News</strong> angezeigt werden?');
			addRow(data.summary.snippets, 'Dürfen Textausschnitte (sogenannte <strong>"Snippets"</strong>) verwendet werden?');
			table = '<table class="summary">'+table+'</table>';
			html += table;
			
			html += '<p style="text-align:center; margin-top: 20px;"><button id="showDetails" type="button" class="btn" data-toggle="collapse" data-target="#details">Zeige Detail</button></p>';
			
			html += '<div id="details" class="collapse">';
			
			
			
			html += '<h2 style="margin-top:20px">Im Detail</h2>';
			
			html += '<h3>robots.txt</h3>';
			html += '<p>Die robots.txt gibt an, welche Suchmaschinen welche Inhalte anschauen dürfen.<br>Sie ist immer zu finden unter domain/robots.txt.</p>';
			if (data.rules.robot.length == 0) {
				html += '<p class="alert">In der robots.txt sind für diesen Artikel keine Einschränkungen definiert. Der Artikel darf also von Google untersucht werden.</p>';
			} else {
				$.each(data.rules.robot, function (i, robot) {
					var line1 = robot.line1.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
					var line2 = robot.line2.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
					html += '<pre>'+line1+'<br>'+line2+'</pre>';
				});
			}
			
			
			
			html += '<h3>Metadaten</h3>';
			html += '<p>Metadaten werden in den einzelnen Artikelseiten versteckt, um den Suchmaschinen ganz genau zu erklären, was sie dürfen und was nicht.</p>';
			
			if (data.rules.meta.length == 0) {
				html += '<p class="alert">In der Artikelseite sind keine Metadaten definiert.</p>';
			} else {
				$.each(data.rules.meta, function (i, meta) {
					var line = meta.line;
					line = line.replace(/\</g, '&lt;');
					line = line.replace(/\>/g, '&gt;');
					html += '<pre>'+line+'</pre>';
					
					var robot = meta.robot;
					switch (robot.toLowerCase()) {
						case 'robots': robot = '<strong>alle Suchmaschinen</strong> (sogenannte "robots")'; break;
						case 'googlebot': robot = 'die <strong>Google-Suche</strong> (der sogenannte "googlebot")'; break;
						case 'googlebot-news': robot = '<strong>Google-News</strong> (der sogenannte "googlebot-news")'; break;
						case 'googlebot-image': robot = 'die <strong>Google-Bildersuche</strong> (der sogenannte "googlebot-image")'; break;
					}
					var rules = [];
					$.each(meta.values, function (i, rule) {
						switch (rule.toLowerCase()) {
							case 'index':     text = 'Diese Seite soll in die Suchmaschine aufgenommen werden.'; break;
							case 'noindex':   text = 'Diese Seite darf nicht in die Suchmaschine aufgenommen werden.'; break;
							case 'follow':    text = 'Diese Seite soll nach weiteren Artikeln durchsucht werden.'; break;
							case 'nofollow':  text = 'Diese Seite darf nicht nach weiteren Artikeln durchsucht werden.'; break;
							case 'archive':   text = 'Diese Seite darf archiviert werden.'; break;
							case 'noarchive': text = 'Diese Seite darf nicht archiviert werden.'; break;
							case 'snippet':   text = 'Es dürfen Textausschnitte (sogenannte Snippets) verwendet werden.'; break;
							case 'nosnippet': text = 'Es dürfen Textausschnitte (sogenannte Snippets) nicht verwendet werden.'; break;
							case 'noodp':     text = 'Der Beschreibungstext in den Suchergebnissen darf nicht vom "open directory project" stammen.'; break;
							case 'none':      text = 'Diese Seite darf weder untersucht, noch in die Suchmaschine aufgenommen werden.'; break;
						}
						rules.push('<li><strong>'+rule+'</strong> - '+text+'</li>');
					});
					html += '<p>Diese Anweisung gilt für '+robot+':</p><ul>'+rules.join('')+'</ul>';
				});
			}
			html += '</div>';
		}
		$('#result').html(html);
	}).error(function (e) {
		//console.error(e);
		$('#result').html('<p class="alert alert-error">Es gab einen Fehler beim Erreichen des Servers ... sorry :/</p>');
	})
}

*/