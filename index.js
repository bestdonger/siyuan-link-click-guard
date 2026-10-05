"use strict";

const {Plugin, Setting, showMessage} = require("siyuan");
const STORAGE = "settings";
const DEFAULTS = Object.freeze({externalLinks: true, blockReferences: true});

module.exports = class LinkClickGuard extends Plugin {
  async onload() {
    this.options = {...DEFAULTS};
    this.disposed = false;
    try {
      const saved = await this.loadData(STORAGE);
      for (const key of Object.keys(DEFAULTS)) {
        if (typeof saved?.[key] === "boolean") this.options[key] = saved[key];
      }
    } catch (error) {
      console.warn("[链接防误跳转] 使用默认设置", error);
    }
    if (this.disposed) return;

    this.clickHandler = event => this.guardClick(event);
    document.addEventListener("click", this.clickHandler, true);
    this.setting = new Setting({});
    for (const [key, title, description] of [
      ["externalLinks", "网页链接防误跳转", "包括纯网址和带标题的网页链接。单击定位光标，⌘/Ctrl＋点击打开。"],
      ["blockReferences", "块引用与内部链接防误跳转", "单击不跳转；⌘/Ctrl、Alt、Shift＋点击保留思源原有操作。"]
    ]) {
      this.setting.addItem({
        title, description,
        createActionElement: () => {
          const input = document.createElement("input");
          input.type = "checkbox";
          input.className = "b3-switch";
          input.setAttribute("aria-label", title);
          input.checked = this.options[key];
          input.addEventListener("change", async () => {
            const previous = this.options[key];
            this.options[key] = input.checked;
            try {
              await this.saveData(STORAGE, {...this.options});
            } catch (error) {
              this.options[key] = previous;
              input.checked = previous;
              console.error("[链接防误跳转] 保存设置失败", error);
              showMessage("链接防误跳转：保存设置失败，请重试。", 5000, "error");
            }
          });
          return input;
        }
      });
    }
  }

  guardClick(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const editor = target.closest(".protyle-wysiwyg");
    if (!editor || editor.getAttribute("data-readonly") === "true" ||
        editor.getAttribute("contenteditable") === "false") return;
    const link = target.closest('[data-type~="a"], [data-type~="block-ref"]');
    if (!link || !editor.contains(link)) return;
    const types = (link.getAttribute("data-type") || "").split(/\s+/);
    const href = (link.getAttribute("data-href") || "").trim();
    const internal = types.includes("block-ref") || href.startsWith("siyuan://blocks/");
    const external = /^https?:\/\//i.test(href);
    if (!(internal ? this.options.blockReferences : external && this.options.externalLinks)) return;

    // 鼠标按下时已由浏览器定位光标。只阻止 click 传给思源的跳转处理器。
    // 不触碰 mousedown，也不取消默认行为，以保留光标定位、拖选和文字编辑。
    event.stopPropagation();
  }

  onunload() {
    this.disposed = true;
    if (this.clickHandler) document.removeEventListener("click", this.clickHandler, true);
    this.clickHandler = null;
  }
};
