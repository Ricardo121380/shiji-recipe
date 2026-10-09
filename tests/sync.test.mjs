import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { decideTick } from '../src/sync.js';

const plan = over => ({ empty: false, cloudNewer: false, localDirty: false, localN: 5, cloudN: 5, ...over });
const ctx = over => ({ synced: true, pristine: false, missingImages: 0, cloudImgs: 0, liveImgs: 0, ...over });

test('云端为空时上传本机', () => {
  assert.equal(decideTick(plan({ empty: true }), ctx({ synced: false })), 'push');
});

test('从未同步且本机未改动：自动恢复', () => {
  assert.equal(decideTick(plan({ cloudNewer: true }), ctx({ synced: false, pristine: true })), 'restore');
});

test('从未同步但本机有数据：只提示选择，绝不自动覆盖', () => {
  assert.equal(decideTick(plan({ cloudNewer: true }), ctx({ synced: false, pristine: false })), 'needs-choice');
  assert.equal(
    decideTick(plan({ cloudNewer: true, localDirty: true }), ctx({ synced: false, pristine: false })),
    'needs-choice',
  );
});

test('云端较新：提示下载，不推送', () => {
  assert.equal(decideTick(plan({ cloudNewer: true, localDirty: true }), ctx()), 'needs-pull');
});

test('缺配图时先补图', () => {
  assert.equal(decideTick(plan({ localDirty: true }), ctx({ missingImages: 2 })), 'repair');
});

test('本机有改动且菜谱不少于云端：上传', () => {
  assert.equal(decideTick(plan({ localDirty: true, localN: 6 }), ctx()), 'push');
});

test('本机菜谱少于云端：不自动上传（防误删）', () => {
  assert.equal(decideTick(plan({ localDirty: true, localN: 4 }), ctx()), 'latest');
});

test('云端配图多于本机：不自动上传', () => {
  assert.equal(decideTick(plan({ localDirty: true }), ctx({ cloudImgs: 3, liveImgs: 1 })), 'needs-pull');
});

test('没有改动：保持', () => {
  assert.equal(decideTick(plan(), ctx()), 'latest');
});
