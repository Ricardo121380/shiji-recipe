// 测试环境：给浏览器模块提供最小的 localStorage / document / window 替身
class MemoryStorage {
  constructor() {
    this.map = new Map();
    this.failWrites = false;
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}
const fakeEl = () => ({
  textContent: '',
  innerHTML: '',
  classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
});
globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
globalThis.document = {
  querySelector: () => fakeEl(),
  querySelectorAll: () => [],
  createElement: () => fakeEl(),
  addEventListener() {},
  hidden: false,
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.location = { hostname: 'localhost', href: 'http://localhost/' };
