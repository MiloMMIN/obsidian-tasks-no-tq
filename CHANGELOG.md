# Changelog

## 1.0.0

完全重写为独立轻量插件，不再包含任何 Tasks 功能。

- 与原版 Tasks 插件共存，不替代 Tasks
- 自动清除 Tasks 注册的 `TQ_*` 属性类型（内存 + types.json）
- 启动后延迟 3 秒执行首次清理，之后每 60 秒自动检查
- 提供命令面板命令手动触发清理
- 附带一次性清理脚本 `scripts/cleanup-tq-once.mjs`
