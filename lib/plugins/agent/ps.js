
var domain = require('domain');
var spawn = require('child_process').spawn;

var current;
var ps;
var psconf;
var interval = 5000;

// setup 
exports.configure = function(conf) {
	psconf = conf;
	interval = conf.interval || 5000;
	setTimeout(checkps, interval);
};

// init connection
exports.init = function() {
	current = this;
};

// execution domain
var d = domain.create();
d.on('error', function(err) {
	console.error('unexpected error on ps plugin');
	console.error(err.stack);
});

function checkps() {

	d.run(function() {
		var ps = spawn('ps', ['ax']);
		var psout = '';
		ps.stdout.on('data', function(data) {
			var text = data.toString('utf8');
			psout += text;
		});
		ps.stdout.on('close', function() {
			var result = {};
			for (var name in psconf) {
				var regex = new RegExp(psconf[name]);
				if (regex.test(psout)) {
					result[name] = 1;
				} else {
					result[name] = 0;
				}
			}
			// send to the server
			if (current) {
				current.json('ps', 'collect', result);
			}
			setTimeout(checkps, interval);
		});
		ps.on('error', function(err) {
			console.log("ERROR", err.message);
		});
		ps.on('exit', function(code) {
			if (code != 0) {
				console.error('ps exit unexpectedly', code);
			}
		});
	});

}

