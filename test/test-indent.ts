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
      ist(`indent=${getIndentation(state, pos)} (line-numer=${i + 1})`, `indent=${indent} (line-numer=${i + 1})`)
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

  it("multi-line-block try-except", check(`
try:
  foo()
  fooz()
except e:
  bar()
  barz()
finally:
  baz()
  bazz()
`))


  it("multi-line-nested-block try-except", check(`
try:
  foo()
  fooz()
  try:
    inner()
    inner2()
  except e2:
    f3()
    f4()
  else:
    f5()
    f6()
  finally:
    f7()
    f8()
except e:
  bar()
  barz()
finally:
  baz()
  bazz()
`))

  it("match-case", check(`
match x:
  case 1:
    foo()
  case 2:
    bar()
  case _:
    bar()
`))

  it("match-case-multi-line-block", check(`
def func():
  match x:
    case 1:
      foo()
      fooz()
    case 2:
      bar()
      bar()
      bar()
      match y:
        case 3:
          bar()
        case 4:
          bar()
    case _:
      bar()
`))

  it("class-with-decorators", check(`
@decorator1
@decorator2(
  param1,
  param2
)
class MyClass:
  def method(self):
    pass
`))

  it("list-comprehension", check(`
result = [
  x * y
  for x in range(10)
  for y in range(5)
  if x > y
]
`))

  it("multi-line-expressions", check(`
result = (
  very_long_variable_name +
  another_long_variable *
  some_computation(
    arg1,
    arg2
  )
)
`))

  it("async-function-and-with", check(`
async def process_data():
  async with context() as ctx:
    result = await ctx.fetch(
      url,
      timeout=30
    )
    return result
`))

  it("nested-functions", check(`
def outer():
  x = 1
  def inner1():
    y = 2
    def inner2():
      z = 3
      return x + y + z
    return inner2()
  return inner1()
`))

  it("type-hints-and-annotations", check(`
def process_data(
  data: list[str],
  config: dict[str, Any]
) -> tuple[int, str]:
  result: Optional[str] = None
  if data:
    result = data[0]
  return len(data), result
`))

  it("multi-line-dict-comprehension", check(`
config = {
  key: value
  for key, value in items
  if is_valid(
    key,
    value
  )
}
`))

  it("multi-line-with-comments", check(`
def process(
  x: int,  # The input value
  y: float  # The coefficient
):
  # Compute first step
  result = x * y
  
  # Apply additional processing
  if result > 0:
    # Positive case
    return result
  else:
    # Negative case
    return -result
`))

})
