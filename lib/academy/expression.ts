import type { Row, Value } from "./data";
import { matchPattern } from "./pattern";
type Token = { text: string; kind: "word" | "number" | "string" | "symbol" };
export function tokenize(input: string): Token[] {
  const result: Token[] = [];
  let p = 0;
  while (p < input.length) {
    if (/\s/.test(input[p])) {
      p++;
      continue;
    }
    const q = input[p];
    if (q === '"' || q === "'") {
      let value = "";
      p++;
      let closed = false;
      while (p < input.length) {
        if (input[p] === q) {
          p++;
          closed = true;
          break;
        }
        if (input[p] === "\\" && (input[p + 1] === q || input[p + 1] === "\\"))
          p++;
        value += input[p++];
      }
      if (!closed) throw new Error("Close the quoted string.");
      result.push({ text: value, kind: q === '"' ? "string" : "word" });
      continue;
    }
    const m =
      /^(>=|<=|!=|==|[=><()+\-*/%,.]|\d+(?:\.\d+)?|[A-Za-z_][\w:]*)/.exec(
        input.slice(p),
      );
    if (!m)
      throw new Error(
        `Cannot read “${input.slice(p, p + 18)}”. Check the expression syntax.`,
      );
    const t = m[0];
    result.push({
      text: t,
      kind: /^\d/.test(t) ? "number" : /^[\w]/.test(t) ? "word" : "symbol",
    });
    p += t.length;
  }
  return result;
}
const num = (v: Value | undefined): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v))
    ? null
    : Number(v);
function truth(v: Value | undefined) {
  return v === null || v === undefined ? null : Boolean(v);
}
function func(name: string, args: Value[]): Value {
  const [a, b, c] = args;
  switch (name.toLowerCase()) {
    case "if":
      return a ? b : c;
    case "case":
      for (let i = 0; i < args.length - 1; i += 2)
        if (args[i]) return args[i + 1];
      return null;
    case "true":
      return true;
    case "false":
      return false;
    case "null":
      return null;
    case "isnull":
      return a === null;
    case "isnotnull":
      return a !== null;
    case "coalesce":
      return args.find((x) => x !== null) ?? null;
    case "round":
      return num(a) === null
        ? null
        : Number(Number(a).toFixed(Math.min(10, Math.max(0, Number(b ?? 0)))));
    case "abs":
      return num(a) === null ? null : Math.abs(Number(a));
    case "lower":
      return a === null ? null : String(a).toLowerCase();
    case "upper":
      return a === null ? null : String(a).toUpperCase();
    case "len":
      return a === null ? null : String(a).length;
    case "tonumber":
      return num(a);
    case "tostring":
      return a === null ? null : String(a);
    case "split":
      return a === null ? null : String(a).split(String(b));
    case "mvcount":
      return a === null ? null : Array.isArray(a) ? a.length : 1;
    case "mvindex":
      return Array.isArray(a)
        ? (a[Number(b) < 0 ? a.length + Number(b) : Number(b)] ?? null)
        : a;
    case "in":
      return a === null ? null : args.slice(1).includes(a);
    case "like": {
      if (a === null || b === null) return null;
      return matchPattern(String(a), String(b), "%", "_");
    }
    default:
      throw new Error(
        `Function “${name}” is not supported in this practice engine. See the field guide.`,
      );
  }
}
// Compile a small expression language to closures. No JavaScript eval or Function.
export function expression(input: string): (row: Row) => Value {
  const tokens = tokenize(input);
  let p = 0;
  type Node = (row: Row) => Value;
  const peek = () => tokens[p]?.text;
  const take = () => tokens[p++];
  const precedence: Record<string, number> = {
    OR: 1,
    XOR: 1,
    AND: 2,
    "=": 3,
    "==": 3,
    "!=": 3,
    ">": 3,
    "<": 3,
    ">=": 3,
    "<=": 3,
    ".": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6,
  };
  function parse(min = 0): Node {
    const t = take();
    if (!t) throw new Error("The expression is incomplete.");
    let left: Node;
    if (t.text === "(") {
      left = parse();
      if (take()?.text !== ")") throw new Error("Close the parenthesis.");
    } else if (t.text === "NOT" || t.text === "-") {
      const node = parse(t.text === "NOT" ? 3 : 7);
      left = (row) => {
        const a = node(row);
        return a === null ? null : t.text === "NOT" ? !a : -Number(a);
      };
    } else if (t.kind === "number") left = () => Number(t.text);
    else if (t.kind === "string") left = () => t.text;
    else if (t.kind === "word" && peek() === "(") {
      take();
      const args: Node[] = [];
      if (peek() !== ")")
        do {
          args.push(parse());
          if (peek() !== ",") break;
          take();
        } while (p < tokens.length);
      if (take()?.text !== ")")
        throw new Error(`Close the ${t.text}() function.`);
      const arity: Record<string, [number, number]> = {
        if: [3, 3],
        case: [2, 100],
        true: [0, 0],
        false: [0, 0],
        null: [0, 0],
        isnull: [1, 1],
        isnotnull: [1, 1],
        coalesce: [1, 100],
        round: [1, 2],
        abs: [1, 1],
        lower: [1, 1],
        upper: [1, 1],
        len: [1, 1],
        tonumber: [1, 1],
        tostring: [1, 1],
        split: [2, 2],
        mvcount: [1, 1],
        mvindex: [2, 2],
        in: [2, 100],
        like: [2, 2],
      };
      const bounds = arity[t.text.toLowerCase()];
      if (!Object.hasOwn(arity, t.text.toLowerCase()) || !bounds)
        throw new Error(
          `Function “${t.text}” is not supported in this practice engine.`,
        );
      if (
        args.length < bounds[0] ||
        args.length > bounds[1] ||
        (t.text.toLowerCase() === "case" && args.length % 2)
      )
        throw new Error(`Check the number of arguments to ${t.text}().`);
      left = (row) =>
        func(
          t.text,
          args.map((a) => a(row)),
        );
    } else if (t.kind === "word")
      left = (row) =>
        Object.hasOwn(row, t.text) ? (row[t.text] ?? null) : null;
    else throw new Error(`Unexpected token “${t.text}”.`);
    while (
      p < tokens.length &&
      precedence[peek()] !== undefined &&
      precedence[peek()] >= min
    ) {
      const op = take().text;
      const right = parse(precedence[op] + 1);
      const lhs = left;
      left = (row) => {
        const a = lhs(row),
          b = right(row);
        if (op === "AND")
          return truth(a) === false || truth(b) === false
            ? false
            : a === null || b === null
              ? null
              : true;
        if (op === "OR")
          return truth(a) === true || truth(b) === true
            ? true
            : a === null || b === null
              ? null
              : false;
        if (a === null || b === null) return null;
        if (op === "XOR") return Boolean(a) !== Boolean(b);
        if (op === ".") return String(a) + String(b);
        if (op === "=" || op === "==")
          return (
            a === b || (num(a) !== null && num(b) !== null && num(a) === num(b))
          );
        if (op === "!=")
          return !(
            a === b ||
            (num(a) !== null && num(b) !== null && num(a) === num(b))
          );
        const x = num(a),
          y = num(b);
        if ([">", "<", ">=", "<="].includes(op)) {
          const aa = x !== null && y !== null ? x : String(a),
            bb = x !== null && y !== null ? y : String(b);
          return op === ">"
            ? aa > bb
            : op === "<"
              ? aa < bb
              : op === ">="
                ? aa >= bb
                : aa <= bb;
        }
        if (x === null || y === null) return null;
        return op === "+"
          ? x + y
          : op === "-"
            ? x - y
            : op === "*"
              ? x * y
              : y === 0
                ? null
                : op === "/"
                  ? x / y
                  : x % y;
      };
    }
    return left;
  }
  if (!tokens.length) throw new Error("Enter an expression.");
  const root = parse();
  if (p < tokens.length)
    throw new Error(
      `Unexpected “${peek()}”. Use AND or OR between conditions.`,
    );
  return root;
}
export function splitOutside(input: string, delimiter = "|"): string[] {
  let quote = "",
    depth = 0,
    part = "";
  const result: string[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      part += c;
      if (c === "\\" && i + 1 < input.length) part += input[++i];
      else if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") {
      depth--;
      if (depth < 0) throw new Error("Unmatched closing bracket.");
    }
    if (c === delimiter && depth === 0) {
      result.push(part.trim());
      part = "";
    } else part += c;
  }
  if (quote || depth)
    throw new Error("Close all quotes, parentheses, and subsearch brackets.");
  result.push(part.trim());
  return result;
}
