const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/admin-operations.js','utf8');
const files={
 'data/posts.json':Array.from({length:9},(_,i)=>({slug:'p'+i,headline:'Article '+i,publishedAt:`2026-09-${String(10+i).padStart(2,'0')}`,featured:i===0,popular:i<7})),
 'data/newsletter-pushes.json':[]
};
const document={querySelector:()=>null,querySelectorAll:()=>[]};
const window={store:{posts:files['data/posts.json']},getFile:async path=>({content:Buffer.from(JSON.stringify(files[path]||[])).toString('base64')}),putFile:async(path,content)=>{files[path]=JSON.parse(content);return{ok:true}},renderPosts(){},flash(){}};
const context=vm.createContext({window,document,TextDecoder,Uint8Array,atob:s=>Buffer.from(s,'base64').toString('binary'),confirm:()=>true,console,setInterval:()=>0,clearInterval(){},requestAnimationFrame(){},localStorage:{getItem:()=>null,setItem(){}},Date,JSON});
vm.runInContext(source.replace('let tries=0,t=setInterval', 'window.__test={setPlacement,sendMail};let tries=0,t=setInterval'),context);
(async()=>{
 await window.__test.setPlacement('p2','featured');
 assert.deepEqual(files['data/posts.json'].filter(p=>p.featured).map(p=>p.slug),['p2']);
 assert.equal(window.__pvListMutation,false);
 await window.__test.setPlacement('p8','popular');
 assert.equal(files['data/posts.json'].filter(p=>p.popular).length,7);
 assert.equal(files['data/posts.json'].find(p=>p.slug==='p8').popular,true);
 await window.__test.sendMail(['p2']);
 assert.equal(files['data/newsletter-pushes.json'][0].slug,'p2');
 assert.ok(files['data/newsletter-pushes.json'][0].id.startsWith('p2-'));
 console.log('admin operations persistence: OK');
})().catch(e=>{console.error(e);process.exitCode=1});
