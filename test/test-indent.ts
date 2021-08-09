import ist from "ist"
import {EditorState} from "@codemirror/state"
import {getIndentation} from "@codemirror/language"
import {python} from "@codemirror/lang-python"

function check(code: string) {
  return () => {
    code = /^\n*([^]*)/.exec(code)![1]
    let state = EditorState.create({doc: code, extensions: [python().language]})
    for (let pos = 0, lines = code.split("\n"), i = 0; i < lines.length; i++) {
      let line = lines[i], indent = /^\s*/.exec(line)![0].length
      ist(`${getIndentation(state, pos)} (${i + 1})`, `${indent} (${i + 1})`)
      pos += line.length + 1
    }
  }
}

describe("python indentation", () => {
  it("indents bodies", check(`
def foo():
  bar
  baz

`))

  it("indents function arg lists", check(`
foo(
  bar,
  baz
)`))

  it("indents nested bodies", check(`
def foo():
  if True:
    a
  elif False:
    b
  else:
    c
`))

  it("dedents except", check(`
try:
  foo()
except e:
  bar()
`))
})
