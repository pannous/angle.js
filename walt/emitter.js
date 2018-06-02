// @flow
let section = require("./section.js")
const invariant = require("invariant");
require("wasm-types")
/* eslint-env es6 */
/**
 * WASM types
 *
 * https://github.com/WebAssembly/spec/tree/master/interpreter#s-expression-syntax
 *
 * Plus some extra C type mappings
 *
 * @author arthrubuldauskas@gmail.com
 * @license MIT
 */

const i32 = 1;
const i64 = 1 << 1;
const f32 = 1 << 2;
const f64 = 1 << 3;
const anyfunc = 1 << 4;
const func = 1 << 5;
const block_type = 1 << 6;

// C type mappings
const i8 = 1 << 7;
const u8 = 1 << 8;
const i16 = 1 << 9;
const u16 = 1 << 10;
const u32 = 1 << 11;
const u64 = 1 << 12;

// In _bytes_
const word = 4;

const sizeof = {
	[i32]: word,
	[i64]: word * 2,
	[f32]: word,
	[f64]: word * 2,
	[u32]: word,
	[u16]: word >> 1,
	[u8]: word >> 2,
	[i8]: word >> 2,
	[i16]: word >> 1,
	[anyfunc]: word,
	[func]: word,
	[block_type]: word
};

// TODO: Make this configurable.
const LITTLE_ENDIAN = true;

const get = (type, index, dataView) => {
	switch (type) {
		case i32:
			return dataView.getInt32(index, LITTLE_ENDIAN);
		case i64:
			return dataView.getInt64(index, LITTLE_ENDIAN);
		case f32:
			return dataView.getFloat32(index, LITTLE_ENDIAN);
		case f64:
			return dataView.getFloat64(index, LITTLE_ENDIAN);
		case anyfunc:
			return dataView.getUint32(index, LITTLE_ENDIAN);
		case func:
			return dataView.getUint32(index, LITTLE_ENDIAN);
		case i8:
			return dataView.getInt8(index, LITTLE_ENDIAN);
		case u8:
			return dataView.getUint8(index, LITTLE_ENDIAN);
		case i16:
			return dataView.getInt16(index, LITTLE_ENDIAN);
		case u16:
			return dataView.getUint16(index, LITTLE_ENDIAN);
		case u32:
			return dataView.getUint32(index, LITTLE_ENDIAN);
		case u64:
			return dataView.getUint64(index, LITTLE_ENDIAN);
		default:
			return dataView.getUint8(index, LITTLE_ENDIAN);
	}
};

const set = (type, index, dataView, value) => {
	switch (type) {
		case i32:
			return dataView.setInt32(index, value, LITTLE_ENDIAN);
		case i64:
			return dataView.setInt64(index, value, LITTLE_ENDIAN);
		case f32:
			return dataView.setFloat32(index, value, LITTLE_ENDIAN);
		case f64:
			return dataView.setFloat64(index, value, LITTLE_ENDIAN);
		case anyfunc:
			return dataView.setUint32(index, value, LITTLE_ENDIAN);
		case func:
			return dataView.setUint32(index, value, LITTLE_ENDIAN);
		case i8:
			return dataView.setInt8(index, value, LITTLE_ENDIAN);
		case u8:
			return dataView.setUint8(index, value, LITTLE_ENDIAN);
		case i16:
			return dataView.setInt16(index, value, LITTLE_ENDIAN);
		case u16:
			return dataView.setUint16(index, value, LITTLE_ENDIAN);
		case u32:
			return dataView.setUint32(index, value, LITTLE_ENDIAN);
		case u64:
			return dataView.setUint64(index, value, LITTLE_ENDIAN);
		default:
			return dataView.setUint8(index, value, LITTLE_ENDIAN);
	}
}

module.exports = {
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
	sizeof
}


const EXTERN_FUNCTION = 0;
const EXTERN_TABLE = 1;
const EXTERN_MEMORY = 2;
const EXTERN_GLOBAL = 3;


function emit(program/*:ProgramType*/, config/*:ConfigType*/) {
	const stream = new OutputStream();

	// Write MAGIC and VERSION. This is now a valid WASM Module
	const result = stream
		.write(preamble(program.Version))
		.write(section.type(program))
		.write(section.imports(program))
		.write(section.function(program))
		.write(section.table(program))
		.write(section.memory(program))
		.write(section.globals(program))
		.write(section.exports(program))
		.write(section.start(program))
		.write(section.element(program))
		.write(section.code(program))
		.write(section.data(program));

	if (config && config.encodeNames) {
		return result.write(section.name(program));
	}

	return result;
}

// const u32 = "u32";
const varuint7 = "varuint7";
const varuint32 = "varuint32";
const varint7 = "varint7";
const varint1 = "varint1";
const varint32 = "varint32";
const varint64 = "varint64";


/**
 * Ported from https://github.com/WebAssembly/wabt/blob/master/src/opcode.def
 */
const def/*: { [string]:RawOpcodeType}*/ = {};
const opcodeMap = [];
const textMap = {};
const ___ = null;

/**
 * Convert Opcode definiton to usable object(s)
 **/
const opcode = (
	result/*: ?number*/,
	first/*: ?number*/,
	second/*: ?number*/,
	size/*:number*/,
	code/*:number*/,
	name/*:string*/,
	text/*:string*/
) => {
	const definition/*:RawOpcodeType*/ = {
		result,
		first,
		second,
		size,
		code,
		name,
		text,
	};

	def[name] = definition;
	opcodeMap[code] = definition;
	textMap[text] = definition;

	return definition;
};

opcode(___, ___, ___, 0, 0x00, "Unreachable", "unreachable");
opcode(___, ___, ___, 0, 0x01, "Nop", "nop");
opcode(___, ___, ___, 0, 0x02, "Block", "block");
opcode(___, ___, ___, 0, 0x03, "Loop", "loop");
opcode(___, ___, ___, 0, 0x04, "If", "if");
opcode(___, ___, ___, 0, 0x05, "Else", "else");
opcode(___, ___, ___, 0, 0x06, "Try", "try");
opcode(___, ___, ___, 0, 0x07, "Catch", "catch");
opcode(___, ___, ___, 0, 0x08, "Throw", "throw");
opcode(___, ___, ___, 0, 0x09, "Rethrow", "rethrow");
opcode(___, ___, ___, 0, 0x0a, "CatchAll", "catch_all");
opcode(___, ___, ___, 0, 0x0b, "End", "end");
opcode(___, ___, ___, 0, 0x0c, "Br", "br");
opcode(___, ___, ___, 0, 0x0d, "BrIf", "br_if");
opcode(___, ___, ___, 0, 0x0e, "BrTable", "br_table");
opcode(___, ___, ___, 0, 0x0f, "Return", "return");
opcode(___, ___, ___, 0, 0x10, "Call", "call");
opcode(___, ___, ___, 0, 0x11, "CallIndirect", "call_indirect");
opcode(___, ___, ___, 0, 0x1a, "Drop", "drop");
opcode(___, ___, ___, 0, 0x1b, "Select", "select");
opcode(___, ___, ___, 0, 0x20, "GetLocal", "get_local");
opcode(___, ___, ___, 0, 0x21, "SetLocal", "set_local");
opcode(___, ___, ___, 0, 0x22, "TeeLocal", "tee_local");
opcode(___, ___, ___, 0, 0x23, "GetGlobal", "get_global");
opcode(___, ___, ___, 0, 0x24, "SetGlobal", "set_global");
opcode(i32, i32, ___, 4, 0x28, "i32Load", "i32.load");
opcode(i64, i32, ___, 8, 0x29, "i64Load", "i64.load");
opcode(f32, i32, ___, 4, 0x2a, "f32Load", "f32.load");
opcode(f64, i32, ___, 8, 0x2b, "f64Load", "f64.load");
opcode(i32, i32, ___, 1, 0x2c, "i32Load8S", "i32.load8_s");
opcode(i32, i32, ___, 1, 0x2d, "i32Load8U", "i32.load8_u");
opcode(i32, i32, ___, 2, 0x2e, "i32Load16S", "i32.load16_s");
opcode(i32, i32, ___, 2, 0x2f, "i32Load16U", "i32.load16_u");
opcode(i64, i32, ___, 1, 0x30, "i64Load8S", "i64.load8_s");
opcode(i64, i32, ___, 1, 0x31, "i64Load8U", "i64.load8_u");
opcode(i64, i32, ___, 2, 0x32, "i64Load16S", "i64.load16_s");
opcode(i64, i32, ___, 2, 0x33, "i64Load16U", "i64.load16_u");
opcode(i64, i32, ___, 4, 0x34, "i64Load32S", "i64.load32_s");
opcode(i64, i32, ___, 4, 0x35, "i64Load32U", "i64.load32_u");
opcode(___, i32, i32, 4, 0x36, "i32Store", "i32.store");
opcode(___, i32, i64, 8, 0x37, "i64Store", "i64.store");
opcode(___, i32, f32, 4, 0x38, "f32Store", "f32.store");
opcode(___, i32, f32, 8, 0x39, "f64Store", "f64.store");
opcode(___, i32, i32, 1, 0x3a, "i32Store8", "i32.store8");
opcode(___, i32, i32, 2, 0x3b, "i32Store16", "i32.store16");
opcode(___, i32, i64, 1, 0x3c, "i64Store8", "i64.store8");
opcode(___, i32, i64, 2, 0x3d, "i64Store16", "i64.store16");
opcode(___, i32, i64, 4, 0x3e, "i64Store32", "i64.store32");
opcode(i32, ___, ___, 0, 0x3f, "CurrentMemory", "current_memory");
opcode(i32, i32, ___, 0, 0x40, "GrowMemory", "grow_memory");
opcode(i32, ___, ___, 0, 0x41, "i32Const", "i32.const");
opcode(i64, ___, ___, 0, 0x42, "i64Const", "i64.const");
opcode(f32, ___, ___, 0, 0x43, "f32Const", "f32.const");
opcode(f64, ___, ___, 0, 0x44, "f64Const", "f64.const");
opcode(i32, i32, ___, 0, 0x45, "i32Eqz", "i32.eqz");
opcode(i32, i32, i32, 0, 0x46, "i32Eq", "i32.eq");
opcode(i32, i32, i32, 0, 0x47, "i32Ne", "i32.ne");
opcode(i32, i32, i32, 0, 0x48, "i32LtS", "i32.lt_s");
opcode(i32, i32, i32, 0, 0x49, "i32LtU", "i32.lt_u");
opcode(i32, i32, i32, 0, 0x4a, "i32GtS", "i32.gt_s");
opcode(i32, i32, i32, 0, 0x4b, "i32GtU", "i32.gt_u");
opcode(i32, i32, i32, 0, 0x4c, "i32LeS", "i32.le_s");
opcode(i32, i32, i32, 0, 0x4d, "i32LeU", "i32.le_u");
opcode(i32, i32, i32, 0, 0x4e, "i32GeS", "i32.ge_s");
opcode(i32, i32, i32, 0, 0x4f, "i32GeU", "i32.ge_u");
opcode(i32, i64, ___, 0, 0x50, "i64Eqz", "i64.eqz");
opcode(i32, i64, i64, 0, 0x51, "i64Eq", "i64.eq");
opcode(i32, i64, i64, 0, 0x52, "i64Ne", "i64.ne");
opcode(i32, i64, i64, 0, 0x53, "i64LtS", "i64.lt_s");
opcode(i32, i64, i64, 0, 0x54, "i64LtU", "i64.lt_u");
opcode(i32, i64, i64, 0, 0x55, "i64GtS", "i64.gt_s");
opcode(i32, i64, i64, 0, 0x56, "i64GtU", "i64.gt_u");
opcode(i32, i64, i64, 0, 0x57, "i64LeS", "i64.le_s");
opcode(i32, i64, i64, 0, 0x58, "i64LeU", "i64.le_u");
opcode(i32, i64, i64, 0, 0x59, "i64GeS", "i64.ge_s");
opcode(i32, i64, i64, 0, 0x5a, "i64GeU", "i64.ge_u");
opcode(i32, f32, f32, 0, 0x5b, "f32Eq", "f32.eq");
opcode(i32, f32, f32, 0, 0x5c, "f32Ne", "f32.ne");
opcode(i32, f32, f32, 0, 0x5d, "f32Lt", "f32.lt");
opcode(i32, f32, f32, 0, 0x5e, "f32Gt", "f32.gt");
opcode(i32, f32, f32, 0, 0x5f, "f32Le", "f32.le");
opcode(i32, f32, f32, 0, 0x60, "f32Ge", "f32.ge");
opcode(i32, f32, f32, 0, 0x61, "f64Eq", "f64.eq");
opcode(i32, f32, f32, 0, 0x62, "f64Ne", "f64.ne");
opcode(i32, f32, f32, 0, 0x63, "f64Lt", "f64.lt");
opcode(i32, f32, f32, 0, 0x64, "f64Gt", "f64.gt");
opcode(i32, f32, f32, 0, 0x65, "f64Le", "f64.le");
opcode(i32, f32, f32, 0, 0x66, "f64Ge", "f64.ge");
opcode(i32, i32, ___, 0, 0x67, "i32Clz", "i32.clz");
opcode(i32, i32, ___, 0, 0x68, "i32Ctz", "i32.ctz");
opcode(i32, i32, ___, 0, 0x69, "i32Popcnt", "i32.popcnt");
opcode(i32, i32, i32, 0, 0x6a, "i32Add", "i32.add");
opcode(i32, i32, i32, 0, 0x6b, "i32Sub", "i32.sub");
opcode(i32, i32, i32, 0, 0x6c, "i32Mul", "i32.mul");
opcode(i32, i32, i32, 0, 0x6d, "i32DivS", "i32.div_s");
opcode(i32, i32, i32, 0, 0x6e, "i32DivU", "i32.div_u");
opcode(i32, i32, i32, 0, 0x6f, "i32RemS", "i32.rem_s");
opcode(i32, i32, i32, 0, 0x70, "i32RemU", "i32.rem_u");
opcode(i32, i32, i32, 0, 0x71, "i32And", "i32.and");
opcode(i32, i32, i32, 0, 0x72, "i32Or", "i32.or");
opcode(i32, i32, i32, 0, 0x73, "i32Xor", "i32.xor");
opcode(i32, i32, i32, 0, 0x74, "i32Shl", "i32.shl");
opcode(i32, i32, i32, 0, 0x75, "i32ShrS", "i32.shr_s");
opcode(i32, i32, i32, 0, 0x76, "i32ShrU", "i32.shr_u");
opcode(i32, i32, i32, 0, 0x77, "i32Rotl", "i32.rotl");
opcode(i32, i32, i32, 0, 0x78, "i32Rotr", "i32.rotr");
opcode(i64, i64, ___, 0, 0x79, "i64Clz", "i64.clz");
opcode(i64, i64, ___, 0, 0x7a, "i64Ctz", "i64.ctz");
opcode(i64, i64, ___, 0, 0x7b, "i64Popcnt", "i64.popcnt");
opcode(i64, i64, i64, 0, 0x7c, "i64Add", "i64.add");
opcode(i64, i64, i64, 0, 0x7d, "i64Sub", "i64.sub");
opcode(i64, i64, i64, 0, 0x7e, "i64Mul", "i64.mul");
opcode(i64, i64, i64, 0, 0x7f, "i64DivS", "i64.div_s");
opcode(i64, i64, i64, 0, 0x80, "i64DivU", "i64.div_u");
opcode(i64, i64, i64, 0, 0x81, "i64RemS", "i64.rem_s");
opcode(i64, i64, i64, 0, 0x82, "i64RemU", "i64.rem_u");
opcode(i64, i64, i64, 0, 0x83, "i64And", "i64.and");
opcode(i64, i64, i64, 0, 0x84, "i64Or", "i64.or");
opcode(i64, i64, i64, 0, 0x85, "i64Xor", "i64.xor");
opcode(i64, i64, i64, 0, 0x86, "i64Shl", "i64.shl");
opcode(i64, i64, i64, 0, 0x87, "i64ShrS", "i64.shr_s");
opcode(i64, i64, i64, 0, 0x88, "i64ShrU", "i64.shr_u");
opcode(i64, i64, i64, 0, 0x89, "i64Rotl", "i64.rotl");
opcode(i64, i64, i64, 0, 0x8a, "i64Rotr", "i64.rotr");
opcode(f32, f32, f32, 0, 0x8b, "f32Abs", "f32.abs");
opcode(f32, f32, f32, 0, 0x8c, "f32Neg", "f32.neg");
opcode(f32, f32, f32, 0, 0x8d, "f32Ceil", "f32.ceil");
opcode(f32, f32, f32, 0, 0x8e, "f32Floor", "f32.floor");
opcode(f32, f32, f32, 0, 0x8f, "f32Trunc", "f32.trunc");
opcode(f32, f32, f32, 0, 0x90, "f32Nearest", "f32.nearest");
opcode(f32, f32, f32, 0, 0x91, "f32Sqrt", "f32.sqrt");
opcode(f32, f32, f32, 0, 0x92, "f32Add", "f32.add");
opcode(f32, f32, f32, 0, 0x93, "f32Sub", "f32.sub");
opcode(f32, f32, f32, 0, 0x94, "f32Mul", "f32.mul");
opcode(f32, f32, f32, 0, 0x95, "f32Div", "f32.div");
opcode(f32, f32, f32, 0, 0x96, "f32Min", "f32.min");
opcode(f32, f32, f32, 0, 0x97, "f32Max", "f32.max");
opcode(f32, f32, f32, 0, 0x98, "f32Copysign", "f32.copysign");
opcode(f32, f32, f32, 0, 0x99, "f32Abs", "f64.abs");
opcode(f32, f32, f32, 0, 0x9a, "f32Neg", "f64.neg");
opcode(f32, f32, f32, 0, 0x9b, "f32Ceil", "f64.ceil");
opcode(f32, f32, f32, 0, 0x9c, "f32Floor", "f64.floor");
opcode(f32, f32, f32, 0, 0x9d, "f32Trunc", "f64.trunc");
opcode(f32, f32, f32, 0, 0x9e, "f32Nearest", "f64.nearest");
opcode(f32, f32, f32, 0, 0x9f, "f32Sqrt", "f64.sqrt");
opcode(f64, f64, f64, 0, 0xa0, "f64Add", "f64.add");
opcode(f64, f64, f64, 0, 0xa1, "f64Sub", "f64.sub");
opcode(f64, f64, f64, 0, 0xa2, "f64Mul", "f64.mul");
opcode(f64, f64, f64, 0, 0xa3, "f64Div", "f64.div");
opcode(f64, f64, f64, 0, 0xa4, "f64Min", "f64.min");
opcode(f64, f64, f64, 0, 0xa5, "f64Max", "f64.max");
opcode(f64, f64, f64, 0, 0xa6, "f64Copysign", "f64.copysign");
opcode(i32, i64, ___, 0, 0xa7, "i32Wrapi64", "i32.wrap/i64");
opcode(i32, f32, ___, 0, 0xa8, "i32TruncSf32", "i32.trunc_s/f32");
opcode(i32, f32, ___, 0, 0xa9, "i32TruncUf32", "i32.trunc_u/f32");
opcode(i32, f32, ___, 0, 0xaa, "i32TruncSf64", "i32.trunc_s/f64");
opcode(i32, f32, ___, 0, 0xab, "i32TruncUf64", "i32.trunc_u/f64");
opcode(i64, i32, ___, 0, 0xac, "i64ExtendSi32", "i64.extend_s/i32");
opcode(i64, i32, ___, 0, 0xad, "i64ExtendUi32", "i64.extend_u/i32");
opcode(i64, f32, ___, 0, 0xae, "i64TruncSf32", "i64.trunc_s/f32");
opcode(i64, f32, ___, 0, 0xaf, "i64TruncUf32", "i64.trunc_u/f32");
opcode(i64, f32, ___, 0, 0xb0, "i64TruncSf64", "i64.trunc_s/f64");
opcode(i64, f32, ___, 0, 0xb1, "i64TruncUf64", "i64.trunc_u/f64");
opcode(f32, i32, ___, 0, 0xb2, "f32ConvertSi32", "f32.convert_s/i32");
opcode(f32, i32, ___, 0, 0xb3, "f32ConvertUi32", "f32.convert_u/i32");
opcode(f32, i64, ___, 0, 0xb4, "f32ConvertSi64", "f32.convert_s/i64");
opcode(f32, i64, ___, 0, 0xb5, "f32ConvertUi64", "f32.convert_u/i64");
opcode(f32, f32, ___, 0, 0xb6, "f32Demotef64", "f32.demote/f64");
opcode(f32, i32, ___, 0, 0xb7, "f64ConvertSi32", "f64.convert_s/i32");
opcode(f32, i32, ___, 0, 0xb8, "f64ConvertUi32", "f64.convert_u/i32");
opcode(f32, i64, ___, 0, 0xb9, "f64ConvertSi64", "f64.convert_s/i64");
opcode(f32, i64, ___, 0, 0xba, "f64ConvertUi64", "f64.convert_u/i64");
opcode(f32, f32, ___, 0, 0xbb, "f64Promotef32", "f64.promote/f32");
opcode(i32, f32, ___, 0, 0xbc, "i32Reinterpretf32", "i32.reinterpret/f32");
opcode(i64, f32, ___, 0, 0xbd, "i64Reinterpretf64", "i64.reinterpret/f64");
opcode(f32, i32, ___, 0, 0xbe, "f32Reinterpreti32", "f32.reinterpret/i32");
opcode(f32, i64, ___, 0, 0xbf, "f32Reinterpreti64", "f64.reinterpret/i64");

const getTypecastOpcode = (to/*:string*/, from/*:string*/)/*:RawOpcodeType*/ => {
	const toType = to[0];

	if (to === "i32" && from === "i64") {
		return def.i32Wrapi64;
	}
	if (to === "i64" && from === "i32") {
		return def.i64ExtendSi32;
	}

	if (to === "f32" && from === "f64") {
		return def.f32Demotef64;
	}
	if (to === "f64" && from === "f32") {
		return def.f64Promotef32;
	}

	const conversion = toType === "f" ? "ConvertS" : "TruncS";
	return def[to + conversion + from];
};

/**
 * Return opcode mapping to the operator. Signed result is always prefered
 */
const opcodeFromOperator = (
	type/*:string  | null*/,
	value/*:string*/,
)/*:RawOpcodeType*/ => {
	// 100% code coverage is a harsh mistress
	const mapping = {
		"+": def[String(type) + "Add"],
		"-": def[String(type) + "Sub"],
		"*": def[String(type) + "Mul"],
		"/": def[String(type) + "DivS"] || def[String(type) + "Div"],
		"%": def[String(type) + "RemS"] || def[String(type) + "RemU"],
		"==": def[String(type) + "Eq"],
		"!=": def[String(type) + "Ne"],
		">": def[String(type) + "Gt"] || def[String(type) + "GtS"],
		"<": def[String(type) + "Lt"] || def[String(type) + "LtS"],
		"<=": def[String(type) + "Le"] || def[String(type) + "LeS"],
		">=": def[String(type) + "Ge"] || def[String(type) + "GeS"],
		"?": def.If,
		":": def.Else,
		"&": def[String(type) + "And"],
		"|": def[String(type) + "Or"],
		"^": def[String(type) + "Xor"],
		">>": def[String(type) + "ShrS"],
		">>>": def[String(type) + "ShrU"],
		"<<": def[String(type) + "Shl"],
	};

	return mapping[value];
};


const VERSION_1 = 0x1;
const MAGIC = 0x6d736100;
const MAGIC_INDEX = 0;
const VERSION_INDEX = 4;

let preamble = (function write(version/*:number*/) {
		return new OutputStream()
			.push("u32", MAGIC, "\\0asm")
			.push("u32", version, `version ${version}`);
	}
)

function emitString(
	stream/*:OutputStream*/,
	string/*:string*/,
	debug/*:string*/
) {
	stream.push(varuint32, string.length, debug);
	for (let i = 0; i < string.length; i++) {
		stream.push(u8, string.charCodeAt(i), string[i]);
	}
	return stream;
}

const I32 = 0x7f;
const I64 = 0x7e;
const F32 = 0x7d;
const F64 = 0x7c;
const ANYFUNC = 0x70;
const FUNC = 0x60;
const BLOCK_TYPE = 0x40;

const stringToType = {
	i32/*:I32*/,
	i64/*:I64*/,
	f32/*:F32*/,
	f64/*:F64*/,
};

const getTypeString = (type/*:number*/) => {
	switch (type) {
		case I64:
			return "i64";
		case F32:
			return "f32";
		case F64:
			return "f64";
		case FUNC:
			return "func";
		case ANYFUNC:
			return "anyfunc";
		case I32:
		default:
			return "i32";
	}
};
// fns.reduce((f, g) => (...args) => f(g(...args)));


const _debug = (stream/*:OutputStream*/, begin/*:number*/ = 0, end/*:?number*/) => {
	let pc = 0;
	return (
		stream.data
			.slice(begin, end)
			.map(({type, value, debug}) => {
				const pcString = pc
					.toString(16)
					.padStart(8, "0")
					.padEnd(stream.data.length.toString().length + 1);
				let valueString;
				if (Array.isArray(value)) {
					valueString = value
						.map(v => v.toString(16))
						.join()
						.padStart(16);
				} else {
					valueString = value.toString(16).padStart(16);
				}
				const out = `${pcString}: ${valueString} ; ${debug}`;
				pc += sizeof[type] || value.length;
				return out;
			})
			.join("\n") + "\n ============ fin ============="
	);
};


function generateErrorString(
	msg/*:string*/,
	error/*:string*/,
	marker,
	filename/*:string*/,
	func/*:string*/
)/*:string*/ {
	let line;
	let col;
	let end;
	if (marker.start.line !== marker.end.line) {
		end = marker.start.col + 1;
		col = marker.start.col;
		line = marker.start.line;
	} else {
		line = marker.start.line;
		col = marker.start.col;
		end = marker.end.col;
	}
	const Line = (() => {
		if (marker.start.sourceLine !== marker.end.sourceLine) {
			return marker.start.sourceLine + "\n" + marker.end.sourceLine;
		}
		return marker.end.sourceLine;
	})();

	const highlight = new Array(end - col + 1).join("^").padStart(end, " ");
	return (
		"\n" +
		Line +
		"\n" +
		highlight +
		` ${error}` +
		"\n" +
		msg +
		"\n" +
		`  at ${func} (${filename}:${line}:${col})`
	);
}


function hasNode(Type/*:string*/, ast/*:NodeType*/) {
	const test = node => node && node.Type === Type;

	const walker = node => {
		if (node == null) {
			return false;
		}

		return test(node) || node.params.some(walker);
	};

	return walker(ast);
}

const encodeSigned = (value/*:number*/) => {
	const encoding = [];
	while (true) {
		const byte = value & 127;
		value = value >> 7;
		const signbit = byte & 0x40;

		if ((value === 0 && !signbit) || (value === -1 && signbit)) {
			encoding.push(byte);
			break;
		} else {
			encoding.push(byte | 0x80);
		}
	}
	return encoding;
};

const encodeUnsigned = (value/*:number*/) => {
	const encoding = [];
	while (true) {
		const i = value & 127;
		value = value >>> 7;
		if (value === 0) {
			encoding.push(i);
			break;
		}

		encoding.push(i | 0x80);
	}

	return encoding;
};


/*:: type WalkerType = (node:NodeType, childMapper) => NodeType; */

/*:: type VisitorType = { [string]: WalkerType}; */

function mapNode(
	visitor/*:VisitorType*/
) {
	//: (node/*:NodeType*/) => NodeType {
	const nodeMapper = (node/*:NodeType*/)/*:NodeType*/ => {
		if (node == null) {
			return node;
		}

		const mappingFunction/*: WalkerType*/ = (() => {
			if ("*" in visitor && typeof visitor["*"] === "function") {
				return visitor["*"];
			}

			if (node.Type in visitor && typeof visitor[node.Type] === "function") {
				return visitor[node.Type];
			}
			return identity => identity;
		})();

		if (mappingFunction.length === 2) {
			return mappingFunction(node, nodeMapper);
		}

		const mappedNode = mappingFunction(node);
		const params = mappedNode.params.map(nodeMapper);

		return {
			...mappedNode,
			params,
		};
	};

	return nodeMapper;
}


// Used to output raw binary, holds values and types in a large array 'stream'
class OutputStream {
	/*::
  data: Array<any>;
  size:number;
*/
	constructor() {
		// Our data, expand it
		this.data = [];

		// start at the beginning
		this.size = 0;
	}

	push(type/*:string*/, value/*:any*/, debug/*:string*/) {
		let size = 0;
		switch (type) {
			case "varuint7":
			case "varuint32":
			case "varint7":
			case "varint1": {
				// Encode all of the LEB128 aka 'var*' types
				value = encodeUnsigned(value);
				size = value.length;
				invariant(size, `Cannot write a value of size ${size}`);
				break;
			}
			case "u32":
			case "varint32": {
				value = encodeSigned(value);
				size = value.length;
				invariant(size, `Cannot write a value of size ${size}`);
				break;
			}
			case "varint64": {
				value = encodeSigned(value);
				size = value.length;
				invariant(size, `Cannot write a value of size ${size}`);
				break;
			}
			default: {
				size = sizeof[type];
				invariant(size, `Cannot write a value of size ${size}, type ${type}`);
			}
		}

		this.data.push({type, value, debug});
		this.size += size;

		return this;
	}

	// Get the BUFFER, not data array. **Always creates new buffer**
	buffer() {
		const buffer/*:any*/ = new ArrayBuffer(this.size);
		const view = new DataView(buffer);
		let pc = 0;
		this.data.forEach(({type, value}) => {
			if (Array.isArray(value)) {
				value.forEach(v => set(u8, pc++, view, v));
			} else {
				set(type, pc, view, value);
				pc += sizeof[type];
			}
		});
		return buffer;
	}

	// Writes source OutputStream into the current buffer
	write(source/*: ?OutputStream*/) {
		if (source) {
			this.data = this.data.concat(source.data);
			this.size += source.size;
		}

		return this;
	}
}


function prettyPrint(IRList/*: IntermediateOpcodeType[]*/)/*:string*/ {
	return [
		"------ Intermediate Representation ------",
		`Stats: ${IRList.length} nodes`,
		"-----------------------------------------",
		"|   Opcode       |        Parameters    |",
		"|---------------------------------------|",
		...IRList.map(
			({kind: {name}, params}) =>
				`| ${name.padEnd(14)} | ${params.join(",").padEnd(20)} |`
		),
		"----------------- End -------------------",
	].join("\n");
}

/* istanbul ignore file */


const getText = (node/*:NodeType*/)/*:string*/ => {
	const value = node.value || "??";
	const hasType = node.type;
	const type = hasType || "i32";
	const op = opcodeFromOperator({value, type});

	if (!hasType) {
		return op.text.replace("i32", "??");
	}

	return op.text;
};

const parseParams = (node/*:NodeType*/)/*:string*/ => {
	const params = [];
	walkNode({
		[Syntax.Pair]: (pair, _) => {
			params.push(`${pair.params[0].value} ${pair.params[1].value}`);
		},
		[Syntax.Type]: p => {
			params.push(p.value);
		},
	})(node);
	return params.length ? " param(" + params.join(" ") + ")" : "";
};

const parseResult = (node/*: ?NodeType*/)/*:string*/ => {
	if (node == null) {
		return "";
	}
	return " (result " + (node.type || "??") + ")";
};

const typedefString = (node/*:NodeType*/)/*:string*/ => {
	const [paramsNode, resultNode] = node.params;
	return (
		"(type " +
		node.value +
		` (func${parseParams(paramsNode)}${parseResult(resultNode)}))`
	);
};

const getPrinters = add => ({
	[Syntax.Import]: (node, _print) => {
		const [nodes, mod] = node.params;
		walkNode({
			[Syntax.Pair]: ({params}, _) => {
				const {value/*: field*/} = params[0];
				const type = params[1];

				if (type.value === "Memory") {
					const memory = parseBounds(type);
					add(
						`(import "${mod.value}" "${field}" (memory ${memory.initial}${
							memory.max ? memory.max : ""
							}))`
					);
				} else {
					add(`(import "${mod.value}" "${field}" ${typedefString(type)})`);
				}
			},
			[Syntax.Identifier]: (missing, _) => {
				const {value} = missing;
				add(`(import "${mod.value}" "${value}" (type ??))`);
			},
		})(nodes);
	},
	[Syntax.Export]: (node, print) => {
		add("(export", 2);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.GenericType]: (node, _print) => {
		add("(type-generic " + node.value + ")", 0, 0, " pseudo type");
	},
	[Syntax.FunctionCall]: (node, print) => {
		if (node.params.length > 0) {
			add(`(call ${node.value}`, 2);
			node.params.forEach(print);
			add(")", 0, -2);
		} else {
			add(`(call ${node.value})`);
		}
	},
	[Syntax.BinaryExpression]: (node/*:NodeType*/, print) => {
		const text = getText(node);
		add("(" + text, 2);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.ArraySubscript]: (node/*:NodeType*/, print) => {
		add("(i32.add", 2);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.Typedef]: (node, _) => {
		add(typedefString(node));
	},
	[Syntax.Identifier]: node => {
		const scope = node.meta[GLOBAL_INDEX] != null ? "global" : "local";
		add(`(get_${scope} ${node.value})`);
	},
	[Syntax.Constant]: node => {
		add(`(${String(node.type)}.const ${node.value})`);
	},
	[Syntax.FunctionDeclaration]: (node, print) => {
		const [params, result, ...rest] = node.params;
		add(`(func ${node.value}${parseParams(params)}${parseResult(result)}`, 2);

		rest.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.ReturnStatement]: (node, print) => {
		add("(return", 2);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.Declaration]: (node, print) => {
		const mutability = node.meta[TYPE_CONST] != null ? "immutable" : "mutable";
		add(
			"(local " + node.value + " " + String(node.type),
			2,
			0,
			` ${mutability}`
		);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.ImmutableDeclaration]: (node, print) => {
		const scope = node.meta[GLOBAL_INDEX] != null ? "global" : "local";
		if (node.type === "Memory") {
			const memory = parseBounds(node);
			add(`(memory ${memory.initial}${memory.max ? ` ${memory.max}` : ""})`);
		} else {
			add(
				`(${scope} ` + node.value + " " + String(node.type),
				2,
				0,
				" immutable"
			);
			node.params.forEach(print);
			add(")", 0, -2);
		}
	},
	[Syntax.StringLiteral]: node => {
		add("(i32.const ??)", 0, 0, ` string "${node.value}"`);
	},
	[Syntax.Type]: node => {
		add(node.value);
	},
	[Syntax.TypeCast]: (node/*: TypeCastType*/, print) => {
		const from = node.params[0];
		const op = getTypecastOpcode(String(node.type), from.type);
		add("(" + op.text, 2);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.ArraySubscript]: (node, print) => {
		add("(" + String(node.type) + ".load", 2, 0);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.MemoryAssignment]: (node, print) => {
		add("(" + String(node.type) + ".store", 2, 0);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.Assignment]: (node, print) => {
		const [target, ...params] = node.params;
		const scope = target.meta[GLOBAL_INDEX] != null ? "global" : "local";
		add(`(set_${scope} ${target.value}`, 2);
		params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.TernaryExpression]: (node, print) => {
		const [condition, options] = node.params;
		add("(select", 2);
		print(options);
		print(condition);
		add(")", 0, -2);
	},
	[Syntax.IfThenElse]: (node, print) => {
		const [condition, then, ...rest] = node.params;
		add("(if", 2);
		print(condition);
		add("(then", 2);
		print(then);
		add(")", 0, -2);
		if (rest.length > 0) {
			add("(else", 2);
			rest.forEach(print);
			add(")", 0, -2);
		}
		add(")", 0, -2);
	},
	[Syntax.ObjectLiteral]: (_, __) => {
	},
});

const printNode = (node/*?: NodeType*/)/*:string*/ => {
	if (node == null) {
		return "";
	}

	let depth = 0;
	const offsets = [];
	const pieces = [];
	const comments = [];
	const add = (piece, post = 0, pre = 0, comment = "") => {
		depth += pre;
		comments.push(comment);
		pieces.push(piece);
		offsets.push(depth + piece.length);
		depth += post;
	};

	walkNode(getPrinters(add))(node);

	const max = Math.max(...offsets);
	const edge = max + 4;
	const result = pieces.reduce((acc, val, i) => {
		acc +=
			val.padStart(offsets[i], " ").padEnd(edge, " ") +
			";" +
			comments[i] +
			"\n";
		return acc;
	}, "");

	return result;
};


const parseBounds = node => {
	const memory = {};
	walkNode({
		[Syntax.Pair]: ({params}) => {
			const [{value: key}, {value}] = params;
			memory[key] = parseInt(value);
		},
	})(node);
	return memory;
};


// Base Character stream class
class Stream {
	// input/*:string*/;
	// pos/*:number*/;
	// line/*:number*/;
	// col/*:number*/;
	// lines/*:string[]*/;

	constructor(input/*:string*/) {
		this.pos = this.line = this.col = 0;
		this.input = input;
		this.lines = input.split("\n");
		this.newLine();
	}

	// Is the character an end of line
	static eol(char/*:string*/)/*: boolean*/ {
		return char === "\n";
	}

	// Is the character an end of file
	static eof(char/*:string*/)/*: boolean*/ {
		return char === "";
	}

	// Is the charater a whitespace
	static whitespace(char/*:string*/)/*: boolean*/ {
		return (
			char === "\n" ||
			char === " " ||
			char === "\t" ||
			char === "\v" ||
			char === "\r" ||
			char === "\f"
		);
	}

	// Peek at a character at current position
	peek()/*:string*/ {
		return this.input.charAt(this.pos);
	}

	// Advance to next character in stream
	next()/*:string*/ {
		const char = this.input.charAt(this.pos++);

		if (Stream.eol(char)) {
			this.newLine();
		} else {
			this.col++;
		}

		return char;
	}

	// Begin a new line
	newLine() {
		this.line++;
		this.col = 0;
	}
}


function* stringDecoder(view, start) {
	let length = 0;
	let index = 0;
	let shift = 0;
	let addr = start;
	while (true) {
		const byte = view.getUint8(addr, true);
		length |= (byte & 0x7f) << shift;
		addr += 1;
		if ((byte & 0x80) === 0) {
			break;
		}
		shift += 7;
	}

	let result = 0;
	while (index < length) {
		result = 0;
		shift = 0;
		while (true) {
			const byte = view.getUint8(addr, true);
			result |= (byte & 0x7f) << shift;
			addr += 1;
			if ((byte & 0x80) === 0) {
				break;
			}
			shift += 7;
		}
		index += 1;
		yield result;
	}
}

function stringEncoder(value) {
	const resultStream = new OutputStream();
	const characterStream = new OutputStream();

	characterStream.push("varuint32", value.length, value);
	let i = 0;
	for (i = 0; i < value.length; i++) {
		characterStream.push("varuint32", value.codePointAt(i), value[i]);
	}
	resultStream.write(characterStream);

	return resultStream;
}

/*:: type StringIterator = {
  length: i32,
  index: i32,
  addr: i32,
  start: i32,
  value: i32,
  done: i32
};
*/
let offset/*:i32*/ = 0;

function malloc(size/*:i32*/) /*:i32*/ {
	const pointer/*:i32*/ = __DATA_LENGTH__ + offset;
	offset += size;
	return pointer;
}

let iterator // global!
// Create string iterator object.
function getStringIterator(addr/*:i32*/) /*:StringIterator*/ {
	// const iterator/*:StringIterator*/ = malloc(sizeof(StringIterator));
	let length/*:i32*/ = 0;
	let byte/*:i32*/ = 0;
	let shift/*:i32*/ = 0;

	// Decode varuint32 length header
	while (true) {
		byte = i32.load8_u(addr);
		length = length | ((byte & 0x7f) << shift);
		addr += 1;
		if ((byte & 0x80) == 0) {
			break;
		}
		shift += 7;
	}

	iterator = {done: false, length, index: 0, addr, start/*: addr*/};

	return iterator;
}

function next(iterator/*:StringIterator*/)/*:StringIterator*/ {
	if (iterator.length == 0 || iterator.index == iterator.length) {
		iterator.done = true;
		iterator.value = 0;
		return iterator;
	}

	let value/*:i32*/ = 0;
	let shift/*:i32*/ = 0;
	let byte/*:i32*/ = 0;
	let addr/*:i32*/ = iterator.addr;

	while (true) {
		byte = i32.load8_u(addr);
		value = value | ((byte & 0x7f) << shift);
		addr += 1;
		if ((byte & 0x80) == 0) {
			break;
		}
		shift += 7;
	}

	iterator = {
		index: iterator.index + 1,
		addr,
		value
	};

	return iterator;
}

function reset(iterator/*:StringIterator*/) {
	iterator = {
		addr: iterator.start,
		index: 0,
		done: 0,
		value: 0
	};
}

const harness = filepath => t => {
	const memory = new WebAssembly.Memory({initial/*: 1*/});
	const view = new DataView(memory.buffer);

	const build = link(
		filepath,
		{logger/*: console*/},
		{
			mapNode,
			walkNode,
			parser,
			semantics,
			validate,
			emitter,
			generator,
			prettyPrintNode,
		}
	);
	return build({
		env: {
			memory,
			log: console.log,
			assert(strPointer, value, expected) {
				let text = "";

				const decoder = stringDecoder(view, strPointer);
				let iterator = decoder.next();
				while (!iterator.done) {
					text += String.fromCodePoint(iterator.value);
					iterator = decoder.next();
				}

				t.is(value, expected, text);
			},
		},
	}).then(module => module.instance.exports.run());
};


/*:: type TokenStream = {
  next: () => TokenType,
  peek: () => TokenType,
  last: () => TokenType,
  tokens: TokenType[],
};
*/

function tokenStream(tokens/*: TokenType[]*/)/*: TokenStream*/ {
	const length = tokens.length;
	let pos = 0;

	const next = () => tokens[++pos];
	const peek = () => tokens[pos + 1];
	const last = () => tokens[length - 1];

	return {tokens, next, peek, last, length};
}

/**
 * A very basic trie with functional,recursive search
 */
const fsearch = node => {
	const next = (char/*:string*/) => {
		if (node && node.children[char]) {
			return fsearch(node.children[char]);
		}

		return null;
	};

	next.leaf = node.leaf;

	return next;
};

/*:: type Node = {
  char:string,
  children: { [string]: Node},
  leaf: boolean,
};*/

class Trie {
	/*::
	root: Node;
  fsearch;
*/
	constructor(words/*: Array<string>*/) {
		this.root = {
			char: "",
			children: {},
			leaf: false,
		};

		words.map(word => this.add(word));
		this.fsearch = fsearch(this.root);
	}

	add(word/*:string*/) {
		let current = this.root;
		let char = word.slice(0, 1);

		word = word.slice(1);

		while (typeof current.children[char] !== "undefined" && char.length > 0) {
			current = current.children[char];
			char = word.slice(0, 1);
			word = word.slice(1);
		}

		while (char.length > 0) {
			const node = {
				char,
				children: {},
				leaf: false,
			};

			current.children[char] = node;
			current = node;
			char = word.slice(0, 1);
			word = word.slice(1);
		}

		current.leaf = true;
	}
}

module.exports = Trie;


/*:: type WalkerType = (node, childMapper) => any | void;*/
/*:: type VisitorType = { [string]: WalkerType};*/

// Dead simple AST walker, takes a visitor object and calls all methods for
// appropriate node Types.
function walker(visitor/*:VisitorType*/)/*:(node: NodeType) => NodeType*/ {
	const walkNode = (node/*:NodeType*/)/*:NodeType*/ => {
		if (node == null) {
			return node;
		}
		const {params} = node;

		const mappingFunction/*: WalkerType*/ = (() => {
			if ("*" in visitor && typeof visitor["*"] === "function") {
				return visitor["*"];
			}

			if (node.Type in visitor && typeof visitor[node.Type] === "function") {
				return visitor[node.Type];
			}

			return () => node;
		})();

		if (mappingFunction.length === 2) {
			mappingFunction(node, walkNode);
			return node;
		}

		mappingFunction(node);
		params.forEach(walkNode);

		return node;
	};

	return walkNode;
}

module.exports = {emit}
