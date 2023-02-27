export const token = {
  BACKTICK: "BACKTICK",
  COLON: "COLON",
  DOUBLE_LEFT_BRACE: "DOUBLE_LEFT_BRACE",
  DOUBLE_RIGHT_BRACE: "DOUBLE_RIGHT_BRACE",
  EQUAL: "EQUAL",
  LEFT_BRACE: "LEFT_BRACE",
  LEFT_BRACKET: "LEFT_BRACKET",
  LEFT_PAREN: "LEFT_PAREN",
  REFERENCE: "REFERENCE",
  RIGHT_BRACE: "RIGHT_BRACE",
  RIGHT_BRACKET: "RIGHT_BRACKET",
  RIGHT_PAREN: "RIGHT_PAREN",
  SEPARATOR: "SEPARATOR",
  SLASH: "SLASH",
  STRING: "STRING",
};

const characterToToken = {
  "(": token.LEFT_PAREN,
  ")": token.RIGHT_PAREN,
  ",": token.SEPARATOR,
  "/": token.SLASH,
  ":": token.COLON,
  "=": token.EQUAL,
  "[": token.LEFT_BRACKET,
  "]": token.RIGHT_BRACKET,
  "`": token.BACKTICK,
  "{": token.LEFT_BRACE,
  "}": token.RIGHT_BRACE,
};

const EOF = "\0";

export const state = {
  COMMENT: "COMMENT",
  DOUBLE_QUOTE_STRING: "DOUBLE_QUOTE_STRING",
  EXPRESSION: "EXPRESSION",
  REFERENCE: "REFERENCE",
  SINGLE_QUOTE_STRING: "SINGLE_QUOTE_STRING",
  TEMPLATE_DOCUMENT: "TEMPLATE_DOCUMENT",
  TEMPLATE_LITERAL: "TEMPLATE_LITERAL",
  WHITESPACE: "WHITESPACE",
};

/**
 * Lexes the given text into an array of tokens.
 *
 * @param {string} text
 * @param {any} initialState
 */
export function lex(text, initialState = state.EXPRESSION) {
  const tokens = [];
  let currentState = initialState;
  let lexeme = currentState === state.TEMPLATE_DOCUMENT ? "" : null;
  let templateContextStack = [];

  // Append an end-of-file character to the end of the text. This is a
  // convenience for the lexer so that it doesn't have to check for the end of
  // the text in every state.
  text += EOF;

  // Main state machine.
  let i = 0;
  while (i < text.length) {
    const c = text[i++];

    // A backslash in any state means the next character (with the exception of
    // a newline or EOF) is escaped. The backslash is skipped.
    if (c === "\\") {
      if (text[i] === "\n") {
        throw new SyntaxError("Unexpected newline after backslash.");
      }
      if (text[i] === EOF) {
        throw new SyntaxError("Unexpected end of file after backslash.");
      }
      lexeme += text[i++];
      continue;
    }

    switch (currentState) {
      case state.COMMENT:
        if (c === EOF || c === "\n" || c === "\r") {
          currentState = state.EXPRESSION;
        }
        break;

      case state.DOUBLE_QUOTE_STRING:
        if (c === '"') {
          tokens.push({
            type: token.STRING,
            lexeme,
          });
          lexeme = null;
          currentState = state.EXPRESSION;
        } else {
          lexeme += c;
        }
        break;

      case state.EXPRESSION:
        switch (c) {
          case EOF:
            break;
          case " ":
          case "\t":
          case "\r":
          case "\n":
            lexeme = c;
            currentState = state.WHITESPACE;
            break;
          case "#":
            currentState = state.COMMENT;
            break;
          case "'":
            lexeme = "";
            currentState = state.SINGLE_QUOTE_STRING;
            break;
          case '"':
            lexeme = "";
            currentState = state.DOUBLE_QUOTE_STRING;
            break;
          case "`":
            lexeme = "";
            tokens.push({ type: token.BACKTICK });
            currentState = state.TEMPLATE_LITERAL;
            break;
          default:
            if (c === "}" && text[i] === "}") {
              tokens.push({ type: token.DOUBLE_RIGHT_BRACE });
              // If we see a "}}" without a matching "{{", the lexer doesn't
              // fuss about it; the parser will.
              currentState = templateContextStack.pop() ?? initialState;
              lexeme =
                currentState === state.TEMPLATE_DOCUMENT ||
                currentState === state.TEMPLATE_LITERAL
                  ? ""
                  : null;
              i++;
            } else if (characterToToken[c]) {
              tokens.push({ type: characterToToken[c] });
            } else {
              lexeme = c;
              currentState = state.REFERENCE;
            }
            break;
        }
        break;

      case state.REFERENCE:
        switch (c) {
          case EOF:
          case " ":
          case "\t":
          case "\r":
          case "\n":
          case "#":
          case "'":
          case '"':
          case "`":
          case "(":
          case ")":
          case ",":
          case "/":
          case ":":
          case "=":
          case "[":
          case "]":
          case "`":
          case "{":
          case "}":
            // Reached end of reference.
            if (lexeme.length > 0) {
              tokens.push({
                type: token.REFERENCE,
                lexeme,
              });
              lexeme = null;
            }
            currentState = state.EXPRESSION;
            i--; // Back up to consider the character again in the new state.
            break;
          default:
            // Extend reference.
            lexeme += c;
            break;
        }
        break;

      case state.SINGLE_QUOTE_STRING:
        if (c === "'") {
          tokens.push({
            type: token.STRING,
            lexeme,
          });
          lexeme = "";
          currentState = state.EXPRESSION;
        } else {
          lexeme += c;
        }
        break;

      case state.TEMPLATE_DOCUMENT:
        // Note: template documents don't treat backticks specially.
        if (c === EOF) {
          if (lexeme.length > 0) {
            tokens.push({
              type: token.STRING,
              lexeme,
            });
            lexeme = "";
          }
        } else if (c === "{" && text[i] === "{") {
          if (lexeme.length > 0) {
            tokens.push({
              type: token.STRING,
              lexeme,
            });
            lexeme = "";
          }
          tokens.push({ type: token.DOUBLE_LEFT_BRACE });
          templateContextStack.push(currentState);
          currentState = state.EXPRESSION;
          i++;
        } else {
          lexeme += c;
        }
        break;

      case state.TEMPLATE_LITERAL:
        if (c === "`") {
          if (lexeme.length > 0) {
            tokens.push({
              type: token.STRING,
              lexeme,
            });
            lexeme = null;
          }
          tokens.push({ type: token.BACKTICK });
          currentState = state.EXPRESSION;
        } else if (c === "{" && text[i] === "{") {
          if (lexeme.length > 0) {
            tokens.push({
              type: token.STRING,
              lexeme,
            });
            lexeme = "";
          }
          tokens.push({ type: token.DOUBLE_LEFT_BRACE });
          templateContextStack.push(currentState);
          currentState = state.EXPRESSION;
          i++;
        } else {
          lexeme += c;
        }
        break;

      case state.WHITESPACE:
        switch (c) {
          case " ":
          case "\t":
          case "\r":
          case "\n":
            // Extend whitespace run.
            lexeme += c;
            break;
          default:
            // Reached end of whitespace.
            if (lexeme.includes("\n")) {
              tokens.push({
                type: token.SEPARATOR,
              });
            }
            lexeme = null;
            currentState = state.EXPRESSION;
            // Back up to consider the character again in the new state.
            i--;
            break;
        }
        break;
    }
  }

  if (currentState !== initialState) {
    throw new SyntaxError("Unexpected end of input.");
  }

  return tokens;
}
