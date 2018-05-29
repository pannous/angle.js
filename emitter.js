// import {Param} from "./ast"; ES7
if(Binaryen=require('binaryen'))'binaryen ok' //node bug?
let wasm = mod = new Binaryen.Module()
let ast = require('./ast')
let {Add} = require('./ast')
// Binaryen.setAPITracing(true)
// Binaryen.setAPITracing(false)

let int=wasm.i32.const
// let float=wasm.f32.const
let float=wasm.f64.const
let f32 = Binaryen.f32;
let f64 = Binaryen.f64;
const i32=Binaryen.i32
const int32=Binaryen.i32
const chars=Binaryen.i32
const I32=wasm.i32
const F32=wasm.f32
const F64=wasm.f64
const local=wasm.getLocal
// const fun=wasm.addFunction
const add = I32.add
let drop = wasm.drop
let none = Binaryen.None;

str=(x)=>x.split('').map(function(x) { return x.charCodeAt(0) })
// const memory = new WebAssembly.Memory({ initial: 10 });
// const arrayBuffer = memory.buffer;
// const buffer = new Uint8Array(arrayBuffer);


// Create a function type for  i32 (i32, i32)  (i.e., return i32, pass two
// i32 params)
// const iii = wasm.addFunctionType('iii', i32, [i32, i32]);


function vari(id) {
	return wasm.getLocal(id)
}

// wasm.addImport("logc", "console", "logc", i_);
// getInt=wasm.callImport("getInt", [], i32)
// log=x=>wasm.callImport("log", [x], none)
// logi=x=>wasm.callImport("logi", [x], none)
// logc=x=>wasm.callImport("logc", [x], none)


function _while(condition,block) {
	label="while"
	body=wasm.if(condition,block,wasm.break(label));
	return wasm.loop(label,body)
}

const local_id={}
function _get(name) {
	let index = local_id[name];
	if(!index)throw new Error("unknown variable "+name)
	return wasm.getLocal(index)
}

function getType(name) {
	return i32 // todo
}

global=name=>wasm.getGlobal(name,getType(name))

function _set(name,val,type) {
	// if(!type)type=getType(val)
	let current_id = local_id.length;
	local_id[name]= current_id
	return wasm.setLocal(current_id,val)
}
_var=_set


function index(name) {
	const index = local_id[name];
	if(!index)throw new Error("unknown variable "+name)
	return index
}

function inc(name, amount=1) {
	_set(name,add(_get(name),int(amount)));
}

function dec(name, amount=1) {
	_set(name,sub(_get(name),int(amount)));
}

// call=wasm.callIndirect()
call=wasm.call
logi= x=>wasm.callImport("logi", [x], Binaryen.None)

function toS(buffer, size=-1, index=0) {
	let s = "";
	//TextDecoder.decode()
	for (let i = index; i < index + size && buffer[i]; ++i)
		s += String.fromCharCode(buffer[i]);
	return s
}

class Visitor{
	visit_number(n){
		if(isInt(n)) return int(n)
		else return float(n)
	}

	visit_string(s){
		todo('visit_string');
	}


	/** @param c Add*/
	visit_Add(c) {
		return I32.add(this.visit(c.left), this.visit(c.right))
	}

	visit_Sub(c) {
		return I32.sub(this.visit(c.left), this.visit(c.right))
	}

	visit_Mult(c) {
		return I32.mul(this.visit(c.left), this.visit(c.right))
	}

	visit_Mod(c) {
		return I32.sub(this.visit(c.left), I32.mul(this.visit(c.right), I32.div_u(this.visit(c.left), this.visit(c.right))));
	}

	visit_Div(c) {
		return I32.div_s(this.visit(c.left), this.visit(c.right))
	}

	visit_And(c) {
		return I32.and(this.visit(c.left), this.visit(c.right))
	}

	visit_Eq(c) {
		return I32.eq(this.visit(c.left), this.visit(c.right))
	}

	visit_BitOr(c) {
		return I32.or(this.visit(c.left), this.visit(c.right))
	}

	visit_Or(c) {
		return I32.or(this.visit(c.left), this.visit(c.right))
	}

	visit_Ge(c) {
		return I32.ge_s(this.visit(c.left), this.visit(c.right))
	}// ...

	visit_BinOp(c) {
		let visitorMethod = this["visit_" + c.op.name];
		if (!visitorMethod)
			throw new Error("UNKNOWN BinOp " + c.op.name)
		else
			return visitorMethod.bind(this)({left: c.left, right: c.right});
	}

	visit_function(f){
		todo("visit_function")
	}

	visit(code){
		// that=this
		let kind=typeof code
		if (kind == "object") kind = code.constructor.name
		let visitorMethod = this["visit_"+kind];
		if(! visitorMethod )
			throw new Error("UNKNOWN KIND "+kind)
		else
			return visitorMethod.bind(this)(code)
	}

	visit_Interpretation(i){
		return this.visit(i.result)
	}

}

run = function run(wasm){
	const binary = wasm.emitBinary? wasm.emitBinary():wasm;
	console.log('binary size: ' + binary.length);
	console.log("========================================");
// wasm.dispose();

	const compiled=new WebAssembly.Module(binary)
	let imports = {
		console:{
			log: x=>console.log(toS(x)),
			logi: x=>console.log(x),
			logc: x=>console.log(char(x))
		},
		imports: {
			getInt: _ => 42,
		},
	};
	const instance = new WebAssembly.Instance(compiled, imports);// starts main!
	return instance.exports.main()
}
function cast(block,type){
	//i32.trunc_s/f32
	if (type == int && block.type == float)
		return I32.trunc_u.f64(block) // i32.trunc_u(block)
	else return block
}
emit=function emit(code){
	let wasm = mod = new Binaryen.Module()
	if(!wasm.defaults) {
		const _void_ = _v_ = wasm.addFunctionType("v", none, []);
		vI = wasm.addFunctionType("vI", i32, []);
		const iV = wasm.addFunctionType("iV", none, [i32]);
		// wasm.addFunctionType("main_type", i32, [])
// const i_ = wasm.addFunctionType("i_", none, [i32]);
		wasm.addFunctionImport("logi", "console", "logi", iV);
		wasm.defaults=true
	}
	wasm.setMemory(1, 256, "mem", [{
		offset: int(10),
		data: str("hello, world")
	}]);
	visitor=new Visitor();
	block=visitor.visit(code)
	if(block.type!=int)
		block=cast(block,int)
	// main=wasm.addFunction("main", _void_, [],
	main = wasm.addFunction("main", wasm.addFunctionType("main_type", i32, []), [],
		wasm.block("main_block", [wasm.return(block),])
	);

	wasm.addExport("main", "main");
	// wasm.setStart(main);
// console.log(wasm.validate());// USELESS!!!
// wasm.autoDrop();
// wasm.optimize();
	console.log(wasm.emitText());
	return run(wasm);
}

module.exports={emit}
