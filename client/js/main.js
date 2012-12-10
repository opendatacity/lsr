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
	
	$('#checkForm').submit(function () { check() });
});

function check() {
	var url = $('#urlInput').val();
	
	lastHash = '#'+url;
	window.location.hash = lastHash;
	
	$('#result').html('Die Seite wird überprüft ...');
	
	$.getJSON($server+url, function (data) {
		var html = '';
		if (data.statusCode != 200) {
			html = '<div class="alert alert-error">Die Seite konnte nicht geladen werden!</div>';
		} else {
			html += '<h2>Zusammenfassung</h2>';
			
			html += '<h2>Im Detail</h2>';
			html += '<h3>robots.txt</h3>';
			html += '<p><small>Die robots.txt gibt an, welche Suchmaschinen welche Inhalte anschauen dürfen</small></p>';
			if (data.robot.length == 0) {
				html += '<p class="alert">In der robots.txt sind für diesen Artikel keine Einschränkungen definiert. Der Artikel darf also von Google untersucht werden.</p>';
			}
			html += '<h3>Metadaten</h3>';
			html += '<p><small>Metadaten werden in den einzelnen Artikelseiten versteckt, um den Suchmaschinen ganz genau zu erklären, was sie dürfen und was nicht.</small></p>';
			$.each(data.meta, function (i, meta) {
				var line = meta.line;
				line = line.replace(/\</g, '&lt;');
				line = line.replace(/\>/g, '&gt;');
				html += '<pre>'+line+'</pre>';
				
				var robot = meta.name;
				switch (robot.toLowerCase()) {
					case 'robots': robot = 'alle Suchmaschinen (robots)'; break;
					case 'googlebot': robot = 'die Google-Suche (googlebot)'; break;
					case 'googlebot-news': robot = 'Google News (googlebot-news)'; break;
					case 'googlebot-image': robot = 'die Google-Bildersuche (googlebot-image)'; break;
				}
				var rules = [];
				$.each(meta.value, function (i, rule) {
					switch (rule.toLowerCase()) {
						case 'index': rule = 'index - Diese Seite soll in die Suchmaschine aufgenommen werden.'; break;
						case 'noindex': rule = 'noindex - Diese Seite darf nicht in die Suchmaschine aufgenommen werden.'; break;
						case 'follow': rule = 'follow - Diese Seite soll nach weiteren Artikeln durchsucht werden.'; break;
						case 'nofollow': rule = 'nofollow - Diese Seite darf nicht nach weiteren Artikeln durchsucht werden.'; break;
						case 'archive': rule = 'archive - Diese Seite darf archiviert werden.'; break;
						case 'noarchive': rule = 'noarchive - Diese Seite darf nicht archiviert werden.'; break;
						case 'snippet': rule = 'snippet - Es dürfen Textausschnitte (sogenannte Snippets) verwendet werden.'; break;
						case 'nosnippet': rule = 'nosnippet - Es dürfen Textausschnitte (sogenannte Snippets) nicht verwendet werden.'; break;
						case 'noodp': rule = 'noodp - Der Beschreibungstext in den Suchergebnissen darf nicht vom "open directory project" stammen.'; break;
						case 'none': rule = 'none - Diese Seite darf weder untersucht, noch in die Suchmaschine aufgenommen werden.'; break;
					}
					rules.push('<li>'+rule+'</li>');
				});
				html += '<p>Diese Anweisung gilt für '+robot+':</p><ul>'+rules.join('')+'</ul>';
			});
		}
		$('#result').html(html);
	});
}