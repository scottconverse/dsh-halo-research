import { build } from '../tools/node_modules/esbuild/lib/main.js';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const id = '@deepseek-ai/dsh-client-ui-model-selection';
const cssPlugin = {
  name: 'development-picker-css',
  setup(builder) {
    builder.onLoad({ filter: /\.module\.css$/ }, async ({ path }) => {
      const original = await readFile(path, 'utf8');
      const names = {};
      const css = original.replace(/\.([a-zA-Z_][\w-]*)/g, (_, name) => {
        names[name] = `halo_dev_picker_${name}`;
        return `.${names[name]}`;
      });
      return {
        loader: 'js',
        contents: `const tagId=${JSON.stringify(id + '/development-picker.css')};
if(typeof document!=='undefined'&&!document.querySelector('style[data-plugin-css='+JSON.stringify(tagId)+']')) {
  const tag=document.createElement('style');tag.dataset.plugin=${JSON.stringify(id)};
  tag.dataset.pluginCss=tagId;tag.textContent=${JSON.stringify(css)};document.head.appendChild(tag);
}
export default ${JSON.stringify(names)};`,
      };
    });
  },
};
const result = await build({
  absWorkingDir: root, entryPoints: ['source/client/index.ts'],
  bundle: true, write: false, format: 'cjs', platform: 'browser', target: 'es2022',
  jsx: 'automatic', external: ['react', 'react/*', '@deepseek-ai/*'],
  nodePaths: [resolve(root, '../tools/node_modules')], plugins: [cssPlugin],
});
const bundle = `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:(require)=>{\nvar module={exports:{}};var exports=module.exports;\n${result.outputFiles[0].text}\nreturn module.exports;\n}});\n`;
await writeFile(resolve(root, 'package/lib/client.js'), bundle);
console.log(`Built development picker: ${Buffer.byteLength(bundle)} bytes; ${result.warnings.length} warnings`);
