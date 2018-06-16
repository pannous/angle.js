// @flow

const SECTION_TYPE = 1;
const SECTION_IMPORT = 2;
const SECTION_FUNCTION = 3;
const SECTION_TABLE = 4;
const SECTION_MEMORY = 5;
const SECTION_GLOBAL = 6;
const SECTION_EXPORT = 7;
const SECTION_START = 8;
const SECTION_ELEMENT = 9;
const SECTION_CODE = 10;
const SECTION_DATA = 11;
// Custom sections
const SECTION_NAME = 0;


let {
	i32,
	i64,
	f32,
	f64,
	anyfunc,
	func,
	block_type,
	i8,
	u8,
	i16,
	u16,
	u32,
	u64,
	set,
	get,
	sizeof,
}=require("wasm-types")

// import { u8, i32, f32, f64, i64 } from "wasm-types";
// import { varint32, varuint32, varint7, varint64 } from "../numbers";
// import { getTypeString } from "../value_type";
// import OutputStream from "../../utils/output-stream";
// import opcode from "../opcode";
// import emitTables from "./section/table";

let {OutputStream} = require("./utils");

const I32 = 0x7f;
const I64 = 0x7e;
const F32 = 0x7d;
const F64 = 0x7c;
const ANYFUNC = 0x70;
const FUNC = 0x60;
const BLOCK_TYPE = 0x40;

let functions
/*: any[]*/
let table
let memory
let exports_
let globals
let start
let code
let data
let name
let element
let types
let imports
// module.exports={functions ,table ,memory ,exports_ ,globals ,start ,code ,data ,name ,element,types}
// const u32 = "u32";
const varuint7 = "varuint7";
const varuint32 = "varuint32";
const varint7 = "varint7";
const varint1 = "varint1";
const varint32 = "varint32";
const varint64 = "varint64";

const writer = ({
	                type,
	                label,
	                emitter,
                }
                /*: {
									type: number,
									label: string,
									emitter: any,
								}*/
                //                									emitter: any => OutputStream,
) => (ast/*: any*/)/*: ?OutputStream */ => {
	const field = ast[label];
	if (!field || (Array.isArray(field) && !field.length)) {
		return null;
	}

	const stream = new OutputStream().push("u8", type, label + " section");
	const entries = emitter(field);

	stream.push(varuint32, entries.size, "size");
	stream.write(entries);

	return stream;
};


const emitLocal = (stream, local) => {
	if (local.isParam == null) {
		stream.push(varuint32, 1, "number of locals of following type");
		stream.push(varint7, local.type, `${getTypeString(local.type)}`);
	}
};

const emitFunctionBody = (stream, {locals, code, debug: functionName}) => {
	// write bytecode into a clean buffer
	const body = new OutputStream();

	code.forEach(({kind, params, valueType, debug}) => {
		// There is a much nicer way of doing this
		body.push("u8", kind.code, `${kind.text}  ${debug ? debug : ""}`);

		if (valueType) {
			body.push("u8", valueType.type, "result type");
			body.push("u8", valueType.mutable, "mutable");
		}

		// map over all params, if any and encode each on
		params.forEach(p => {
			let type = varuint32;
			let stringType = "i32.literal";

			// Memory opcode?
			if (kind.code >= 0x28 && kind.code <= 0x3e) {
				type = varuint32;
				stringType = "memory_immediate";
			} else {
				// either encode unsigned 32 bit values or floats
				switch (kind.result) {
					case f64:
						type = f64;
						stringType = "f64.literal";
						break;
					case f32:
						type = f32;
						stringType = "f32.literal";
						break;
					case i32:
						type = varint32;
						stringType = "i32.literal";
						break;
					case i64:
						type = varint64;
						stringType = "i64.literal";
						break;
					default:
						type = varuint32;
				}
			}
			body.push(type, p, `${stringType}`);
		});
	});

	// output locals to the stream
	const localsStream = new OutputStream();
	locals.forEach(local => emitLocal(localsStream, local));

	// body size is
	stream.push(varuint32, body.size + localsStream.size + 2, functionName);
	stream.push(varuint32, locals.length, "locals count");

	stream.write(localsStream);
	stream.write(body);
	stream.push("u8", opcode.End.code, "end");
};

const emitCode = (functions/*: any[]*/) => {
	// do stuff with ast
	const stream = new OutputStream();
	stream.push(varuint32, functions.length, "function count");
	functions.forEach(func => emitFunctionBody(stream, func));

	return stream;
};


// import { u8 } from "wasm-types";
// import { varint32, varuint32 } from "../numbers";
// import opcode from "../opcode";
// import OutputStream from "../../utils/output-stream";
// import type { DataSectionType } from "../../generator/flow/types";

const emitDataSegment = (stream, segment) => {
	stream.push(varuint32, 0, "memory index");

	const {offset, data} = segment;

	stream.push("u8", opcode.i32Const.code, opcode.i32Const.text);
	stream.push(varint32, offset, `segment offset (${offset})`);
	stream.push("u8", opcode.End.code, "end");

	stream.push(varuint32, data.size, "segment size");
	// We invert the control here a bit so that any sort of data could be written
	// into the data section. This buys us a bit of flexibility for the cost of
	// doing encoding earlier in the funnel
	stream.write(data);
};

function emitDataSection(dataSection /*:DataSectionType*/)/*: OutputStream*/ {
	const stream = new OutputStream();
	stream.push(varuint32, dataSection.length, "entries");

	for (let i = 0, len = dataSection.length; i < len; i++) {
		const segment = dataSection[i];
		emitDataSegment(stream, segment);
	}

	return stream;
}

// import { u8 } from "wasm-types";
// import { varuint32 } from "../numbers";
// import opcode from "../opcode";
// import OutputStream from "../../utils/output-stream";

/*::
type Element = {
  functionIndex: number,
};
*/
let emitElement = (stream/*: OutputStream*/) => (
	{functionIndex}/*: Element*/,
	index/*: number*/
) => {
	stream.push(varuint32, 0, "table index");
	stream.push("u8", opcode.i32Const.code, "offset");
	stream.push(varuint32, index, index.toString());
	stream.push("u8", opcode.End.code, "end");
	stream.push(varuint32, 1, "number of elements");
	stream.push(varuint32, functionIndex, "function index");
};

const emitElements = (elements/*: Element[]*/) => {
	const stream = new OutputStream();
	stream.push(varuint32, elements.length, "count");

	elements.forEach(emitElement(stream));

	return stream;
};

// import { u8 } from "wasm-types";
// import { varuint32 } from "../numbers";
// import { emitString } from "../string";
// import OutputStream from "../../utils/output-stream";

const emitExports = (exports/*: any[]*/) => {
	const payload = new OutputStream();
	payload.push(varuint32, exports.length, "count");

	exports.forEach(({field, kind, index}) => {
		emitString(payload, field, "field");

		payload.push("u8", kind, "Global");
		payload.push(varuint32, index, "index");
	});

	return payload;
};

// Emits function section. For function code emitter look into code.js
// import { varuint32 } from "../numbers";
// import OutputStream from "../../utils/output-stream";

const emitFunctions = (functions/*: any[]*/) => {
	functions = Array.from(functions).filter(func => func !== null);
	const stream = new OutputStream();
	stream.push(varuint32, functions.length, "count");

	functions.forEach(index => stream.push(varuint32, index, "type index"));

	return stream;
};

// import { u8, f32, f64 } from "wasm-types";
// import { I32, F64, F32, getTypeString } from "../value_type";
// import { varuint32, varint32 } from "../numbers";
// import opcode from "../opcode";
// import OutputStream from "../../utils/output-stream";

function getTypeString(type) {
	return "" + type;
}

const encode = (payload, {type, init, mutable}) => {
	payload.push("u8", type, getTypeString(type));
	payload.push("u8", mutable, "mutable");
	// Encode the constant
	switch (type) {
		case I32:
			payload.push("u8", opcode.i32Const.code, opcode.i32Const.text);
			payload.push(varint32, init, `value (${init})`);
			break;
		case F32:
			payload.push("u8", opcode.f32Const.code, opcode.f32Const.text);
			payload.push(f32, init, `value (${init})`);
			break;
		case F64:
			payload.push("u8", opcode.f64Const.code, opcode.f64Const.text);
			payload.push(f64, init, `value (${init})`);
			break;
	}

	payload.push("u8", opcode.End.code, "end");
};

const emitGlobals = (globals/*: any[]*/) => {
	const payload = new OutputStream();
	payload.push(varuint32, globals.length, "count");

	globals.forEach(g => encode(payload, g));

	return payload;
};

module.exports.global = emitGlobals;

// import OutputStream from "../../utils/output-stream";
// import { u8 } from "wasm-types";
// import { varint1, varuint32 } from "../numbers";
// import { getTypeString, ANYFUNC } from "../value_type";
// import {
//   EXTERN_GLOBAL,
//   EXTERN_FUNCTION,
//   EXTERN_TABLE,
//   EXTERN_MEMORY,
// } from "../external_kind";
// import { emitString } from "../string";

const emitEntries = (entries/*: any[]*/) => {
	const payload = new OutputStream().push(
		varuint32,
		entries.length,
		"entry count"
	);

	entries.forEach(entry => {
		emitString(payload, entry.module, "module");
		emitString(payload, entry.field, "field");

		switch (entry.kind) {
			case EXTERN_GLOBAL: {
				payload.push("u8", EXTERN_GLOBAL, "Global");
				payload.push("u8", entry.type, getTypeString(entry.type));
				payload.push("u8", 0, "immutable");
				break;
			}
			case EXTERN_FUNCTION: {
				payload.push("u8", entry.kind, "Function");
				payload.push(varuint32, entry.typeIndex, "type index");
				break;
			}
			case EXTERN_TABLE: {
				payload.push("u8", entry.kind, "Table");
				payload.push("u8", ANYFUNC, "function table types");
				payload.push(varint1, 0, "has max value");
				payload.push(varuint32, 0, "iniital table size");
				break;
			}
			case EXTERN_MEMORY: {
				payload.push("u8", entry.kind, "Memory");
				payload.push(varint1, !!entry.max, "has no max");
				payload.push(varuint32, entry.initial, "initial memory size(PAGES)");
				if (entry.max) {
					payload.push(varuint32, entry.max, "max memory size(PAGES)");
				}
				break;
			}
		}
	});

	return payload;
};

module.exports.entry = emitEntries;

// import // imports from "./// imports";
// import exports_ from "./exports";
// import globals from "./globals";
// import functions from "./functions";
// import start from "./start";
// import element from "./element";
// import types from "./types";
// import code from "./code";
// import memory from "./memory";
// import table from "./table";
// import data from "./data";
// import name from "./name";
// import {
//   SECTION_TYPE,
//   SECTION_IMPORT,
//   SECTION_FUNCTION,
//   SECTION_MEMORY,
//   SECTION_TABLE,
//   SECTION_GLOBAL,
//   SECTION_EXPORT,
//   SECTION_START,
//   SECTION_ELEMENT,
//   SECTION_CODE,
//   SECTION_DATA,
//   SECTION_NAME,
// } from "./codes";

// import writer from "./writer";

function emitStart(start/*: number[]*/) {
	const stream = new OutputStream();
	if (start.length) {
		stream.push(varuint32, start[0], "start function");
	}
	return stream;
}


// Emits function section. For function code emitter look into code.js
// import { varuint32, varint1 } from "../numbers";
// import OutputStream from "../../utils/output-stream";

const emitEntry = (payload, entry) => {
	payload.push(varint1, entry.max ? 1 : 0, "has no max");
	payload.push(varuint32, entry.initial, "initial memory size(PAGES)");
	if (entry.max) {
		payload.push(varuint32, entry.max, "max memory size(PAGES)");
	}
};
const emitMemories = (memories/*: any[]*/) => {
	const stream = new OutputStream();
	stream.push(varuint32, memories.length, "count");
	memories.forEach(entry => emitEntry(stream, entry));

	return stream;
};

// import { varuint32, varuint7 } from "../numbers";
// import { emitString } from "../string";
// import OutputStream from "../../utils/output-stream";
// import type { NameSectionType } from "../../generator/flow/types";

// Emit Module name subsection
const emitModuleName = (name/*: string*/)/*: OutputStream*/ => {
	const moduleSubsection = new OutputStream();
	emitString(moduleSubsection, name, `name_len: ${name}`);
	return moduleSubsection;
};

// Emit Functions subsection
const emitFunctionNames = (
	names/*: Array<{ index: number, name: string }>*/
)/*: OutputStream*/ => {
	const stream = new OutputStream();

	stream.push(varuint32, names.length, `count: ${String(names.length)}`);
	names.forEach(({index, name}) => {
		stream.push(varuint32, index, `index: ${String(index)}`);
		emitString(stream, name, `name_len: ${name}`);
	});

	return stream;
};

// Emit Locals subsection
const emitLocals = (
	localsMap/*: Array<{
    index: number,
    locals: Array<{ index: number, name: string }>,
  }>*/
)/*: OutputStream*/ => {
	const stream = new OutputStream();

	// WebAssembly Binary Encoding docs are not the best on how this should be encoded.
	// This is pretty much lifted from wabt C++ source code. First comes the number
	// or functions, where each function is a header of a u32 function index followed
	// by locals + params count with each local/param encoded as a name_map
	stream.push(
		varuint32,
		localsMap.length,
		`count: ${String(localsMap.length)}`
	);
	localsMap.forEach(({index: funIndex, locals}) => {
		stream.push(varuint32, funIndex, `function index: ${String(funIndex)}`);
		stream.push(
			varuint32,
			locals.length,
			`number of params and locals ${locals.length}`
		);
		locals.forEach(({index, name}) => {
			stream.push(varuint32, index, `index: ${String(index)}`);
			emitString(stream, name, `name_len: ${name}`);
		});
	});

	return stream;
};

// Emit the Name custom section.
const emitNameSection = (nameSection/*: NameSectionType*/)/*: OutputStream*/ => {
	const stream = new OutputStream();
	// Name identifier/header as this is a custom section which requires a string id
	emitString(stream, "name", "name_len: name");

	// NOTE: Every subsection header is encoded here, not in the individual subsection
	// logic.
	const moduleSubsection = emitModuleName(nameSection.module);
	stream.push(varuint7, 0, "name_type: Module");
	stream.push(varuint32, moduleSubsection.size, "name_payload_len");
	stream.write(moduleSubsection);

	const functionSubsection = emitFunctionNames(nameSection.functions);
	stream.push(varuint7, 1, "name_type: Function");
	stream.push(varuint32, functionSubsection.size, "name_payload_len");
	stream.write(functionSubsection);

	const localsSubsection = emitLocals(nameSection.locals);
	stream.push(varuint7, 2, "name_type: Locals");
	stream.push(varuint32, localsSubsection.size, "name_payload_len");
	stream.write(localsSubsection);

	return stream;
};

module.exports.name = emitNameSection;

// import { varuint32 } from "../numbers";
// import OutputStream from "../../utils/output-stream";

function emitTables(start/*: number[]*/) {
	const stream = new OutputStream();
	if (start.length) {
		stream.push(varuint32, start[0], "start function");
	}

	return stream;
}

// import { varuint32, varint1, varint7 } from "../numbers";
// import OutputStream from "../../utils/output-stream";

const typeBytecodes = {
	anyfunc: 0x70,
};

/*::
type TableEntryType = {
  initial: number,
  max?: number,
  type: string,
};
*/
const emitTableEntry = (payload, entry/*: TableEntryType*/) => {
	payload.push(varint7, typeBytecodes[entry.type], entry.type);
	payload.push(varint1, entry.max ? 1 : 0, "has max");
	payload.push(varuint32, entry.initial, "initial table size");
	if (entry.max) {
		payload.push(varuint32, entry.max, "max table size");
	}
};

function emitTables(tables/*: TableEntryType[]*/) {
	const stream = new OutputStream();
	stream.push(varuint32, tables.length, "count");
	tables.forEach(entry => emitTableEntry(stream, entry));

	return stream;
}

// import { FUNC, getTypeString } from "../value_type";
// import { varuint32, varint7, varint1 } from "../numbers";
// import OutputStream from "../../utils/output-stream";


// import { u8 } from "wasm-types";
// import { varuint32 } from "../numbers";
// import OutputStream from "../../utils/output-stream";


const emitType = (stream, {params/*?: any*/, result}, index) => {
	// as of wasm 1.0 spec types are only of from === func
	if (!params) return // todo
	stream.push(varint7, FUNC, `func type (${index})`);
	stream.push(varuint32, params.length, "parameter count");
	params.forEach(type => stream.push(varint7, type, "param"));
	if (result) {
		stream.push(varint1, 1, "result count");
		stream.push(varint7, result, `result type ${getTypeString(result)}`);
	} else {
		stream.push(varint1, 0, "result count");
	}
};

// let {OutputStream}=require("./utils")
const emitTypes = (types/*: any[]*/) => {
	const stream = new OutputStream();
	stream.push(varuint32, types.length, "count");

	Array.from(types).forEach((type, index) => emitType(stream, type, index));

	return stream;
};


module.exports.imports = writer({type: SECTION_IMPORT, label: "Imports", emitter: emitEntries})
module.exports.type = writer({type: SECTION_TYPE, label: "Types", emitter: emitTypes})
module.exports.function = writer({
	type: SECTION_FUNCTION,
	label: "Functions",
	emitter: functions,
})
module.exports.table = writer({type: SECTION_TABLE, label: "Table", emitter: emitTables})
module.exports.memory = writer({type: SECTION_MEMORY, label: "Memory", emitter: emitMemories})
module.exports.exports = writer({
	type: SECTION_EXPORT,
	label: "Exports",
	emitter: emitExports,
})
module.exports.globals = writer({type: SECTION_GLOBAL, label: "Globals", emitter: emitGlobals})
module.exports.start = writer({type: SECTION_START, label: "Start", emitter: emitStart})
module.exports.element = writer({
	type: SECTION_ELEMENT,
	label: "Element",
	emitter: emitElement,
})
module.exports.code = writer({type: SECTION_CODE, label: "Code", emitter: emitCode})
module.exports.data = writer({type: SECTION_DATA, label: "Data", emitter: emitDataSection})
module.exports.name = writer({type: SECTION_NAME, label: "Name", emitter: emitNameSection})


// let index={
module.exports.todo = {
	function: writer({
		type: SECTION_FUNCTION,
		label: "Functions",
		emitter: functions,
	}),
	table: writer({type: SECTION_TABLE, label: "Table", emitter: table}),
	memory: writer({type: SECTION_MEMORY, label: "Memory", emitter: memory}),
	exports: writer({
		type: SECTION_EXPORT,
		label: "Exports",
		emitter: exports_,
	}),
	globals: writer({type: SECTION_GLOBAL, label: "Globals", emitter: globals}),
	start: writer({type: SECTION_START, label: "Start", emitter: start}),
	element: writer({
		type: SECTION_ELEMENT,
		label: "Element",
		emitter: element,
	}),
	code: writer({type: SECTION_CODE, label: "Code", emitter: code}),
	data: writer({type: SECTION_DATA, label: "Data", emitter: data}),
	name: writer({type: SECTION_NAME, label: "Name", emitter: name}),
};
