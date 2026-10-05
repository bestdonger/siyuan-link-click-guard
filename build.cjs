"use strict";
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const dest = path.join(__dirname, "dist");
fs.mkdirSync(dest, {recursive: true});
const files = ["index.js", "plugin.json", "README.md", "LICENSE"];
for (const file of files) {
  fs.copyFileSync(path.join(__dirname, file), path.join(dest, file));
}
const archive = path.join(__dirname, "package.build.zip");
try {
  fs.rmSync(archive, {force: true});
  execFileSync("zip", ["-q", "-X", archive, ...files], {cwd: dest});
  fs.renameSync(archive, path.join(__dirname, "package.zip"));
} finally {
  fs.rmSync(archive, {force: true});
}
console.log("已生成 dist/ 与 package.zip，无运行时第三方依赖。打包需要系统 zip 命令。");
