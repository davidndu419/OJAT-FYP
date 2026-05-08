import path from 'path';
import {defineConfig, transformWithEsbuild} from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET =
  'https://ojat-fyp-ayea-git-main-davidndu419s-projects.vercel.app';

const reactNativeJsxPlugin = () => ({
  name: 'react-native-jsx-loader',
  async transform(code, id) {
    if (!id.endsWith('.js') || id.includes('node_modules')) {
      return null;
    }

    return transformWithEsbuild(code, id, {
      loader: 'jsx',
      jsx: 'automatic',
    });
  },
});

export default defineConfig({
  plugins: [reactNativeJsxPlugin(), react()],
  esbuild: {
    loader: 'jsx',
    include: /(?:src|App)\S*\.js$/,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  resolve: {
    alias: [
      {
        find: 'react-native/Libraries/Utilities/codegenNativeCommands',
        replacement: path.resolve(
          __dirname,
          'src/web/codegenNativeCommands.web.js',
        ),
      },
      {
        find: 'react-native/Libraries/Utilities/codegenNativeComponent',
        replacement: path.resolve(
          __dirname,
          'src/web/codegenNativeComponent.web.js',
        ),
      },
      {
        find: 'react-native-web/Libraries/Utilities/codegenNativeCommands',
        replacement: path.resolve(
          __dirname,
          'src/web/codegenNativeCommands.web.js',
        ),
      },
      {
        find: 'react-native-web/Libraries/Utilities/codegenNativeComponent',
        replacement: path.resolve(
          __dirname,
          'src/web/codegenNativeComponent.web.js',
        ),
      },
      {
        find: '@react-native-google-signin/google-signin',
        replacement: path.resolve(__dirname, 'src/web/googleSignIn.web.js'),
      },
      {
        find: 'react-native-vector-icons/FontAwesome',
        replacement: path.resolve(__dirname, 'src/web/FontAwesome.web.js'),
      },
      {
        find: 'react-native-vector-icons/MaterialCommunityIcons',
        replacement: path.resolve(__dirname, 'src/web/FontAwesome.web.js'),
      },
      {
        find: '@react-native-vector-icons/material-design-icons',
        replacement: path.resolve(__dirname, 'src/web/FontAwesome.web.js'),
      },
      {
        find: 'lucide-react-native',
        replacement: path.resolve(__dirname, 'src/web/lucideReactNative.web.js'),
      },
      {
        find: 'react-native-svg',
        replacement: path.resolve(__dirname, 'src/web/reactNativeSvg.web.js'),
      },
      {
        find: 'react-native-chart-kit',
        replacement: path.resolve(__dirname, 'src/web/chartKit.web.js'),
      },
      {
        find: 'react-native-screens',
        replacement: path.resolve(__dirname, 'src/web/reactNativeScreens.web.js'),
      },
      {
        find: /^react-native$/,
        replacement: 'react-native-web',
      },
    ],
    extensions: [
      '.web.js',
      '.web.jsx',
      '.js',
      '.jsx',
      '.json',
      '.mjs',
      '.ts',
      '.tsx',
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: true,
      },
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
