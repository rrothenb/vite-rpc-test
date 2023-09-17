import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import Inspect from 'vite-plugin-inspect'

// https://vitejs.dev/config/

let middlewares

const rpcTest = async () => {
  return {
    name: 'rpc test',
        transform: async function (code, id) {
      if (id.includes('/server/') && middlewares) {

        const urlPath = id.replace(/^.*server/, '').replace(/\.js$/, '')
        const importPath = `./src/server${urlPath}.js`
        console.log({importPath, urlPath})
        const module = await import(importPath)
        Object.keys(module).map((endpoint) => console.log(module[endpoint].name, module[endpoint].length))
        return `export const secret = (message) => 'goodbye';`
      }
    },
    configureServer: function(server) {
      middlewares = server.middlewares
    }
  }
}

export default defineConfig({
  plugins: [react(), Inspect(), rpcTest()]
})
