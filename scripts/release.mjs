// package.json and CHANGELOG.md are authoritative; runtime copies are generated.
import {readFile,writeFile,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const write=process.argv.includes('--write'),{version}=JSON.parse(await read('package.json'));
const markdown=await read('CHANGELOG.md');
const releases=[...markdown.matchAll(/^## (\d+(?:\.\d+)+)[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(([,version,body])=>({version,items:[...body.matchAll(/^- (.+)$/gm)].map(m=>m[1])}));
if(releases[0]?.version!==version)throw Error('The latest changelog entry must match package.json.');
const entries=await readdir(root);
const modules=entries.filter(name=>name.endsWith('.js')&&name!=='sw.js').sort().map(name=>'./'+name);
const styles=entries.filter(name=>name.endsWith('.css')).sort().map(name=>'./'+name);
const shell=['./','./index.html',...modules,...styles,'./assets/spacebitz-pixel.woff','./assets/spacebitz-title.svg','./manifest.webmanifest','./icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
const files=new Map([
  ['changelog.js','// Generated from CHANGELOG.md by npm run release:sync.\nexport const CHANGELOG='+JSON.stringify(releases,null,2)+';\n'],
  ['index.html',(await read('index.html')).replace(/(class="version-chip[^\"]*">)v[\d.]+/,`$1v${version}`)],
  ['sw.js',(await read('sw.js')).replace(/^const CACHE=.*;$/m,`const CACHE='spacebitz-field-v${version}';`).replace(/^const SHELL=.*;$/m,'const SHELL='+JSON.stringify(shell).replaceAll('"',"'")+';')]
]);
for(const [path,expected]of files){if(write)await writeFile(new URL(path,root),expected);else if(await read(path)!==expected)throw Error(path+' is stale. Run npm run release:sync.');}
console.log(`Release ${version}: changelog, visible version, cache and ${modules.length} runtime modules agree.`);
