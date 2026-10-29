import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { projectFingerprint } from './project-fingerprint.mjs';

test('fingerprint ignores output logs but observes tracked, new and staged source changes', async () => {
  const dir=mkdtempSync(join(tmpdir(),'triad-fingerprint-'));
  const git=(...args)=>execFileSync('git',['-C',dir,...args],{windowsHide:true});
  try {
    writeFileSync(join(dir,'.gitignore'),'*.log\n');writeFileSync(join(dir,'source.txt'),'before');
    git('init','-q');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
    const before=await projectFingerprint(dir);
    writeFileSync(join(dir,'output.log'),'new process output');assert.equal(await projectFingerprint(dir),before);
    writeFileSync(join(dir,'source.txt'),'after');const changed=await projectFingerprint(dir);assert.notEqual(changed,before);
    assert.equal(await projectFingerprint(dir),changed,'unchanged polls retain identical identity');
    git('add','source.txt');assert.notEqual(await projectFingerprint(dir),changed,'index changes are retained');
    const staged=await projectFingerprint(dir);writeFileSync(join(dir,'new-source.txt'),'new');assert.notEqual(await projectFingerprint(dir),staged);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
