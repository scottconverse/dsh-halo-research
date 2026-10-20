import test from 'node:test';
import assert from 'node:assert/strict';
import {Ledger,parseMoney,canonical} from './ledger.mjs';
test('basic money',()=>assert.equal(parseMoney('12.30'),1230n));
test('canonical object order',()=>assert.equal(canonical({b:2,a:1}),'{"a":1,"b":2}'));
test('transfer',()=>{const l=new Ledger();l.credit('A','10');assert.equal(l.apply([{id:'t',from:'A',to:'B',amount:'2',at:'2026-10-20T01:00:00Z'}]),1);assert.equal(l.balance('B'),200n)});
