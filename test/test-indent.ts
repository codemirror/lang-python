import { python } from "@codemirror/lang-python";
import { getIndentation, IndentContext } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import ist from "ist";

const cursor = "█";

function check(code: string, expected: number | null) {
  return () => {
    let naiveInBrackets = Boolean(code.match(/[{\[(]█[}\])]/))
    code = /^\n*([^]*)/.exec(code)![1]
    let pos = code.indexOf(cursor)
    code = code.replace(cursor, "")
    let state = EditorState.create({doc: code, extensions: [python().language]})
    let cx = new IndentContext(state, {simulateBreak: pos, simulateDoubleBreak: naiveInBrackets})
    ist(expected, getIndentation(cx, pos))
  }
}

describe("python indentation", () => {
  it("indents body", check(`
if True:█
`, 2))
  it("continues body indents", check(`
if True:
  a = 1█
`, 2))
it("is happy with manual dedent blank", check(`
if True:
  a = 1
█
`, 0))
it("is happy with manual dedent blank 2", check(`
if True:
  a = 1

█
`, 0))
  it("is happy with manual dedent non-blank", check(`
if True:
  a = 1
b = 2█
`, 0))
  it("follows manual indent", check(`
if True:
  a = 1
    b = 2█
`, 4))
  it("dedents after pass", check(`
if True:
  pass█
`, 0))
  it("dedents after raise", check(`
if True:
  raise ValueError()█
`, 0))
  it("dedents after break", check(`
while True:
  break█
`, 0))
  it("dedents after continue", check(`
while True:
  continue█
`, 0))
  it("dedents after return", check(`
def foo():
  return 1█
`, 0))
  it("does not dedent mid-raise", check(`
def foo():
  raise ValueError(█)
`, 4))
  it("does not dedent mid-return", check(`
def foo():
  return foo(█1)
`, 4))
  it("respects indent of previous line", check(`
if True:
    a = 2█
`, 4))
  it("indents list", check(`
a = [█]
`, 2))
  it("indents tuple", check(`
a = (█)
`, 2))
  it("indents dictionary", check(`
a = {█}
`, 2))
  it("indents parameter list", check(`
def foo(█)
`, 2))
  it("indents argument list", check(`
foo(█)
`, 2))
  it("no inappropriate dedent for else", check(`
if True:
  if True:
    a = 1
  else:█
`, 4))
  it("no dedent for else at all", check(`
if True:
  if True:
    a = 1
    else:█
`, 4)) // Could add this if we could exclude the case above.
       // Attempting it was controversial in VS code and it was reverted.
})
