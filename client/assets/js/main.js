
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
	
	/* build media */
	
	$.get('assets/templates/media.mustache.html', function(template){
		$('#medien-auswertung').html($.mustache(template,{media: $media}));
	}, 'html');
	
});

function check(url) {
	/* check */
	var oldClass = $('#result').attr('class');
	$('#result').attr('class','spinner');
	$.ajax({
		dataType: "json",
		url: $server+url,
		success: function (data) {
			if (data.status) {
				$('#url').val(url)
				$('a.btn.active','#result-nav').removeClass('active');
				if (oldClass === 'medium'||oldClass === 'complicated') {
					$('#result').attr('class',oldClass);
					$('#'+oldClass).addClass('active');
				} else {
					$('#result').attr('class','simple');
					$('#simple').addClass('active');
				}
				get_result_template(function(template){
					$('#result-container').html($.mustache(template,data));
				});
			} else {
				$('#result').attr('class','error');
				setTimeout(function(){
					$('#result').attr('class','default');
				},5000);
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

/* get result template */
var template_result = false;
function get_result_template(template_callback) {
	if (!template_result) {
		$.get('assets/templates/result.mustache.html', function(template){
			template_result = template;
			template_callback(template_result);
		},'html');
	} else {
		template_callback(template_result);
	}
}
