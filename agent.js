
var domain = require('domain');
var WebSocket = require('ws');
var os = require('os');
var path = require('path');
var fs = require('fs');
var log = console.log;

var program = require('commander');
program.version('0.0.1')
.option('-h, --host <hostname>', 'server host to connect')
.option('-g, --group <group>', 'server group')
.option('-c, --config <config>', 'configuration path')
;

program.parse(process.argv);

// default configuration
var config = {
	plugins: {
		dstat: {},
		ps: {}
	}
};

var confpath = program.config || "/etc/proteus-monitor/agent.json";
try {
	if (fs.statSync(confpath)) {
		// load config from file
		var configtext = fs.readFileSync(confpath, 'utf8');
		config = JSON.parse(configtext);
	}
} catch (e) {
	if (e.code === 'ENOENT') {
		// ignore if file does not exist
	} else {
		console.error(e.message);
	}
}

var host = config.host || program.host || 'localhost:3333';
// set defaut port
if (host.indexOf(':') < 0) {
	host = host + ':3333';
}
var group = config.group || program.group || 'default';

log('starting proteus-monitor agent');

var retrySec = 1;

// load plugins 
var plugins = {};
for (var pluginName in config.plugins) {
	var plugin = require('./lib/plugins/agent/'+pluginName);
	log('loaded plugin', pluginName);
	// init plugin with config
	plugin.configure(config.plugins[pluginName]);
	plugins[pluginName] = plugin;

}
// common  plugin
plugins.common = {
	accept: function(data) {
		log('server accepted the agent');
		for (var name in plugins) {
			var plugin = plugins[name];
			if (plugin.init != null) {
				plugin.init.call(this);
			}
		}
	}
};

var d = domain.create();
d.run(function() {

	(function create() {
		var ws = new WebSocket('ws://'+host);
		log('connecting to the server', host);
		ws.json = function json(type, method, obj) {
			this.send(JSON.stringify({
				type: type,
				method: method,
				data: obj
			}));
		};
		ws.on('open', function() {
			var hostname = os.hostname();
			log('connected to server', host, 'as', hostname);
			ws.connected = true;
			ws.send('agent:'+hostname+':'+group);
		});
		ws.on('message', function(msg) {
			var command = JSON.parse(msg);
			var plugin = plugins[command.type];
			if (plugin) {
				var handler = plugin[command.method];
				if (handler) {
					handler.call(ws, command.data);
				} else {
					ws.json('common', 'error', {
						message: 'handler '+command.name+' not found'
					});
				}
			} else {
				ws.json('common', 'error', {
					message: 'plugin '+command.type+' not found'
				});
			}
		});
		ws.on('error', function(err) {
			if (err.code === 'ECONNREFUSED') {
				log('failed to connect to the server. retrying after', retrySec, 'seconds');
				setTimeout(create, retrySec*1000);
			} else {
				log(err.message);
			}
		});
		ws.on('close', function() {
			ws.connected = false;
			log('disconnected from server', host);
			create();
		});
		return ws;
	})();

});
