{{
//
// Origami language parser
//
// Generate the parser via `npm build`.
// @ts-nocheck
//

import * as ops from "../runtime/ops.js";
import { makeFunctionCall, makePipeline, makeTemplate } from "./parserHelpers.js";

function annotate(parseResult, range) {
  if (typeof parseResult === "object" && parseResult !== null) {
    parseResult.range = range;
  }
  return parseResult;
}

}}

// A block of optional whitespace
__
  = (inlineSpace / newLine / comment)*  { return ""; }

// A filesystem path that begins with a slash: `/foo/bar`
absoluteFilePath "absolute file path"
  = path:leadingSlashPath {
      return annotate([[ops.filesRoot], ...path], range());
    }

args "function arguments"
  = parensArgs
  / path:leadingSlashPath {
      return annotate([ops.traverse, ...path], range());
    }

// An assignment statement: `foo = 1`
assignment "tree assignment"
  = @identifier __ "=" __ @expr

assignmentOrShorthand
  = assignment
  / key:identifier {
      return annotate([key, [ops.inherited, key]], range());
    }

array "array"
  = "[" __ list:list? __ "]" {
      return annotate([ops.array, ...(list ?? [])], range());
    }

// Something that can be called. This is more restrictive than the `expr`
// parser; it doesn't accept regular function calls.
callTarget "function call"
  = absoluteFilePath
  / array
  / object
  / tree
  / lambda
  / parameterizedLambda
  / protocolCall
  / group
  / scopeReference

// A single line comment
comment "comment"
  = "#" [^\n\r]*

digits
  = @[0-9]+

doubleArrow = "⇒" / "=>"

doubleQuoteString "double quote string"
  = '"' chars:doubleQuoteStringChar* '"' { return chars.join(""); }

doubleQuoteStringChar
  = !('"' / newLine) @textChar

escapedChar "backslash-escaped character"
  = "\\" @.

// An Origami expression, no leading/trailing whitespace
expr
  = pipeline

// Top-level Origami expression, possible leading/trailing whitepsace.
expression "Origami expression"
  = __ @expr __

float "floating-point number"
  = sign? digits? "." digits {
      return parseFloat(text());
    }

// Parse a function and its arguments, e.g. `fn(arg)`, possibly part of a chain
// of function calls, like `fn(arg1)(arg2)(arg3)`.
functionComposition "function composition"
  = target:callTarget chain:args* end:implicitParensArgs? {
    if (end) {
      chain.push(end);
    }
    return annotate(makeFunctionCall(target, chain), range());
  }

// An expression in parentheses: `(foo)`
group "parenthetical group"
  = "(" __ @expr __ ")"

// A host identifier that may include a colon and port number: `example.com:80`.
// This is used as a special case at the head of a path, where we want to
// interpret a colon as part of a text identifier.
host "HTTP/HTTPS host"
  = identifier (":" number)? { return text(); }

identifier "identifier"
  = chars:identifierChar+ { return chars.join(""); }

identifierChar
  = [^(){}\[\]<>\-=,/:\`"'\\# →⇒\t\n\r] // No unescaped whitespace or special chars
  / @'-' !'>' // Accept a hyphen but not in a single arrow combination
  / escapedChar

identifierList
  = @identifier|1.., separator| separator?

implicitParensArgs "arguments with implicit parentheses"
  = inlineSpace+ @list

inlineSpace
  = [ \t]

integer "integer"
  = sign? digits {
      return parseInt(text());
    }

// A lambda expression: `=foo()`
lambda "lambda function"
  = "=" __ expr:expr {
      return annotate([ops.lambda, null, expr], range());
    }

// A path that begins with a slash: `/foo/bar`
leadingSlashPath "path with a leading slash"
  = "/" @path
  / "/" { return annotate([""], range()); }

// A separated list of expressions
list "list"
  = @expr|1.., separator| separator?

newLine
  = "\n"
  / "\r\n"
  / "\r"

// A number
number "number"
  = float
  / integer

// An object literal: `{foo: 1, bar: 2}`
//
// TODO: Use Object.fromEntries with array of key/value pairs
//
object "object literal"
  = "{" __ properties:objectProperties? __ "}" {
      return annotate([ops.object, ...(properties ?? [])], range());
    }

// A separated list of object properties or shorthands
objectProperties
  = @objectPropertyOrShorthand|1.., separator| separator?

// A single object property with key and value: `x: 1`
objectProperty "object property"
  = @identifier __ ":" __ @expr

objectPropertyOrShorthand
  = objectProperty
  / key:identifier {
      return annotate([key, [ops.scope, key]], range());
    }

parameterizedLambda
  = "(" __ parameters:identifierList? __ ")" __ doubleArrow __ expr:expr {
    return annotate([ops.lambda, parameters ?? [], expr], range());
  }

// Function arguments in parentheses
parensArgs "function arguments in parentheses"
  = "(" __ list:list? ")" {
      return list ?? annotate([undefined], range());
    }

pipeline
  = steps:(@step|1.., __ singleArrow __ |) {
      return annotate(makePipeline(steps), range());
    }

// A slash-separated path of keys
path "slash-separated path"
  = pathKey|1.., "/"|

// A single key in a slash-separated path
pathKey "path element"
  = key:identifierChar* { return key.join(""); }

// Parse a protocol call like `fn://foo/bar`.
// There can be zero, one, or two slashes after the colon.
protocolCall "function call using protocol: syntax"
  = protocol:protocol ":" "/"|0..2| host:host path:leadingSlashPath? {
      return annotate([protocol, host, ...(path ?? [])], range());
    }

protocol "protocol"
  = reservedProtocol
  / scopeReference

reservedProtocol "reserved protocol"
  = "https" { return ops.https; }
  / "http" { return ops.http; }
  / "package" { return [ops.scope, "@package"] } // Alias
  / "treehttps" { return ops.treeHttps; }
  / "treehttp" { return ops.treeHttp; }
  / "tree" { return ops.treeHttps; } // Alias

scopeReference "scope reference"
  = key:identifier {
      return annotate([ops.scope, key], range());
    }

separator
  = __ "," __
  / whitespaceWithNewLine

sign
  = [+\-]

singleArrow = "→" / "->"

singleQuoteString "single quote string"
  = "'" chars:singleQuoteStringChar* "'" { return chars.join(""); }

singleQuoteStringChar
  = !("'" / newLine) @textChar

// A single step in a pipeline, or a top-level expression
step
  // Literals that can't start a function call
  = number
  // Try functions next; they can start with expression types that follow
  // (array, object, etc.), and we want to parse the larger thing first.
  / functionComposition
  // Then try parsers that look for a distinctive token at the start: an opening
  // slash, bracket, curly brace, etc.
  / absoluteFilePath
  / array
  / object
  / tree
  / lambda
  / parameterizedLambda
  / templateLiteral
  / string
  / group
  // Protocol calls are distinguished by a colon, but it's not at the start.
  / protocolCall
  // Least distinctive option is a simple scope reference, so it comes last.
  / scopeReference

start
  = number

string "string"
  = doubleQuoteString
  / singleQuoteString

// A top-level document defining a template. This is the same as a template
// literal, but can contain backticks at the top level.
templateDocument "template"
  = contents:templateDocumentContents {
      return annotate([ops.lambda, null, contents], range());
    }

// Template documents can contain backticks at the top level.
templateDocumentChar
  = !"{{" @textChar

// The contents of a template document containing plain text and substitutions
templateDocumentContents
  = parts:(templateDocumentText / templateSubstitution)* {
      return annotate(makeTemplate(parts), range());
    }

templateDocumentText "template text"
  = chars:templateDocumentChar+ { return chars.join(""); }

// A backtick-quoted template literal
templateLiteral "template literal"
  = "`" @templateLiteralContents "`"

templateLiteralChar
  = !("`" / "{{") @textChar

// The contents of a template literal containing plain text and substitutions
templateLiteralContents
  = parts:(templateLiteralText / templateSubstitution)* {
      return annotate(makeTemplate(parts), range());
    }

// Plain text in a template literal
templateLiteralText
  = chars:templateLiteralChar+ { return chars.join(""); }

// A substitution in a template literal: `{{ fn() }}`
templateSubstitution "template substitution"
  = "{{" @expression "}}"

textChar
  = escapedChar / .

// A tree literal: `{ index.html = "Hello" }`
tree "tree literal"
  = "{" __ assignments:treeAssignments? __ "}" {
      return annotate([ops.tree, ...(assignments ?? [])], range());
    }

// A separated list of assignments or shorthands
treeAssignments
  = @assignmentOrShorthand|1.., separator| separator?

whitespaceWithNewLine
  = inlineSpace* comment? newLine __
