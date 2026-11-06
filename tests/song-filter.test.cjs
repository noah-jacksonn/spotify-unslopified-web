const test = require('node:test');
const assert = require('node:assert/strict');
const {apply} = require('../extension/song-filter.js');
test('latest uses timestamps rather than track order, falls back to import date and leaves source intact', () => {
 const songs=[{title:'old',createdAt:'2026-01-01'},{title:'unknown'},{title:'import',importedAt:'2026-11-02'},{title:'new',createdAt:'2026-11-03'}];
 assert.deepEqual(apply(songs,{kind:'latest',count:2}).map(s=>s.title),['new','import']);
 assert.equal(songs[0].title,'old');
 assert.deepEqual(apply(songs,{kind:'all'}).map(s=>s.title),['new','import','old','unknown']);
});
test('rolling days include today and six prior calendar days, excluding future and unknown dates', () => {
 const songs=['2026-10-30','2026-10-31','2026-11-06','2026-11-07',null].map(createdAt=>({createdAt}));
 assert.deepEqual(apply(songs,{kind:'days',count:7},new Date(2026,10,6,12)).map(s=>s.createdAt),['2026-11-06','2026-10-31']);
});

test('all songs and date ranges keep equal dates stable and missing dates last', () => {
 const songs=[{id:0},{id:1,createdAt:'2026-11-05'},{id:2,createdAt:'2026-11-06'},
   {id:3,createdAt:'2026-11-06'},{id:4,createdAt:'invalid'}];
 assert.deepEqual(apply(songs,{kind:'all'}).map(s=>s.id),[2,3,1,0,4]);
 assert.deepEqual(apply(songs,{kind:'dates',from:'2026-11-01',through:'2026-11-06'}).map(s=>s.id),[2,3,1]);
 assert.deepEqual(songs.map(s=>s.id),[0,1,2,3,4]);
});
test('custom ranges include the whole end date in the local timezone', () => {
 const songs=[{createdAt:new Date(2026,10,6,23,59).toISOString()},{createdAt:new Date(2026,10,7).toISOString()},{createdAt:null}];
 assert.deepEqual(apply(songs,{kind:'dates',from:'2026-11-06',through:'2026-11-06'}),[songs[0]]);
});


test('saved filters validate counts and date ranges and keep libraries separate', () => {
 const {restore,storageKey}=require('../extension/song-filter.js');
 for(const value of [null,{}, {kind:'latest',count:-1},{kind:'latest',count:1.5},{kind:'days',count:1},{kind:'dates',from:'2026-11-06',through:'2026-11-01'}]) {
   assert.deepEqual(restore(value),{kind:'all'});
 }
 assert.deepEqual(restore({kind:'latest',count:23}),{kind:'latest',count:23});
 assert.deepEqual(restore({kind:'days',count:90}),{kind:'days',count:90});
 assert.notEqual(storageKey('first','Suno'),storageKey('second','Suno'));
});
