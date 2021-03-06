/* eslint-disable */

import * as ts from 'typescript';

// Default format to use for `format` option
const defaultFormat = 'ts';
const ignoreNode = '';

export type ICompilerOptions = {
  format?: 'ts' | 'js:esm' | 'js:cjs';
  ignoreGenerics?: boolean;
  ignoreIndexSignature?: boolean;
  inlineImports?: boolean;
};

// The main public interface is `Compiler.compile`.
export class Compiler {
  /**
   * This method is modified from original https://github.com/gristlabs/ts-interface-builder
   * We need to pass Array filePaths and a cached program,
   * it improves generation performance by hundreds of times.
   *
   * Also it's useful to get not only content, but filePath in result of compilation
   *
   */

  public static compile(
    filePaths: Array<string>,
    compilerOptions?: ts.CompilerOptions
  ) {
    const createProgramOptions: ts.CompilerOptions = Object.assign({}, compilerOptions, {
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    });

    const program = ts.createProgram({ rootNames: filePaths, options: createProgramOptions });
    const checker = program.getTypeChecker();

    const options: ICompilerOptions = {
      format: defaultFormat,
      ignoreGenerics: false,
      ignoreIndexSignature: false,
      inlineImports: true,
    };

    const result = filePaths.map((filePath) => {
      const topNode = program.getSourceFile(filePath);
      if (!topNode) {
        throw new Error(`Can't process ${filePath}: ${collectDiagnostics(program)}`);
      }

      const content = new Compiler(checker, options, topNode).compileNode(topNode);

      return { filePath, content };
    });

    return { result, program };
  }

  private exportedNames: Array<string> = [];

  constructor(
    private checker: ts.TypeChecker,
    private options: ICompilerOptions,
    private topNode: ts.SourceFile
  ) {}

  private getName(id: ts.Node): string {
    const symbol = this.checker.getSymbolAtLocation(id);
    return symbol ? symbol.getName() : 'unknown';
  }

  private indent(content: string): string {
    return content.replace(/\n/g, '\n  ');
  }
  private compileNode(node: ts.Node): string {
    switch (node.kind) {
      case ts.SyntaxKind.Identifier:
        return this._compileIdentifier(node as ts.Identifier);
      case ts.SyntaxKind.Parameter:
        return this._compileParameterDeclaration(node as ts.ParameterDeclaration);
      case ts.SyntaxKind.PropertySignature:
        return this._compilePropertySignature(node as ts.PropertySignature);
      case ts.SyntaxKind.MethodSignature:
        return this._compileMethodSignature(node as ts.MethodSignature);
      case ts.SyntaxKind.TypeReference:
        return this._compileTypeReferenceNode(node as ts.TypeReferenceNode);
      case ts.SyntaxKind.FunctionType:
        return this._compileFunctionTypeNode(node as ts.FunctionTypeNode);
      case ts.SyntaxKind.TypeLiteral:
        return this._compileTypeLiteralNode(node as ts.TypeLiteralNode);
      case ts.SyntaxKind.ArrayType:
        return this._compileArrayTypeNode(node as ts.ArrayTypeNode);
      case ts.SyntaxKind.TupleType:
        return this._compileTupleTypeNode(node as ts.TupleTypeNode);
      case ts.SyntaxKind.RestType:
        return this._compileRestTypeNode(node as ts.RestTypeNode);
      case ts.SyntaxKind.UnionType:
        return this._compileUnionTypeNode(node as ts.UnionTypeNode);
      case ts.SyntaxKind.IntersectionType:
        return this._compileIntersectionTypeNode(node as ts.IntersectionTypeNode);
      case ts.SyntaxKind.LiteralType:
        return this._compileLiteralTypeNode(node as ts.LiteralTypeNode);
      case ts.SyntaxKind.OptionalType:
        return this._compileOptionalTypeNode(node as ts.OptionalTypeNode);
      case ts.SyntaxKind.EnumDeclaration:
        return this._compileEnumDeclaration(node as ts.EnumDeclaration);
      case ts.SyntaxKind.InterfaceDeclaration:
        return this._compileInterfaceDeclaration(node as ts.InterfaceDeclaration);
      case ts.SyntaxKind.TypeAliasDeclaration:
        return this._compileTypeAliasDeclaration(node as ts.TypeAliasDeclaration);
      case ts.SyntaxKind.ExpressionWithTypeArguments:
        return this._compileExpressionWithTypeArguments(node as ts.ExpressionWithTypeArguments);
      case ts.SyntaxKind.ParenthesizedType:
        return this._compileParenthesizedTypeNode(node as ts.ParenthesizedTypeNode);
      case ts.SyntaxKind.ExportDeclaration:
      case ts.SyntaxKind.ImportDeclaration:
        return this._compileImportDeclaration(node as ts.ImportDeclaration);
      case ts.SyntaxKind.SourceFile:
        return this._compileSourceFile(node as ts.SourceFile);
      case ts.SyntaxKind.AnyKeyword:
        return '"any"';
      case ts.SyntaxKind.NumberKeyword:
        return '"number"';
      case ts.SyntaxKind.ObjectKeyword:
        return '"object"';
      case ts.SyntaxKind.BooleanKeyword:
        return '"boolean"';
      case ts.SyntaxKind.StringKeyword:
        return '"string"';
      case ts.SyntaxKind.SymbolKeyword:
        return '"symbol"';
      case ts.SyntaxKind.ThisKeyword:
        return '"this"';
      case ts.SyntaxKind.VoidKeyword:
        return '"void"';
      case ts.SyntaxKind.UndefinedKeyword:
        return '"undefined"';
      case ts.SyntaxKind.UnknownKeyword:
        return '"unknown"';
      case ts.SyntaxKind.NullKeyword:
        return '"null"';
      case ts.SyntaxKind.NeverKeyword:
        return '"never"';
      case ts.SyntaxKind.IndexSignature:
        return this._compileIndexSignatureDeclaration(node as ts.IndexSignatureDeclaration);
    }
    // Skip top-level statements that we haven't handled.
    if (ts.isSourceFile(node.parent!)) {
      return '';
    }
    throw new Error(
      `Node ${ts.SyntaxKind[node.kind]} not supported by ts-interface-builder: ${node.getText()}`
    );
  }

  private compileOptType(typeNode: ts.Node | undefined): string {
    return typeNode ? this.compileNode(typeNode) : '"any"';
  }

  private _compileIdentifier(node: ts.Identifier): string {
    return `"${node.getText()}"`;
  }
  private _compileParameterDeclaration(node: ts.ParameterDeclaration): string {
    const name = this.getName(node.name);
    const isOpt = node.questionToken ? ', true' : '';
    return `t.param("${name}", ${this.compileOptType(node.type)}${isOpt})`;
  }
  private _compilePropertySignature(node: ts.PropertySignature): string {
    const name = this.getName(node.name);
    const prop = this.compileOptType(node.type);
    const value = node.questionToken ? `t.opt(${prop})` : prop;
    return `"${name}": ${value}`;
  }
  private _compileMethodSignature(node: ts.MethodSignature): string {
    const name = this.getName(node.name);
    const params = node.parameters.map(this.compileNode, this);
    const items = [this.compileOptType(node.type)].concat(params);
    return `"${name}": t.func(${items.join(', ')})`;
  }
  private _compileTypeReferenceNode(node: ts.TypeReferenceNode): string {
    if (!node.typeArguments) {
      if (node.typeName.kind === ts.SyntaxKind.QualifiedName) {
        const typeNode = this.checker.getTypeFromTypeNode(node);
        if (typeNode.flags & ts.TypeFlags.EnumLiteral) {
          return `t.enumlit("${node.typeName.left.getText()}", "${node.typeName.right.getText()}")`;
        }
      }
      return `"${node.typeName.getText()}"`;
    } else if (node.typeName.getText() === 'Promise') {
      // Unwrap Promises.
      return this.compileNode(node.typeArguments[0]);
    } else if (node.typeName.getText() === 'Array') {
      return `t.array(${this.compileNode(node.typeArguments[0])})`;
    } else if (this.options.ignoreGenerics) {
      return '"any"';
    }
    throw new Error(`Generics are not yet supported by ts-interface-builder: ${node.getText()}`);
  }
  private _compileFunctionTypeNode(node: ts.FunctionTypeNode): string {
    const params = node.parameters.map(this.compileNode, this);
    const items = [this.compileOptType(node.type)].concat(params);
    return `t.func(${items.join(', ')})`;
  }
  private _compileTypeLiteralNode(node: ts.TypeLiteralNode): string {
    const members = node.members
      .map((n) => this.compileNode(n))
      .filter((n) => n !== ignoreNode)
      .map((n) => `  ${this.indent(n)},\n`);
    return `t.iface([], {\n${members.join('')}})`;
  }
  private _compileArrayTypeNode(node: ts.ArrayTypeNode): string {
    return `t.array(${this.compileNode(node.elementType)})`;
  }
  private _compileTupleTypeNode(node: ts.TupleTypeNode): string {
    // @ts-ignore
    const members = (node.elementTypes || node.elements).map(this.compileNode, this);
    return `t.tuple(${members.join(', ')})`;
  }
  private _compileRestTypeNode(node: ts.RestTypeNode): string {
    if (node.parent.kind != ts.SyntaxKind.TupleType) {
      throw new Error('Rest type currently only supported in tuples');
    }
    return `t.rest(${this.compileNode(node.type)})`;
  }
  private _compileUnionTypeNode(node: ts.UnionTypeNode): string {
    const members = node.types.map(this.compileNode, this);
    return `t.union(${members.join(', ')})`;
  }
  private _compileIntersectionTypeNode(node: ts.IntersectionTypeNode): string {
    const members = node.types.map(this.compileNode, this);
    return `t.intersection(${members.join(', ')})`;
  }
  private _compileLiteralTypeNode(node: ts.LiteralTypeNode): string {
    return `t.lit(${node.getText()})`;
  }
  private _compileOptionalTypeNode(node: ts.OptionalTypeNode): string {
    return `t.opt(${this.compileNode(node.type)})`;
  }
  private _compileEnumDeclaration(node: ts.EnumDeclaration): string {
    const name = this.getName(node.name);
    const members: Array<string> = node.members.map(
      (m) =>
        `  "${this.getName(m.name)}": ${getTextOfConstantValue(
          this.checker.getConstantValue(m)
        )},\n`
    );
    this.exportedNames.push(name);
    return this._formatExport(name, `t.enumtype({\n${members.join('')}})`);
  }
  private _compileInterfaceDeclaration(node: ts.InterfaceDeclaration): string {
    const name = this.getName(node.name);
    const members = node.members
      .map((n) => this.compileNode(n))
      .filter((n) => n !== ignoreNode)
      .map((n) => `  ${this.indent(n)},\n`);
    const extend: Array<string> = [];
    if (node.heritageClauses) {
      for (const h of node.heritageClauses) {
        extend.push(...h.types.map(this.compileNode, this));
      }
    }
    this.exportedNames.push(name);
    return this._formatExport(name, `t.iface([${extend.join(', ')}], {\n${members.join('')}})`);
  }
  private _compileTypeAliasDeclaration(node: ts.TypeAliasDeclaration): string {
    const name = this.getName(node.name);
    this.exportedNames.push(name);
    const compiled = this.compileNode(node.type);
    // Turn string literals into explicit `name` nodes, as expected by ITypeSuite.
    const fullType = compiled.startsWith('"') ? `t.name(${compiled})` : compiled;
    return this._formatExport(name, fullType);
  }
  private _compileExpressionWithTypeArguments(node: ts.ExpressionWithTypeArguments): string {
    return this.compileNode(node.expression);
  }
  private _compileParenthesizedTypeNode(node: ts.ParenthesizedTypeNode): string {
    return this.compileNode(node.type);
  }
  private _compileImportDeclaration(node: ts.ImportDeclaration): string {
    if (this.options.inlineImports) {
      const importedSym = this.checker.getSymbolAtLocation(node.moduleSpecifier);
      if (importedSym && importedSym.declarations) {
        // this._compileSourceFile will get called on every imported file when traversing imports.
        // it's important to check that _compileSourceFile is being run against the topNode
        // before adding the file wrapper for this reason.
        return importedSym.declarations
          .map((declaration) => this.compileNode(declaration))
          .join('');
      }
    }
    return '';
  }
  private _compileSourceFileStatements(node: ts.SourceFile): string {
    return node.statements
      .map(this.compileNode, this)
      .filter((s) => s)
      .join('\n\n');
  }
  private _compileSourceFile(node: ts.SourceFile): string {
    // for imported source files, skip the wrapper
    if (node !== this.topNode) {
      return this._compileSourceFileStatements(node);
    }
    // wrap the top node with a default export
    if (this.options.format === 'js:cjs') {
      return (
        `${
          `const t = require("ts-interface-checker");\n\n` + 'module.exports = {\n'
        }${this._compileSourceFileStatements(node)}\n` + `};\n`
      );
    }
    const prefix = `import * as t from "ts-interface-checker";\n${
      this.options.format === 'ts' ? '// tslint:disable:object-literal-key-quotes\n' : ''
    }\n`;
    return (
      `${prefix + this._compileSourceFileStatements(node)}\n\n` +
      `const exportedTypeSuite${
        this.options.format === 'ts' ? ': t.ITypeSuite' : ''
      } = {\n${this.exportedNames.map((n) => `  ${n},\n`).join('')}};\n` +
      `export default exportedTypeSuite;\n`
    );
  }
  private _compileIndexSignatureDeclaration(node: ts.IndexSignatureDeclaration): string {
    // This option is supported for backward compatibility.
    if (this.options.ignoreIndexSignature) {
      return ignoreNode;
    }

    if (!node.type) {
      throw new Error(`Node ${ts.SyntaxKind[node.kind]} must have a type`);
    }
    const type = this.compileNode(node.type);
    return `[t.indexKey]: ${type}`;
  }
  private _formatExport(name: string, expression: string): string {
    return this.options.format === 'js:cjs'
      ? `  ${name}: ${this.indent(expression)},`
      : `export const ${name} = ${expression};`;
  }
}

function getTextOfConstantValue(value: string | number | undefined): string {
  // Typescript has methods to escape values, but doesn't seem to expose them at all. Here I am
  // casting `ts` to access this private member rather than implementing my own.
  return value === undefined ? 'undefined' : (ts as any).getTextOfConstantValue(value);
}

function collectDiagnostics(program: ts.Program) {
  const diagnostics = ts.getPreEmitDiagnostics(program);
  return ts.formatDiagnostics(diagnostics, {
    getCurrentDirectory() {
      return process.cwd();
    },
    getCanonicalFileName(fileName: string) {
      return fileName;
    },
    getNewLine() {
      return '\n';
    },
  });
}
