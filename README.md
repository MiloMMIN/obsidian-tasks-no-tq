# Tasks No TQ

一个独立的 Obsidian 轻量插件，自动清除 Tasks 插件注册的 `TQ_*` 属性类型。

**与原版 Tasks 插件完全独立，不包含任何 Tasks 功能。**

## 它做什么

原版 Tasks 插件每次启动时会往 Obsidian 的属性类型注册表（`.obsidian/types.json`）里写入大量 `TQ_*` 属性：

- `TQ_explain`, `TQ_extra_instructions`, `TQ_short_mode`
- `TQ_show_toolbar`, `TQ_show_tree`, `TQ_show_tags`, `TQ_show_id` ...
- 共 22 个 `TQ_*` 属性

本插件的唯一功能：**启动后自动删除这些 `TQ_*` 属性类型**。

工作方式：
1. Obsidian 启动后，等待布局就绪（Tasks 已加载完毕），延迟 3 秒后执行清理
2. 每 60 秒自动检查一次，防止 Tasks 重新注册
3. 同时清理内存中的属性注册表和磁盘上的 `types.json`
4. 提供命令面板命令 `Remove TQ_* property types now` 供手动触发

## 安装（BRAT）

1. 确保已安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. 打开 `设置 -> 第三方插件 -> BRAT`
3. 选择 `Add Beta plugin`
4. 输入仓库地址：`MiloMMIN/obsidian-tasks-no-tq`
5. 安装并启用 `Tasks No TQ`
6. **保持原版 Tasks 插件正常启用**（本插件不替代 Tasks）
7. 重启 Obsidian

## 使用方式

安装启用后无需任何操作，插件会自动在后台清理 `TQ_*` 属性。

如需手动清理，可以打开命令面板（Ctrl+P）搜索 `Remove TQ_* property types now`。

## 一次性清理脚本

如果需要额外清理笔记 frontmatter 中残留的 `TQ_*` 属性，可使用附带的清理脚本：

```bash
# 预览模式（不修改文件）
node scripts/cleanup-tq-once.mjs "你的库路径"

# 执行清理
node scripts/cleanup-tq-once.mjs "你的库路径" --write
```

脚本功能：
- 删除 `.obsidian/types.json` 中的 `TQ_*` 条目
- 删除所有 `.md` 文件 frontmatter 中的 `TQ_*` 属性
- 默认预览模式，需 `--write` 才实际修改

## 插件信息

- 插件名：`Tasks No TQ`
- 插件 ID：`obsidian-tasks-no-tq`
- 版本：`1.0.0`
