"use strict";
if(process.argv.length < 5){
	console.log("!!!!");
	return;
}
var arr_args = process.argv;
var str_self = arr_args[1];
var str_worker = arr_args[2];
var num_port = parseInt(arr_args[3]);
var dea_args = arr_args.slice(1);
var worker_args = arr_args.slice(3);


var cp = require("child_process");
if(process.stdin.isTTY && arr_args[arr_args.length - 1] !== "tty"){
var deamon = cp.spawn(process.execPath, dea_args, {
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


var Workers = function(){};

var _ws = Workers.prototype;
_ws.__proto__ = Array.prototype;
_ws.create = function(){
	var _ = this;
	var c = cp.fork(str_worker, worker_args);
	c.on("message", emf);
	c.on("error", emf);
	c.on("exit", function(code, sig){
		if(sig){}
		else{ _.create(); }
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

var TCP = process.binding("tcp_wrap").TCP;
var _fd_ = new TCP();
_fd_.bind("0.0.0.0", num_port);

var workers = new Workers();
for(var i = 0, l = Math.max(os.cpus.length, 2); i < l; i ++){
	workers.create();
}


process.on("uncaughtException", function(){
	console.log(arguments);
});


/*  lallaalala end  */
}
