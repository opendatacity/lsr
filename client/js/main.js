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
		check();
		return false;
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
		if (data.statusCode != 200) {
			html = '<div class="alert alert-error">Die Seite konnte nicht geladen werden!</div>';
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
			addRow(data.allowed.index,    'Darf diese Seite in <strong>Suchergebnissen</strong> angezeigt werden?');
			addRow(data.allowed.images,   'Dürfen die Bilder in der <strong>Bildersuche</strong> verwendet werden?');
			addRow(data.allowed.news,     'Darf die Seite in <strong>Google News</strong> angezeigt werden?');
			addRow(data.allowed.snippets, 'Dürfen Textausschnitte (sogenannte <strong>"Snippets"</strong>) verwendet werden?');
			table = '<table class="summary">'+table+'</table>';
			html += table;
			
			
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
		$('#result').html(html);
	});
}