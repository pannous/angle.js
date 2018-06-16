// fns.reduce((f, g) => (...args) => f(g(...args)));

const invariant = require("invariant");

const _debug = (stream/*: OutputStream*/, begin/*: number*/ = 0, end/*: ?number*/) => {
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
	marker/*: {
    start: { sourceLine: string, line: number, col: number },
    end: { sourceLine: string, line: number, col: number },
  }*/,
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


function hasNode(Type/*:string*/, ast/*: NodeType*/) {
	const test = node => node && node.Type === Type;

	const walker = node => {
		if (node == null) {
			return false;
		}

		return test(node) || node.params.some(walker);
	};

	return walker(ast);
}

const encodeSigned = (value/*: number*/) => {
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

const encodeUnsigned = (value/*: number*/) => {
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

/*::
type WalkerType = (node: NodeType, childMapper: any) => NodeType;
type VisitorType = { [string]: WalkerType };
*/
function mapNode(
	visitor/*: VisitorType*/
)/*: (node: NodeType) => NodeType*/ {
	const nodeMapper = (node/*: NodeType/*/)/*: NodeType*/ => {
		if (node == null) {
			return node;
		}

		const mappingFunction/*: WalkerType */ = (() => {
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
module.exports.OutputStream =
	class OutputStream {
		/*::
		data: Array<any>;
		size: number;
	*/
		constructor() {
			// Our data, expand it
			this.data = [];

			// start at the beginning
			this.size = 0;
		}

		push(type/*:string*/, value/*: any*/, debug/*:string*/) {
			let size = 0;
			switch (type) {
				case "varuint7":
				case "varuint32":
				case "varint7":
				case "u8":
				case "varint1": {
					// Encode all of the LEB128 aka 'var*' types
					value = encodeUnsigned(value);
					size = value.length;
					invariant(size, `Cannot write a value of size ${size}`);
					break;
				}
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
					size = this.sizeof[type];
					invariant(size, `Cannot write a value of size ${size}, type ${type}`);
				}
			}

			this.data.push({type, value, debug});
			this.size += size;

			return this;
		}

		// Get the BUFFER, not data array. **Always creates new buffer**
		buffer() {
			const buffer = new ArrayBuffer(this.size);
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


const getText = (node/*: NodeType*/)/*:string*/ => {
	const value = node.value || "??";
	const hasType = node.type;
	const type = hasType || "i32";
	const op = opcodeFromOperator({value, type});

	if (!hasType) {
		return op.text.replace("i32", "??");
	}

	return op.text;
};

const parseParams = (node/*: NodeType*/)/*:string*/ => {
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

const typedefString = (node/*: NodeType*/)/*:string*/ => {
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
				const {value: field} = params[0];
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
	[Syntax.BinaryExpression]: (node/*: NodeType*/, print) => {
		const text = getText(node);
		add("(" + text, 2);
		node.params.forEach(print);
		add(")", 0, -2);
	},
	[Syntax.ArraySubscript]: (node/*: NodeType*/, print) => {
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
	/*::
	input: string;
	pos: number;
	line: number;
	col: number;
	lines: string[];*/

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

/*::
type StringIterator = {
  length: i32,
  index: i32,
  addr: i32,
  start: i32,
  value: i32,
  done: i32
};
 */

let offset/*: i32*/ = 0;

function malloc(size/*: i32*/) /*: i32*/ {
	const pointer/*: i32*/ = __DATA_LENGTH__ + offset;
	offset += size;
	return pointer;
}

// Create string iterator object.
function getStringIterator(addr/*: i32*/) /*:StringIterator*/ {
	// const iterator/*:StringIterator*/ = malloc(sizeof(StringIterator));
	let length/*: i32*/ = 0;
	let byte/*: i32*/ = 0;
	let shift/*: i32*/ = 0;

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

	let iterator = {done: false, length, index: 0, addr, start: addr};

	return iterator;
}

function next(iterator/*:StringIterator*/)/*:StringIterator*/ {
	if (iterator.length == 0 || iterator.index == iterator.length) {
		iterator.done = true;
		iterator.value = 0;
		return iterator;
	}

	let value/*: i32*/ = 0;
	let shift/*: i32*/ = 0;
	let byte/*: i32*/ = 0;
	let addr/*: i32*/ = iterator.addr;

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
	const memory = new WebAssembly.Memory({initial: 1});
	const view = new DataView(memory.buffer);

	const build = link(
		filepath,
		{logger: console},
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


/*::
type TokenStream = {
next: () => TokenType,
peek: () => TokenType,
last: () => TokenType,
tokens: TokenType[],
};
*/
function tokenStream(tokens/*: TokenType[]*/)/*: TokenStream */ {
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

/*::
type Node = {
  char:string,
  children: { [string]: Node },
  leaf: boolean,
};
*/
class Trie {
	/*::
	root: Node;
	fsearch: any;
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

// module.exports = Trie;


/*::
type WalkerType = (node: any, childMapper: any) => any | void;
type VisitorType = { [string]: WalkerType };
 */

// Dead simple AST walker, takes a visitor object and calls all methods for
// appropriate node Types.
function walker(visitor/*: VisitorType*/)/*: (node/*: NodeType*) => NodeType*/ {
	const walkNode = (node/*: NodeType/*/)/*: NodeType*/ => {
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
