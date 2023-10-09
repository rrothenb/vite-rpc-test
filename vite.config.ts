import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react-swc'
import SimpleRpc from 'vite-plugin-simple-rpc'

export default defineConfig({
  plugins: [react(), SimpleRpc()]
})
