import {cp,mkdir,rm,readFile,stat} from 'node:fs/promises';
import './release.mjs';
const root=new URL('../',import.meta.url),output=new URL('dist/',root);
const sw=await readFile(new URL('sw.js',root),'utf8');
const shell=sw.match(/const SHELL=\[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1)).filter(path=>path!=='./');
const audio='audio/nostalgic_melody_soft_synth.mp3';
if((await stat(new URL(audio,root))).size<700000)throw Error('Full soundtrack missing; run npm run assets:audio.');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const path of [...shell,'sw.js',audio]){const target=new URL(path,output);await mkdir(new URL('./',target),{recursive:true});await cp(new URL(path,root),target);}
console.log('Built dist/ with runtime assets only.');
