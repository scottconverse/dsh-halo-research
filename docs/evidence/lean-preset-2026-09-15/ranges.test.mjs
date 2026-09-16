import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeRanges} from './ranges.ts';
test('numeric order and overlap',()=>assert.deepEqual(mergeRanges([[10,12],[2,6],[4,8]]),[[2,8],[10,12]]));
test('nested and touching',()=>assert.deepEqual(mergeRanges([[1,10],[2,3],[10,12]]),[[1,12]]));
test('empty and disjoint',()=>{assert.deepEqual(mergeRanges([]),[]);assert.deepEqual(mergeRanges([[5,6],[1,2]]),[[1,2],[5,6]]);});
test('does not mutate input or share result arrays',()=>{const input=[[3,8],[1,4]];const copy=structuredClone(input);const result=mergeRanges(input);assert.deepEqual(input,copy);result[0][1]=99;assert.deepEqual(input,copy);});
