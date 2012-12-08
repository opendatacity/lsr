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
	
	$.getJSON('http://localhost:8080/'+url, function (data) {
		$('#result').html(JSON.stringify(data));
	});
}