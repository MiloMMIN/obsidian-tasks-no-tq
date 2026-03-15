# obsidian-tasks-no-tq

A small custom fork of the Obsidian Tasks plugin that stops Tasks from auto-registering `TQ_*` property types on startup.

## What this fork changes

This fork keeps the normal Tasks plugin behavior, but removes the startup call that writes `TQ_*` property types back into Obsidian.

Without this change, entries like these can reappear in `.obsidian/types.json` after restarting Obsidian:

- `TQ_explain`
- `TQ_extra_instructions`
- `TQ_short_mode`
- `TQ_show_*`

This fork disables only that startup registration behavior.

## Why this exists

The upstream Tasks plugin bundle includes logic that registers `TQ_*` property types when the plugin loads.

If you manually remove those property definitions from `.obsidian/types.json`, they can come back on the next Obsidian restart.

This fork exists for users who want to keep using Tasks without having those `TQ_*` property type entries recreated automatically.

## Plugin information

- Plugin name: `Tasks No TQ`
- Plugin ID: `obsidian-tasks-no-tq`
- Based on: Tasks `7.22.0`
- Current version: `7.22.0-no-tq.1`

## Files kept at repository root

This repository keeps only the files BRAT needs at the root:

- `manifest.json`
- `main.js`
- `styles.css`

## Install in Obsidian with BRAT

1. Install and enable the BRAT plugin in Obsidian.
2. Open `Settings -> Community plugins -> BRAT`.
3. Choose `Add Beta plugin`.
4. Paste this repository:
   - `MiloMMIN/obsidian-tasks-no-tq`
5. Install `Tasks No TQ`.
6. Enable `Tasks No TQ` in Community Plugins.
7. Disable the upstream `Tasks` plugin if it is still enabled.
8. Restart Obsidian once.

## 中文快速开始

如果你只是想尽快用起来，可以直接按下面做：

1. 在 Obsidian 里确认已经安装 BRAT。
2. 打开 `设置 -> 第三方插件 -> BRAT`。
3. 选择 `Add Beta plugin`。
4. 输入仓库地址：
   - `MiloMMIN/obsidian-tasks-no-tq`
5. 安装并启用 `Tasks No TQ`。
6. 把原来的 `Tasks` 插件停用。
7. 重启 Obsidian。
8. 如果 `.obsidian/types.json` 里还有旧的 `TQ_*` 项，删一次后再重启确认不再回来了。

## How to use it in Obsidian

After installation, usage is the same as the normal Tasks plugin.

You can continue to:

- write Tasks checkboxes in notes
- use Tasks queries
- use the existing Tasks commands from the command palette
- keep your current Tasks-based workflow

The practical difference is only this:

- `Tasks No TQ` will not automatically recreate `TQ_*` property type entries on startup

## Typical usage examples

You can use it exactly like standard Tasks, for example:

```markdown
- [ ] Finish the report 📅 2026-03-20
- [ ] Review weekly notes
```

And query them in a note:

```tasks
not done
sort by due
```

If your previous workflow already relied on Tasks, you do not need to change your note syntax just to use this fork.

## Recommended migration steps

If you are switching from the upstream Tasks plugin:

1. Install and enable `Tasks No TQ`.
2. Disable the original `Tasks` plugin.
3. Restart Obsidian.
4. Open `.obsidian/types.json` and remove unwanted `TQ_*` entries one last time if they are still present.
5. Restart Obsidian again and confirm they do not come back.

## Technical note

The removed startup behavior is the call to `this.setObsidianPropertiesTypes()` during plugin load.

The related helper code still exists in the bundle, but it is no longer executed automatically on startup.

## Notes for maintenance

- If you want newer upstream fixes later, update from upstream and re-apply the same startup-call removal.
- Keep the plugin ID stable once users install it through BRAT.