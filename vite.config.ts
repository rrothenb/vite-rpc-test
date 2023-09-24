import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'
import Inspect from 'vite-plugin-inspect'
import ts from "typescript"
import { generate } from 'astring'
import {simple} from 'acorn-walk'

// https://vitejs.dev/config/

let middlewares

const rpcTest = async () => {
  return {
    name: 'rpc test',
    enforce: 'post',
    transform: async function (code, id) {
      if (id.includes('/server/') && middlewares) {

        const urlPath = id.replace(/^.*server/, '').replace(/\.ts$/, '')
        const importPath = `./floob${urlPath}.js`
        console.log({importPath, urlPath, id, code})
        const ast = this.parse(code)
        const module = await import(importPath)
        const exportedAsyncFunctions = Object.keys(module).filter((endpoint) => module[endpoint].constructor.name === 'AsyncFunction')
        console.log({exportedAsyncFunctions})
        Object.keys(module).map((endpoint) => console.log(
            'export',
            endpoint,
            typeof module[endpoint],
            module[endpoint].constructor.name,
            module[endpoint].name,
            module[endpoint].length,
            module[endpoint].toString()))
        ast.body = ast.body.filter(statement => {
          if (statement.type === 'ExportNamedDeclaration') {
            if (statement.declaration.type === 'VariableDeclaration') {
              return exportedAsyncFunctions.some(func => statement.declaration.declarations.some(declaration => declaration.id.name === func))
            } else if (statement.declaration.type === 'FunctionDeclaration') {
              return exportedAsyncFunctions.some(func => func === statement.declaration.id.name)
            } else {
              return false
            }
          }
          return false
        })
        console.log(JSON.stringify(ast, null, '    '))
        const body = this.parse("return 'goodbye'", {allowReturnOutsideFunction: true}).body
        console.log(body)
        simple(ast, {
          ArrowFunctionExpression(node) {
            console.log('ArrowFunctionExpression', node.body, body)
            if (node.body.type === 'BlockStatement') {
              node.body.body = body
            } else if (node.body.type === 'Literal') {
              node.body.value = 'goodbye'
              node.body.raw = "'goodbye'"
            }
          },
          FunctionDeclaration(node) {
            console.log('FunctionDeclaration', node.body, body)
            node.body.body = body
          }
        })

        const newCode = generate(ast).replace(/ async /, ' ')
        console.log('--- newCode ---')
        console.log(newCode)
        return newCode
      }
    },
    configureServer: function(server) {
      middlewares = server.middlewares
    },
    buildStart: function(options) {
      console.log({options})
      const program = ts.createProgram(["src/server/util.ts", "src/server/blech.ts"], {
        outDir: 'floob',
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.CommonJS,
        allowJs: true,
        esModuleInterop: true
      })
      const emitResult = program.emit();
      const allDiagnostics = ts
          .getPreEmitDiagnostics(program)
          .concat(emitResult.diagnostics);

      allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
          const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
          console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), Inspect(), rpcTest()]
})
