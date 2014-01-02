"use strict";
function is(o){return typeof o}

is.s = function(o){return is(o) === "string"};
is.o = function(o){return is(o) === "object"};
is.b = function(o){return is(o) === "boolean"};
is.n = function(o){return is(o) === "number"};
is.f = function(o){return is(o) === "function"};
is.u = function(o){return o === undefined};
is.a = function(o){return o instanceof Array};
is.d = function(o){return o instanceof Date};
is.r = function(o){return o instanceof RegExp};
is.ni = function(o){return is.n(o) && !(o % 1)};
is.nn = function(o){return is.ni(o) && o >= 0};


var fn_each_chain_method = function(name){
	if(name){
		this[name] = new Function("cb", "if(is.f(cb)){ this.once('" + name + "', cb) }return this;");
	}
};

var con_emi = process.EventEmitter;

var fn_quick_event_chain_method = function(obj, names){
	names.split(/\s+/).forEach(fn_each_chain_method, obj.prototype);
};
var _emi_ = con_emi.prototype;
fn_quick_event_chain_method(con_emi, "complete success error");

global.is = is;




/* String Prototype Extend */
var
re_key = /{@(\w+(?:\.\w+)*)(\:\w+)?}/g,
re_each_start = /{\$each\s+@([_$\w]+(?:\.[_$\w]+)*)?}/,
re_each_end = /{\/\$each}/,
re_each_tag = new RegExp(re_each_start.source + "|" + re_each_end.source, "g"),
re_each = new RegExp(re_each_start.source + "([\\s\\S]*?" + re_each_end.source + ")", ""),
re_each_g = new RegExp(re_each.source, "g"),

fn_fo = function(t, o){
	o=o||{};
	return t.replace(re_key, function(m, n, a){
		var _;
		try{
			var _=eval("o[\""+n.split(".").join("\"][\"")+"\"]");
		}
		catch(e){}
		return is.u(_)?m:_
	});
},
concat = Array.prototype.concat;




String.prototype.echo = function(data){
	if(is.o(data)){
		return fn_fo(this, data);
	}
	return this;
};
String.prototype.format = function(){
	var j = concat.apply([], arguments), r = [];
	while(j.length){
		r.push(this.echo(j.shift()));
	}
	return r.join("");
};



function _t_l(c, i){
	c.i = i;
	return c.d === this.valueOf();
}
function _t_p(c){
	return c.d === this.d - 1 && c.i < this.i && c.v === 0; 
}
function _t_f(c, i){
	var p = this.filter(_t_p, c).pop();
	if(p){
		p.t.unshift(this.splice(c.i, 1)[0]);
	}
}
function _t_j(d){
	return this.map(_t_m, d).join("");
}
function _t_m(c){
	if(c.v === 0){
		return is.a(this[c.x]) ? this[c.x].map(_t_j, c.t).join("") : "";
	}
	return c.t.echo(this);
}

String.prototype.tmpl = function(){
	if(re_each.test(this)){
		var j = concat.apply([], arguments),r = [];
		var _r = [], dep = 0, pos = 0, mdep = 0, midep = 0;
		t.replace(re_each_tag, function(m, n, i, t){
			if(n){
				_r.push({d:dep, t:t.substring(pos, i), v : 1});
				_r.push({d:dep, n:m, v:0, x : n, t : []});
				dep ++;
				pos = i + m.length;
				mdep = dep;
			}
			else{
				_r.push({t:t.substring(pos, i), d:dep, v : 2});
				pos = i + m.length;
				dep --;
				midep = Math.min(midep, dep);
			}
		});
		if(midep !== 0 || dep !== 0){
			console.log(new Error("Illegal Template."));
		return t}

		_r.push({t:t.substring(pos, t.length), s:j, d:0, v : 1});
		while(mdep){
			_r.filter(_t_l, mdep).reverse().forEach(_t_f, _r);
			mdep --;
		}
		return j.map(_t_j, _r).join("");
	}
	else{
		return this.echo.apply(this, arguments);
	}
};



var re_tmpl = /([\s\S]*?)(?:<%((?:\=|\$\/)?)([\s\S]*?)%>)/g;
var fn_var = function(){ return "_" + Math.random().toString(36).substr(2); };

function run(_t, data, callback){
	var _data = [], v = {}, var_d = fn_var(), var_t = fn_var(),
	last = _t.replace(re_tmpl, function(m, s, t, c, i){
		v["s_" + i] = s;
		_data.push(var_d + ".push(" + var_t + ".s_" + i + ");");
		if(t === "="){
			_data.push(var_d + ".push(" + c.trim() + ");");
		}
		else{
			_data.push(c.trim());
		}
		return "";
	});
	callback = (is.f(callback) ? callback : Function.prototype);
	_data.unshift("var " + var_d + "=[]," + var_t + "=" + JSON.stringify(v) + ";");
	_data.push(var_d + ".join('');");
	try{
		return require("vm").runInNewContext(_data.join("\n"), data) + last;
	}
	catch(e){
		return "\n\n{{{{\n{@message}\n}}}}\n\n".echo(e);
	}
}

String.prototype.run = function(){
	var j = concat.apply([], arguments), r = [];
	while(j.length){
		r.push(run(this, j.shift()));
	}
	return r.join("");
};
