"use strict";
module.paths[module.paths.length] = process.cwd() + '/lib';var
http = require("http"),
url = require("url"),
zlib = require("zlib"),
fs = require("fs"),
os = require("os"),
path = require("path"),
querystring = require("querystring"),
mime = require("mime").types,

re_compress_gzip = /\bgzip\b/i,
re_compress_deflate = /\bdeflate\b/i,
re_compressible = /\btext\b|script\b/i,
emf = Function.prototype;

require("base");


/*  helper  */
var arr_stat = Object.keys(fs.Stats.prototype).filter(function(key){
	return key.indexOf("is") === 0;
});
var arr_units = ["bytes", "KB", "MB", "GB", "TB"];
var fn_computer_size = function(s){
	var u = 0;
	while(s > 1000){
		u ++
		s /= 1024;
	}
	return (Math.round(s * 1000) / 1000) + " " + arr_units[u] + ".";
}


function Stats(str_path){
	if(!(this instanceof Stats)){
		return new Stats(str_path);
	}
	process.EventEmitter.apply(this, arguments);
	var _ = this;
	fs.stat(str_path, function(err, stat){
		if(err){ _.emit("error", err); _.emit("complete"); }
		else{
			var props = {};
			var arr_stat = Object.keys(stat);
			for(var i = 0; i < arr_stat.length; i ++){
				_[arr_stat[i]] = stat[arr_stat[i]];
			}
			_.fullpath = path.resolve(str_path);
			_.name = path.basename(str_path);
			_.dirname = path.dirname(str_path);
			_.extname = path.extname(str_path).substr(1);
			_.csize = fn_computer_size(stat.size),
			_.type = stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "unknown";

			_.emit("success");
			_.emit("complete");
		}
	});
}
var _stat_ = Stats.prototype;
_stat_.__proto__ = process.EventEmitter.prototype;
_stat_.subs = function(cb){
	cb = is.f(cb) ? cb : emf;
	if(this.type === "directory"){
		var _ = this;
		fs.readdir(this.fullpath, function(err, files){
			if(err){
				cb.call(_, err);
				_.emit("error", err);
				_.emit("complete");
			}
			else{
				var i = 0;
				_.files = [];
				_.dirs = [];
				if(files.length){
					files.forEach(function(name){
						new Stats(path.join(_.fullpath, name)).complete(function(){
							switch(this.type){
								case "directory" : _.dirs.push(this); break;
								case "file" : _.files.push(this); break;
							}
							i ++;
							if(i >= files.length){
								cb.call(_, null, _.dirs, _.files);
								_.emit("success");
								_.emit("complete");
							}
						});
					});
				}
				else{
					cb.call(_, null, _.dirs, _.files);
					_.emit("success");
					_.emit("complete");
				}
			}
		});
	}
	else{
		cb.call(this, new Error("'{@fullpath}' is not directory".echo(this)));
	}
	return this;
};
_stat_.read = function(cb){
	cb = is.f(cb) ? cb : emf;
	if(this.type === "file"){
		var _ = this;
		fs.readFile(this.fullpath, function(err, buffer){
			if(err){ cb(err); _.emit("error", err); _.emit("complete"); }
			else{
				cb.call(_, null, buffer);
				_.emit("success", buffer);
				_.emit("complete");
			}
		})
	}
	else{
		cb.call(this, new Error("'{@fullpath}' is not file".echo(this)));
	}
	return this;
};
_stat_.write = function(cb){

};



var str_index_tmpl = "<!DOCTYPE html><html><head><meta charset='utf-8'/><title>file list</title><style>table{font-size:12px;font-family:helvetica,arial,sans-serif;}td{padding:4px;}thead td{background:#ccc;color:#333;}td a{text-decoration:none;}tr.directory{}tr.file{}tbody tr:hover{background:#fee;}.size{text-align:right;}</style></head><body><table width='100%' cellspacing='0' cellpadding='0' border='0'><caption><a href='..'>..</a></caption><thead><tr><td>name</td><td class='size'>size</td><td>Modified Time</td><td>Created Time</td></tr></thead><tbody>"
+ "<%[].concat(dirs, files).forEach(function(f){ %><tr class='<%=f.type%>'><td><a href='<%=encodeURI(f.name) + (f.type==='directory'?'/':'')%>'><%=f.name + (f.type==='directory'?'/':'')%></a></td><td class='size'><%=f.csize%></td><td><%=f.mtime%></td><td><%=f.ctime%></td></tr><% });%>"
+ "</tbody></table></body></html>";
var str_code_page = "<!DOCTYPE html><html><head><meta charset=utf-8 /><title>{@title}</title></head><body>{@content}</body></html>";


var _req_ = http.IncomingMessage.prototype;
var _res_ = http.ServerResponse.prototype;

var fn_each_cookie = function(c){
	if(c.trim()){
		c = c.trim().split("=");
		this[c[0]] = c[1] || "";
	}
};

Object.defineProperties(_req_, {
	cookies : {
		get : function(){
			var cookies = {};
			(this.headers["cookie"] || "").split(";")
				.forEach(fn_each_cookie, cookies);
			return cookies;
		}
	},
	ohref : { get : function(){ return (is.f(this.socket.server.addContext) ? "https://" : "http://") + this.headers["host"] + this.url } },
	href : { get : function(){ return (is.f(this.socket.server.addContext) ? "https://" : "http://") + this.headers["host"] + path.normalize(this.url) } },
	uri : { get : function(){ return url.parse(this.href, true) } },
	ouri : { get : function(){ return url.parse(this.ohref, true) } },
	params : { get : function(){ return this.uri.query } },
	remoteAddress : { get : function(){ return this.scoket.remoteAddress } },
	remotePort : { get : function(){ return this.socket.remotePort } },
	localAddress : { get : function(){ return this.scoket.localAddress } },
	localPort : { get : function(){ return this.socket.localPort } },
	allowDeflate : { get : function(){ return re_compress_deflate.test(this.headers["accept-encoding"]) } },
	allowGzip : { get : function(){ return re_compress_gzip.test(this.headers["accept-encoding"]) } }
});




function Cookie(key, value, expires, domain, path){
	this.key = (is.s(key) && key.trim().length) ? key.trim() : undefined;
	if(this.key){
		this.value = value;
		this.expires = is.n(expires) ? expires : undefined;
		this.domain = domain;
		this.path = path;
	}
}

Cookie.prototype.toString = function(){
	var obj = JSON.parse(JSON.stringify(this));
	return (obj.key ? (escape(obj.key) + "=" + escape(obj.value ? obj.value : "")) : "")
		+ (obj.expires ? (";expires=" + new Date(obj.expires).toGMTString()) : "")
		+ (obj.domain ? (";domain=" + escape(obj.domain)) : "")
		+ (obj.path ? (";path=" + escape(obj.path)) : "");
};


Object.defineProperties(_res_, {
	compressible : { get : function(){ return re_compressible.test(this.getHeader("Content-Type")) } }
});

_res_.writeCookie = function(key, value, expires, domain, path){
	var cookie = new Cookie(key, value, expires, domain, path);
	if(cookie.toString()){
		var cookies = this.getHeader("Set-Cookie");
		if(cookies){
			if(is.a(cookies)){
				cookies.push(cookie);
			}
			else if(is.s(cookies)){
				cookies = [cookies, cookie.toString()];
			}
			this.removeHeader("Set-Cookie");
		}
		else{
			cookies = [cookie.toString()];
		}
		this.setHeader("Set-Cookie", cookies);
	}
};
_res_.setCookie = _res_.writeCookie;
_res_.removeCookie = function(key, domain, path){
	this.writeCookie(key, undefined, new Date(0), domain, path);
};


_res_.redirect = function(uri){
	this.setHeader("Content-Type", "text/html");
	this.setHeader("Location", is.s(uri) ? uri : url.format(uri));
	this.statusCode = 301;
	this.end();
};


_res_.renderCode = function(code){
	if(code in http.STATUS_CODES){
		this.setHeader("Content-Type", "text/html");
		this.statusCode = code;
		this.render(str_code_page.echo({
			title : code,
			content : "<p>" + http.STATUS_CODES[code] + "</p>"
		}));
	}
	else{
		this.renderCode(403);
	}
};

_res_.render = function(str, data){
	this.end(str.echo(data));
};


var _log_dir_root, re_log_unchar = /[\:]/g
function server_log(type, uri, log, log_dir_root){
try{
	if(_log_dir_root){
		fs.appendFile(
			path.join(_log_dir_root, "[" + [type, uri.host.replace(re_log_unchar, "_")].join("][") + "].log"),
			log,
			function(err){
				if(err){
					_log_dir_root = os.tmpdir();
					server_log(type, log, _log_dir_root);
				}
			}
		);
	}
	else{
		fs.stat(log_dir_root, function(err, stat){
			if(err){
				_log_dir_root = os.tmpdir();
			}
			else if(stat.isDirectory()){
				_log_dir_root = log_dir_root;
			}
			server_log(type, uri, log, _log_dir_root);
		});
	}
}catch(e){ console.log("==-=",e); }
}



function Locate(method, re, handler, root, age, index, autoindex){
	if(!(this instanceof Locate)){
		return new Locate(method, re, handler, root, age, index, autoindex);
	}
	var _method = "GET";
	var _re = new RegExp;
	var _handler = null;
	var _root = null;
	var _age = 0;
	var _index = "";
	var _autoindex = false;
	Object.defineProperties(this, {
		method : {
			get : function(){ return _method; },
			set : function(method){
				if(is.s(method) && method.trim()){
					_method = method.trim().toUpperCase();
				}
			}
		},
		re : {
			get : function(){ return _re; },
			set : function(re){
				if(is.s(re) && re){
					_re = re;
				}
				else if(is.r(re)){
					_re = re;
				}
			}
		},
		handler : {
			get : function(){ return _handler; },
			set : function(handler){
				if(is.f(handler)){
					_handler = handler;
				}
			}
		},
		root : {
			get : function(){ return _root; },
			set : function(root){
				if(is.s(root) && root){
					_root = root;
				}
			}
		},
		age : {
			get : function(){ return _age; },
			set : function(age){
				if(is.n(age) && age >= 0){
					_age = age;
				}
			}
		},
		index : {
			get : function(){ return _index; },
			set : function(index){
				if(is.s(index) && index.trim()){
					_index = index.trim();
				}
			}
		},
		autoindex : {
			get : function(){ return _autoindex; },
			set : function(autoindex){
				_autoindex = Boolean(autoindex);
			}
		}
	});
	this.method = method;
	this.re = re;
	this.handler = handler;
	this.root = root;
	this.age = age;
	this.index = index;
	this.autoindex = autoindex;
}




var fn_method_filter = function(locate){
	return locate.method === this.valueOf();
};


var fn_every_locate = function(locate){
	if(
		(is.s(locate.re) && this.uri.pathname.indexOf(locate.re) === 0) ||
		(is.r(locate.re) && locate.re.test(this.uri.pathname))
	){
		if(is.f(locate.handler)){
			return locate.handler(this.request, this.response);
		}
		else if(is.s(locate.root)){
			var root = locate.root.echo(this.uri);
			var pathname = decodeURI(this.uri.pathname);
			var fullpath = path.join(root, pathname.replace(locate.re, ""));
			var request = this.request;
			var response = this.response;
			var uri = this.uri;

			new Stats(fullpath).success(function(){
				fn_render_static_content(this, request, response, locate, uri);
			}).error(function(){
				response.renderCode(404);
			});
			return false;
		}
		return true;
	}
	else{
		return true;
	}
	return true;
};

var fn_request_handle = function(request, response){
	response.setHeader("Server", "KIT");
	response.setHeader("X-Powered-By", "AJC");
	response.setHeader("Content-Type", "application/octet-stream");
	response.sendDate = this.sendDate || false;
	this.request = request;
	this.response = response;
	this.uri = request.uri;
	if(this.locates.filter(fn_method_filter, request.method).every(fn_every_locate, this)){
		response.renderCode(403);
	}
};

function HTTPD(){
	if(!(this instanceof HTTPD)){
		return new HTTPD();
	}
	http.Server.apply(this, arguments);
	this.locates = [];
	this.on("request", fn_request_handle);
}

var _httpd_ = HTTPD.prototype;
_httpd_.__proto__ = http.Server.prototype;
_httpd_.locate = function(method, re, handler, root, age, index, autoindex){
	var locate = new Locate(method, re, handler, root, age, index, autoindex);
	this.locates.unshift(locate);
	return locate;
};
_httpd_.get = function(re, handler, root, age, index, autoindex){
	return this.locate("GET", re, handler, root, age, index, autoindex);
};
_httpd_.put = function(re, handler, root, age, index, autoindex){
	return this.locate("PUT", re, handler, root, age, index, autoindex);
};
_httpd_.post = function(re, handler, root, age, index, autoindex){
	return this.locate("POST", re, handler, root, age, index, autoindex);
};
_httpd_.delete = function(re, handler, root, age, index, autoindex){
	return this.locate("DELETE", re, handler, root, age, index, autoindex);
};


_httpd_.sendDate = false;
_httpd_.autoindex = false;
_httpd_.fixdirname = true;
_httpd_.index = "";


var fn_render_static_content = function(stat, request, response, locate, uri){
	if(stat.type === "directory"){
		if(uri.pathname.substr(-1) !== "/"){
			uri.pathname += "/";
			response.redirect(uri);
			return;
		}
		fn_render_index_content.apply(null, arguments);
	}
	else if(stat.type === "file"){
		fn_render_local_content.apply(null, arguments);
	}
	else{
		response.renderCode(403);
	}
};

var fn_render_index_content = function(stat, request, response, locate, uri){
	var s = stat.subs().success(function(){
		if(locate.index){
			var files = this.files;
			var index = (locate.index || "")
				.split(/\s+/)
				.filter(function(c){return c});
			var fn_some_index = function(name){
				if(files.some(fn_some_files)){
					return true;
				}
				return false;
			};
			var fn_some_files = function(file){
				if(file.name === name){
					fn_render_local_content(file, request, response, locate, uri);
					return true;
				}
				return false;
			};

			if(index.some(fn_some_index)){}
			else{
				response.renderCode(404);
			}
		}
		else if(locate.autoindex){
			response.setHeader("Content-Type", "text/html");
			response.statusCode = 200;
			stat.base = path.relative(locate.root.echo(uri), stat.fullpath) ?
					(stat.name + (uri.pathname.substr(-1) === "/" ? "" : "/")) : "";
			response.end(str_index_tmpl.run(stat));
		}
		else{
			response.renderCode(403);
		}
	}).error(function(){
		response.renderCode(403);
	});
};
var fn_render_local_content = function(stat, request, response, locate, uri){
	if(mime[stat.extname.toLowerCase()]){
		response.setHeader("Content-Type", mime[stat.extname.toLowerCase()]);

	}
	response.setHeader("Last-Modified", stat.mtime.toGMTString());
	if(locate.age){
		response.setHeader("Cache-Control", "max-age=" + locate.age);
		response.setHeader("Expires", new Date(Date.now() + locate.age * 1000).toGMTString());
	}
	if(request.headers["if-modified-since"] === stat.mtime.toGMTString()){
		response.statusCode = 304;
		response.end();
	}
	else{
		response.statusCode = 200;
		var raw = fs.createReadStream(stat.fullpath);
		if(response.compressible){
			if(request.allowGzip){
				response.setHeader("Content-Encoding", "gzip");
				raw.pipe(zlib.createGzip()).pipe(response);
			}
			else if(request.allowDeflate){
				response.setHeader("Content-Encoding", "deflate");
				raw.pipe(zlib.createDefkate()).pipe(response);
			}
			else{
				raw.pipe(response);
			}
		}
		else{
			raw.pipe(response);
		}
	}
};


module.exports.create = function(){
	return new HTTPD();
};
module.exports.HTTPD = HTTPD;

//new HTTPD().listen(800).get("/ajc", null, "/").autoindex = true;