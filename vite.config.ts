import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'
import Inspect from 'vite-plugin-inspect'
import ts from "typescript"
import { generate } from 'astring'
import {simple} from 'acorn-walk'

const serverRoutes = {}

const buildExpressionAst = (name, basePath, serverRoutes, parse) => {
  const fullPath = `${basePath}/${name}`
  const func = serverRoutes[fullPath]
  const parms = func.toString().replace(/\n/g, ' ').replace(/^[^(]*\(/, '').replace(/\).*$/, '')
  return parse(`{return (await fetch('/server${fullPath}', {method: 'POST', body:  JSON.stringify([${parms}])})).json()}`, {allowReturnOutsideFunction: true}).body[0]
}

const rpcTest = async () => {
  return {
    name: 'rpc test',
    transform: async function (code, id) {
      if (id.includes('/server/')) {
        const urlPath = id.replace(/^.*server/, '').replace(/\.ts$/, '')
        const importPath = `./.rpc/build${urlPath}.js`
        console.log({importPath, urlPath, id})
        const ast = this.parse(code)
        const module = await import(importPath)
        const exportedAsyncFunctions = Object.keys(module).filter((endpoint) => module[endpoint].constructor.name === 'AsyncFunction')
        exportedAsyncFunctions.forEach(exportedFunc => {
          serverRoutes[`${urlPath}/${exportedFunc}`] = module[exportedFunc]
        })
        console.log(serverRoutes)
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
        const parse = this.parse
        simple(ast, {
          VariableDeclarator(node) {
            node.init.expression = false
            node.init.body = buildExpressionAst(node.id.name, urlPath, serverRoutes, parse)
          },
          FunctionDeclaration(node) {
            node.body = buildExpressionAst(node.id.name, urlPath, serverRoutes, parse)
          }
        })

        const newCode = generate(ast)
        console.log(newCode)
        return {
          code: newCode,
          map: { mappings: '' }
        }
      }
    },
    configureServer: function(server) {
      server.middlewares.use('/server', function (req, res) {
        console.log('server hit', req.url, req.method)
        if (serverRoutes[req.url]) {
          const body = [];
          req
              .on('data', chunk => {
                body.push(chunk);
              })
              .on('end', async () => {
                const payload = JSON.parse(Buffer.concat(body).toString());
                console.log(payload)
                const result = JSON.stringify(await serverRoutes[req.url](...payload))
                console.log(result)
                res.end(result)
              });
        }
      })
    },
    buildStart: function() {
      const program = ts.createProgram(["src/server/util.ts", "src/server/other.ts"], {
        outDir: '.rpc/build',
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.CommonJS,
        allowJs: true,
        esModuleInterop: true,
        sourceMap: true
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
