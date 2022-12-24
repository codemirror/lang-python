import {NodeWeakMap, SyntaxNodeRef, SyntaxNode, IterMode} from "@lezer/common"
import {Completion, CompletionContext, CompletionResult, completeFromList, ifNotIn,
        snippetCompletion as snip} from "@codemirror/autocomplete"
import {syntaxTree} from "@codemirror/language"
import {Text} from "@codemirror/state"

const cache = new NodeWeakMap<readonly Completion[]>()

const ScopeNodes = new Set([
  "Script", "Body",
  "FunctionDefinition", "ClassDefinition", "LambdaExpression",
  "ForStatement", "MatchClause"
])

function defID(type: string) {
  return (node: SyntaxNodeRef, def: (node: SyntaxNodeRef, type: string) => void, outer: boolean) => {
    if (outer) return false
    let id = node.node.getChild("VariableName")
    if (id) def(id, type)
    return true
  }
}

const gatherCompletions: {
  [node: string]: (node: SyntaxNodeRef, def: (node: SyntaxNodeRef, type: string) => void, outer: boolean) => void | boolean
} = {
  FunctionDefinition: defID("function"),
  ClassDefinition: defID("class"),
  ForStatement(node, def, outer) {
    if (outer) for (let child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name == "VariableName") def(child, "variable")
      else if (child.name == "in") break
    }
  },
  ImportStatement(_node, def) {
    let {node} = _node
    let isFrom = node.firstChild?.name == "from"
    for (let ch = node.getChild("import"); ch; ch = ch.nextSibling) {
      if (ch.name == "VariableName" && ch.nextSibling?.name != "as")
        def(ch, isFrom ? "variable" : "namespace")
    }
  },
  AssignStatement(node, def) {
    for (let child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name == "VariableName") def(child, "variable")
      else if (child.name == ":" || child.name == "AssignOp") break
    }
  },
  ParamList(node, def) {
    for (let prev = null, child = node.node.firstChild; child; child = child.nextSibling) {
      if (child.name == "VariableName" && (!prev || !/\*|AssignOp/.test(prev.name)))
        def(child, "variable")
      prev = child
    }
  },
  CapturePattern: defID("variable"),
  AsPattern: defID("variable"),
  __proto__: null as any
}

function getScope(doc: Text, node: SyntaxNode) {
  let cached = cache.get(node)
  if (cached) return cached

  let completions: Completion[] = [], top = true
  function def(node: SyntaxNodeRef, type: string) {
    let name = doc.sliceString(node.from, node.to)
    completions.push({label: name, type})
  }
  node.cursor(IterMode.IncludeAnonymous).iterate(node => {
    if (node.name) {
      let gather = gatherCompletions[node.name]
      if (gather && gather(node, def, top) || !top && ScopeNodes.has(node.name)) return false
      top = false
    } else if (node.to - node.from > 8192) {
      // Allow caching for bigger internal nodes
      for (let c of getScope(doc, node.node)) completions.push(c)
      return false
    }
  })
  cache.set(node, completions)
  return completions
}

const Identifier = /^[\w\xa1-\uffff][\w\d\xa1-\uffff]*$/

const dontComplete = ["String", "FormatString", "Comment", "PropertyName"]

/// Completion source that looks up locally defined names in
/// Python code.
export function localCompletionSource(context: CompletionContext): CompletionResult | null {
  let inner = syntaxTree(context.state).resolveInner(context.pos, -1)
  if (dontComplete.indexOf(inner.name) > -1) return null
  let isWord = inner.name == "VariableName" ||
    inner.to - inner.from < 20 && Identifier.test(context.state.sliceDoc(inner.from, inner.to))
  if (!isWord && !context.explicit) return null
  let options: Completion[] = []
  for (let pos: SyntaxNode | null = inner; pos; pos = pos.parent) {
    if (ScopeNodes.has(pos.name)) options = options.concat(getScope(context.state.doc, pos))
  }
  return {
    options,
    from: isWord ? inner.from : context.pos,
    validFor: Identifier
  }
}

const globals: readonly Completion[] = [
  "__annotations__", "__builtins__", "__debug__", "__doc__", "__import__", "__name__",
  "__loader__", "__package__", "__spec__",
  "False", "None", "True"
].map(n => ({label: n, type: "constant"})).concat([
  "ArithmeticError", "AssertionError", "AttributeError", "BaseException", "BlockingIOError",
  "BrokenPipeError", "BufferError", "BytesWarning", "ChildProcessError", "ConnectionAbortedError",
  "ConnectionError", "ConnectionRefusedError", "ConnectionResetError", "DeprecationWarning",
  "EOFError", "Ellipsis", "EncodingWarning", "EnvironmentError", "Exception", "FileExistsError",
  "FileNotFoundError", "FloatingPointError", "FutureWarning", "GeneratorExit", "IOError",
  "ImportError", "ImportWarning", "IndentationError", "IndexError", "InterruptedError",
  "IsADirectoryError", "KeyError", "KeyboardInterrupt", "LookupError", "MemoryError",
  "ModuleNotFoundError", "NameError", "NotADirectoryError", "NotImplemented", "NotImplementedError",
  "OSError", "OverflowError", "PendingDeprecationWarning", "PermissionError", "ProcessLookupError",
  "RecursionError", "ReferenceError", "ResourceWarning", "RuntimeError", "RuntimeWarning",
  "StopAsyncIteration", "StopIteration", "SyntaxError", "SyntaxWarning", "SystemError",
  "SystemExit", "TabError", "TimeoutError", "TypeError", "UnboundLocalError", "UnicodeDecodeError",
  "UnicodeEncodeError", "UnicodeError", "UnicodeTranslateError", "UnicodeWarning", "UserWarning",
  "ValueError", "Warning", "ZeroDivisionError"
].map(n => ({label: n, type: "type"}))).concat([
  "bool", "bytearray", "bytes", "classmethod", "complex", "float", "frozenset", "int", "list",
  "map", "memoryview", "object", "range", "set", "staticmethod", "str", "super", "tuple", "type"
].map(n => ({label: n, type: "class"}))).concat([
  "abs", "aiter", "all", "anext", "any", "ascii", "bin", "breakpoint", "callable", "chr",
  "compile", "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec", "exit", "filter",
  "format", "getattr", "globals", "hasattr", "hash", "help", "hex", "id", "input", "isinstance",
  "issubclass", "iter", "len", "license", "locals", "max", "min", "next", "oct", "open",
  "ord", "pow", "print", "property", "quit", "repr", "reversed", "round", "setattr", "slice",
  "sorted", "sum", "vars", "zip"
].map(n => ({label: n, type: "function"})))

export const snippets: readonly Completion[] = [
  snip("def ${name}(${params}):\n\t${}", {
    label: "def",
    detail: "function",
    type: "keyword"
  }),
  snip("for ${name} in ${collection}:\n\t${}", {
    label: "for",
    detail: "loop",
    type: "keyword"
  }),
  snip("while ${}:\n\t${}", {
    label: "while",
    detail: "loop",
    type: "keyword"
  }),
  snip("try:\n\t${}\nexcept ${error}:\n\t${}", {
    label: "try",
    detail: "/ except block",
    type: "keyword"
  }),
  snip("if ${}:\n\t\n", {
    label: "if",
    detail: "block",
    type: "keyword"
  }),
  snip("if ${}:\n\t${}\nelse:\n\t${}", {
    label: "if",
    detail: "/ else block",
    type: "keyword"
  }),
  snip("class ${name}:\n\tdef __init__(self, ${params}):\n\t\t\t${}", {
    label: "class",
    detail: "definition",
    type: "keyword"
  }),
  snip("import ${module}", {
    label: "import",
    detail: "statement",
    type: "keyword"
  }),
  snip("from ${module} import ${names}", {
    label: "from",
    detail: "import",
    type: "keyword"
  })
]

/// Autocompletion for built-in Python globals and keywords.
export const globalCompletion = ifNotIn(dontComplete, completeFromList(globals.concat(snippets)))
