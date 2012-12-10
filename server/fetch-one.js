
var url = process.argv[2];

//url = 'http://taz.de/Prozess-um-Sachsensumpf/!107196/';
url = 'http://www.handelsblatt.com/unternehmen/it-medien/medienbranche-springer-chef-pocht-auf-online-gema-fuer-verlage/3562678.html';
url = 'http://www.heise.de/ct/artikel/Kulturkampf-1049862.html';

require('./fetcher').analyse(
	url,
	function (rules) {
		console.log(JSON.stringify(rules, null, '   '))
	}
);