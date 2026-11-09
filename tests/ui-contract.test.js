import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

for(const [page,script] of [['index.html','app.js'],['family.html','family.js']])test(`${page} declares all directly referenced controls exactly once`,async()=>{
 const html=await readFile(new URL(`../public/${page}`,import.meta.url),'utf8');const code=await readFile(new URL(`../public/${script}`,import.meta.url),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);const used=[...code.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'Duplicate HTML IDs');
 assert.deepEqual([...new Set(used)].filter(id=>!ids.includes(id)),[],'Script references missing controls');
});
