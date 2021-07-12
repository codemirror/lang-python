import {parser} from "lezer-python"
import {continuedIndent, indentNodeProp, foldNodeProp, foldInside, LezerLanguage, LanguageSupport} from "@codemirror/language"
import {styleTags, tags as t} from "@codemirror/highlight"

/// A language provider based on the [Lezer Python
/// parser](https://github.com/lezer-parser/python), extended with
/// highlighting and indentation information.
export const pythonLanguage = LezerLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Body: continuedIndent()
      }),
      foldNodeProp.add({
        "Body ArrayExpression DictionaryExpression": foldInside
      }),
      styleTags({
        "async '*' '**' FormatConversion": t.modifier,
        "for while if elif else try except finally return raise break continue with pass assert await yield": t.controlKeyword,
        "in not and or is del": t.operatorKeyword,
        "import from def class global nonlocal lambda": t.definitionKeyword,
        "abs all any as ascii bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars with zip __import__ NotImplemented Ellipsis __debug__": t.keyword,
        self: t.self,
        Boolean: t.bool,
        None: t.null,
        VariableName: t.variableName,
        "CallExpression/VariableName": t.function(t.variableName),
        "FunctionDefinition/VariableName": t.function(t.definition(t.variableName)),
        "ClassDefinition/VariableName": t.definition(t.className),
        PropertyName: t.propertyName,
        "CallExpression/MemberExpression/PropertyName": t.function(t.propertyName),
        Comment: t.lineComment,
        Number: t.number,
        String: t.string,
        FormatString: t.special(t.string),
        UpdateOp: t.updateOperator,
        ArithOp: t.arithmeticOperator,
        BitOp: t.bitwiseOperator,
        CompareOp: t.compareOperator,
        AssignOp: t.definitionOperator,
        Ellipsis: t.punctuation,
        At: t.meta,
        "( )": t.paren,
        "[ ]": t.squareBracket,
        "{ }": t.brace,
        ".": t.derefOperator,
        ", ;": t.separator
      })
    ],
  }),
  languageData: {
    closeBrackets: {brackets: ["(", "[", "{", "'", '"', "'''", '"""']},
    commentTokens: {line: "#"},
    indentOnInput: /^\s*[\}\]\)]$/
  }
})

/// Python language support.
export function python() {
  return new LanguageSupport(pythonLanguage)
}
