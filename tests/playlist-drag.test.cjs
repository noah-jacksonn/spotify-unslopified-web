const test=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {readFileSync}=require('node:fs');
const wait=()=>new Promise(resolve=>setTimeout(resolve,330));
function fixture(t) {
 const dom=new JSDOM('<div id="list"><button data-playlist-id="a">A</button><button data-playlist-id="b">B</button></div>',{runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close());
 const w=dom.window, list=w.document.getElementById('list'), [a,b]=list.children, moves=[];
 Object.defineProperty(w.document,'scrollingElement',{value:w.document.documentElement});
 a.getBoundingClientRect=()=>({top:0,bottom:50,left:0,width:200,height:50});
 b.getBoundingClientRect=()=>({top:60,bottom:110,left:0,width:200,height:50});
 w.document.elementFromPoint=()=>b;
 w.eval(readFileSync('extension/playlist-drag.js','utf8'));
 w.PlaylistDrag.mount(list,(...args)=>moves.push(args));
 const pointer=(target,type,x=10,y=10)=>target.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y}));
 return {w,list,a,b,moves,pointer};
}
test('a short hold lifts, dropping moves once and suppresses the navigation click',async t=>{
 const {w,list,a,moves,pointer}=fixture(t);
 pointer(a,'pointerdown');await wait();
 assert.ok(list.querySelector('.playlist-drag-ghost'));
 pointer(w,'pointermove',10,100);pointer(w,'pointerup',10,100);
 assert.equal(moves.length,1);assert.deepEqual(Array.from(moves[0][3]),['a','b']);
 assert.deepEqual(moves[0].slice(0,3),['a','b',true]);
 const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});
 a.dispatchEvent(click);assert.ok(click.defaultPrevented);
 assert.equal(list.querySelector('.playlist-drag-ghost'),null);
});
test('scrolling before the hold or releasing outside does not start a drag',async t=>{
 const {w,list,a,moves,pointer}=fixture(t);
 pointer(a,'pointerdown');pointer(w,'pointermove',10,30);await wait();
 assert.equal(list.querySelector('.playlist-drag-ghost'),null);
 pointer(a,'pointerdown');pointer(w,'pointerup');await wait();
 assert.equal(list.querySelector('.playlist-drag-ghost'),null);assert.equal(moves.length,0);
});
test('Escape cancels a lifted playlist without saving a move',async t=>{
 const {w,list,a,moves,pointer}=fixture(t);
 pointer(a,'pointerdown');await wait();pointer(w,'pointermove',10,100);
 a.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(moves.length,0);assert.equal(list.querySelector('.playlist-drag-ghost'),null);
});
