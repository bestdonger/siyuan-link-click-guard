const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {JSDOM} = require("jsdom");

async function setup(saved = {}) {
  const dom = new JSDOM(`<div class="protyle-wysiwyg" contenteditable="true">
    <span id="url" data-type="a" data-href="https://example.com">https://example.com</span>
    <span id="named" data-type="strong a" data-href="https://example.com"><b>标题</b></span>
    <span id="ref" data-type="block-ref" contenteditable="false">引用</span>
    <span id="internal" data-type="a" data-href="siyuan://blocks/20261005000000-abcdefg">内链</span>
    <span id="asset" data-type="a" data-href="assets/file.pdf">附件</span>
    <span id="text">正文</span>
  </div><div id="outside" data-type="a" data-href="https://example.com">文档树</div>`);
  const module = {exports: {}};
  class Plugin {
    async loadData() {return saved;}
    async saveData(key, data) {this.saved = data;}
  }
  class Setting {constructor() {this.items = [];} addItem(item) {this.items.push(item);}}
  vm.runInNewContext(fs.readFileSync(require.resolve("../index.js"), "utf8"), {
    module, document: dom.window.document, console,
    require: () => ({Plugin, Setting, showMessage() {}})
  });
  const plugin = new module.exports();
  await plugin.onload();
  let navigation = 0;
  const nativeClicks = [];
  dom.window.document.querySelector(".protyle-wysiwyg").addEventListener("click", event => {
    navigation++;
    nativeClicks.push({metaKey: event.metaKey, ctrlKey: event.ctrlKey, target: event.target});
  });
  return {dom, plugin, nativeClicks, click(id, extra = {}) {
    const before = navigation;
    const event = new dom.window.MouseEvent("click", {bubbles: true, cancelable: true, button: 0, ...extra});
    dom.window.document.querySelector(id).dispatchEvent(event);
    return {opened: navigation > before, defaultPrevented: event.defaultPrevented};
  }};
}

test("单击纯网址、标题内嵌元素、块引用及内链阻止跳转，保留默认编辑行为", async () => {
  const s = await setup();
  for (const id of ["#url", "#named b", "#ref", "#internal"]) {
    assert.deepEqual(s.click(id), {opened: false, defaultPrevented: false});
  }
  s.dom.window.close();
});

test("网页组合键、Alt/Shift、中键和右键保留原有事件", async () => {
  const s = await setup();
  for (const extra of [{metaKey: true}, {ctrlKey: true}, {altKey: true}, {shiftKey: true}, {button: 1}, {button: 2}]) {
    for (const id of ["#url", "#ref"]) assert.equal(s.click(id, extra).opened, true);
  }
  s.dom.window.close();
});

test("Cmd/Ctrl 点击内部引用使用前台打开路径，每次只导航一次", async () => {
  const s = await setup();
  s.dom.window.document.querySelector("#ref").setAttribute("data-id", "20261005000000-abcdefg");
  for (const extra of [{metaKey: true}, {ctrlKey: true}]) {
    for (const id of ["#ref", "#internal"]) {
      const before = s.nativeClicks.length;
      assert.deepEqual(s.click(id, extra), {opened: true, defaultPrevented: true});
      assert.equal(s.nativeClicks.length, before + 1);
      assert.equal(s.nativeClicks.at(-1).metaKey, false);
      assert.equal(s.nativeClicks.at(-1).ctrlKey, false);
      assert.equal(s.nativeClicks.at(-1).target, s.dom.window.document.querySelector(id));
    }
  }
  // 不移除 URI 参数，仍由思源原生处理。
  const link = s.dom.window.document.querySelector("#internal");
  link.setAttribute("data-href", "siyuan://blocks/20261005000000-abcdefg?av-item=test");
  s.click("#internal", {metaKey: true});
  assert.equal(s.nativeClicks.at(-1).target.getAttribute("data-href"), link.getAttribute("data-href"));
  s.dom.window.close();
});

test("内部跳转清除文字选区；禁用设置及附加修饰键时保持原生行为", async () => {
  const s = await setup();
  const selection = s.dom.window.getSelection();
  selection.selectAllChildren(s.dom.window.document.querySelector("#text"));
  s.click("#ref", {metaKey: true});
  assert.equal(selection.isCollapsed, true);
  s.click("#ref", {metaKey: true, altKey: true});
  assert.equal(s.nativeClicks.at(-1).metaKey, true);
  s.plugin.options.blockReferences = false;
  assert.equal(s.click("#ref", {metaKey: true}).defaultPrevented, false);
  assert.equal(s.nativeClicks.at(-1).metaKey, true);
  s.dom.window.close();
});

test("普通文字、附件、只读区域和编辑器外不受影响", async () => {
  const s = await setup();
  assert.equal(s.click("#text").opened, true);
  assert.equal(s.click("#asset").opened, true);
  let outsideClicked = false;
  s.dom.window.document.querySelector("#outside").addEventListener("click", () => outsideClicked = true);
  s.click("#outside");
  assert.equal(outsideClicked, true);
  const editor = s.dom.window.document.querySelector(".protyle-wysiwyg");
  editor.setAttribute("data-readonly", "true");
  assert.equal(s.click("#url").opened, true);
  editor.removeAttribute("data-readonly");
  editor.setAttribute("contenteditable", "false");
  assert.equal(s.click("#ref").opened, true);
  s.dom.window.close();
});

test("两项设置独立控制，保存并立即生效", async () => {
  const s = await setup({externalLinks: false, blockReferences: true});
  assert.equal(s.click("#url").opened, true);
  assert.equal(s.click("#ref").opened, false);
  const input = s.plugin.setting.items[1].createActionElement();
  input.checked = false;
  input.dispatchEvent(new s.dom.window.Event("change"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.click("#ref").opened, true);
  assert.deepEqual(JSON.parse(JSON.stringify(s.plugin.saved)), {externalLinks: false, blockReferences: false});
  s.dom.window.close();
});

test("卸载清理监听器，恢复默认行为", async () => {
  const s = await setup();
  assert.equal(s.click("#url").opened, false);
  s.plugin.onunload();
  assert.equal(s.click("#url").opened, true);
  s.dom.window.close();
});
