import test from 'node:test';
import assert from 'node:assert/strict';
import {validModelSize} from '../model-file.mjs';
test('truncated multi-megabyte download is rejected, actual cached models accepted',()=>{
 assert.equal(validModelSize(2_000_000,348108213),false);
 assert.equal(validModelSize(348108213,348108213),true);
 assert.equal(validModelSize(16880041,16900000),true);
 assert.equal(validModelSize(NaN,16900000),false);
});
