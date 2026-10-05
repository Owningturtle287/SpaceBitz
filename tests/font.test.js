import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

// Read the actual shipped WOFF cmap; a CSS family assertion cannot catch fallback glyphs.
function glyphs(bytes){
  assert.equal(bytes.toString('ascii',0,4),'wOFF');
  let cmap;
  for(let i=0;i<bytes.readUInt16BE(12);i++){
    const at=44+i*20;if(bytes.toString('ascii',at,at+4)!=='cmap')continue;
    const offset=bytes.readUInt32BE(at+4),compressed=bytes.readUInt32BE(at+8),length=bytes.readUInt32BE(at+12);
    const table=bytes.subarray(offset,offset+compressed);cmap=compressed<length?inflateSync(table):table;
  }
  assert.ok(cmap,'Missing cmap');
  const found=new Set();
  for(let i=0;i<cmap.readUInt16BE(2);i++){
    const at=4+i*8,platform=cmap.readUInt16BE(at),encoding=cmap.readUInt16BE(at+2),offset=cmap.readUInt32BE(at+4);
    if(platform!==0&&!(platform===3&&encoding===1))continue;
    if(cmap.readUInt16BE(offset)!==4)continue;
    const count=cmap.readUInt16BE(offset+6)/2,end=offset+14,start=end+count*2+2,delta=start+count*2,range=delta+count*2;
    for(let j=0;j<count;j++)for(let code=cmap.readUInt16BE(start+j*2);code<=cmap.readUInt16BE(end+j*2)&&code<65535;code++){
      const displacement=cmap.readUInt16BE(range+j*2),adjust=cmap.readInt16BE(delta+j*2);
      const raw=displacement?cmap.readUInt16BE(range+j*2+displacement+(code-cmap.readUInt16BE(start+j*2))*2):code;
      if(raw&&((raw+adjust)&65535))found.add(code);
    }
  }
  return found;
}
test('shipped pixel font covers every printable keyboard key and the interface symbols',()=>{
  const mapped=glyphs(readFileSync(new URL('../assets/spacebitz-pixel.woff',import.meta.url)));
  for(let code=32;code<=126;code++)assert.ok(mapped.has(code),`Fallback for ${String.fromCharCode(code)}`);
  for(const char of '·×…–—−’“”←↑↓→⌄█▤✕°²³±≈☉⊙⊕')assert.ok(mapped.has(char.codePointAt(0)),`Fallback for ${char}`);
});
