// vite.config.ts
import path from "path";
import react from "file:///C:/Users/TYJ2KOR/OneDrive%20-%20Bosch%20Group/Desktop/autowrx%20ORCA/autowrx-fork/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "file:///C:/Users/TYJ2KOR/OneDrive%20-%20Bosch%20Group/Desktop/autowrx%20ORCA/autowrx-fork/frontend/node_modules/vite/dist/node/index.js";
import { visualizer } from "file:///C:/Users/TYJ2KOR/OneDrive%20-%20Bosch%20Group/Desktop/autowrx%20ORCA/autowrx-fork/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "C:\\Users\\TYJ2KOR\\OneDrive - Bosch Group\\Desktop\\autowrx ORCA\\autowrx-fork\\frontend";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true
    })
  ],
  build: {
    // Output directory - relative to vite.config.ts location (frontend/)
    // For Docker builds, this should be ../backend/static/frontend-dist
    // For local development, you can change this to 'dist' if needed
    outDir: process.env.VITE_BUILD_OUT_DIR ? path.resolve(__vite_injected_original_dirname, process.env.VITE_BUILD_OUT_DIR) : path.resolve(__vite_injected_original_dirname, "../backend/static/frontend-dist")
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    proxy: {
      "/v2": {
        target: "http://localhost:3201",
        changeOrigin: true,
        secure: false
      },
      "/d": {
        target: "http://localhost:3201",
        changeOrigin: true,
        secure: false
      },
      "/static": {
        target: "http://localhost:3201",
        changeOrigin: true,
        secure: false
      },
      "/plugin": {
        target: "http://localhost:3201",
        changeOrigin: true,
        secure: false
      },
      "/images": {
        target: "http://localhost:3201",
        changeOrigin: true,
        secure: false
      },
      "/builtin-widgets": {
        target: "http://localhost:3201",
        changeOrigin: true,
        secure: false
      },
      "/vss": {
        target: "http://localhost:3201",
        changeOrigin: true,
        secure: false
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUWUoyS09SXFxcXE9uZURyaXZlIC0gQm9zY2ggR3JvdXBcXFxcRGVza3RvcFxcXFxhdXRvd3J4IE9SQ0FcXFxcYXV0b3dyeC1mb3JrXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUWUoyS09SXFxcXE9uZURyaXZlIC0gQm9zY2ggR3JvdXBcXFxcRGVza3RvcFxcXFxhdXRvd3J4IE9SQ0FcXFxcYXV0b3dyeC1mb3JrXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9UWUoyS09SL09uZURyaXZlJTIwLSUyMEJvc2NoJTIwR3JvdXAvRGVza3RvcC9hdXRvd3J4JTIwT1JDQS9hdXRvd3J4LWZvcmsvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjsvLyBDb3B5cmlnaHQgKGMpIDIwMjUgRWNsaXBzZSBGb3VuZGF0aW9uLlxuLy8gXG4vLyBUaGlzIHByb2dyYW0gYW5kIHRoZSBhY2NvbXBhbnlpbmcgbWF0ZXJpYWxzIGFyZSBtYWRlIGF2YWlsYWJsZSB1bmRlciB0aGVcbi8vIHRlcm1zIG9mIHRoZSBNSVQgTGljZW5zZSB3aGljaCBpcyBhdmFpbGFibGUgYXRcbi8vIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlULlxuLy9cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBNSVRcblxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB2aXN1YWxpemVyKHtcbiAgICAgIG9wZW46IHRydWUsXG4gICAgfSksXG4gIF0sXG4gIGJ1aWxkOiB7XG4gICAgLy8gT3V0cHV0IGRpcmVjdG9yeSAtIHJlbGF0aXZlIHRvIHZpdGUuY29uZmlnLnRzIGxvY2F0aW9uIChmcm9udGVuZC8pXG4gICAgLy8gRm9yIERvY2tlciBidWlsZHMsIHRoaXMgc2hvdWxkIGJlIC4uL2JhY2tlbmQvc3RhdGljL2Zyb250ZW5kLWRpc3RcbiAgICAvLyBGb3IgbG9jYWwgZGV2ZWxvcG1lbnQsIHlvdSBjYW4gY2hhbmdlIHRoaXMgdG8gJ2Rpc3QnIGlmIG5lZWRlZFxuICAgIG91dERpcjogcHJvY2Vzcy5lbnYuVklURV9CVUlMRF9PVVRfRElSID8gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgcHJvY2Vzcy5lbnYuVklURV9CVUlMRF9PVVRfRElSKSA6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9iYWNrZW5kL3N0YXRpYy9mcm9udGVuZC1kaXN0JyksXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwcm94eToge1xuICAgICAgJy92Mic6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMjAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgICcvZCc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMjAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgICcvc3RhdGljJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMyMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9LFxuICAgICAgJy9wbHVnaW4nOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzIwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICAnL2ltYWdlcyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMjAxJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgICcvYnVpbHRpbi13aWRnZXRzJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjMyMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICB9LFxuICAgICAgJy92c3MnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzIwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBUUEsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sV0FBVztBQUNsQixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLGtCQUFrQjtBQVgzQixJQUFNLG1DQUFtQztBQWF6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixXQUFXO0FBQUEsTUFDVCxNQUFNO0FBQUEsSUFDUixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBLElBSUwsUUFBUSxRQUFRLElBQUkscUJBQXFCLEtBQUssUUFBUSxrQ0FBVyxRQUFRLElBQUksa0JBQWtCLElBQUksS0FBSyxRQUFRLGtDQUFXLGlDQUFpQztBQUFBLEVBQzlKO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLE1BQ0EsTUFBTTtBQUFBLFFBQ0osUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLFdBQVc7QUFBQSxRQUNULFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFDQSxXQUFXO0FBQUEsUUFDVCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLE1BQ0EsV0FBVztBQUFBLFFBQ1QsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLG9CQUFvQjtBQUFBLFFBQ2xCLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
