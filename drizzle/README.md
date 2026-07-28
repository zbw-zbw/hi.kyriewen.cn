# drizzle/ 目录的真实状态

**读之前先知道一件事：这个目录里的 SQL 文件不是生产库的变更历史。**

## 现状

Schema 的唯一真相源是 [`packages/db/src/schema.ts`](../packages/db/src/schema.ts)，
生产库靠 `drizzle-kit push` 对齐。本目录里的文件分两类：

| 文件                                                                                   | 是否在 `meta/_journal.json` 里 | 说明                             |
| -------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------- |
| `0000_empty_slipstream` `0001_exotic_loki` `0002_bent_sunfire` `0003_oval_vin_gonzales` | 是                             | `drizzle-kit generate` 的产物    |
| `0002_page_views` `0003_newsletter_issues` `0004_blog_source_fields`                    | **否**                         | 手写 SQL，`migrate` 永远不会执行 |
| `0005_i18n_navigation` `0006_navigation_labels`                                         | **否**                         | 同上                             |

因此存在两个已知问题：

1. **编号冲突**：`0002` 和 `0003` 各有两个文件，手写的那半边不在 journal 里。
2. **执行状态不明**：手写 SQL 大概率是当初手动在库上跑过的，但没有任何记录能证明。

## 重要：构建不再自动改 schema

`pnpm build` 曾经是 `pnpm db:push && next build`，也就是**每次部署都会对生产库
自动执行 schema 变更**（`push` 可以删列删表），没有 review、没有回滚点。这一耦合已被移除。

现在改 schema 的正确流程：

```bash
# 1. 改 packages/db/src/schema.ts
# 2. 本地对着开发库确认 diff
pnpm db:push
# 3. 确认无误后，人工对生产库执行（不要放进 CI/部署流水线）
```

## 如果要迁到规范的迁移流程

需要做一次 baseline，不要在没有备份的情况下操作：

1. `pg_dump --schema-only` 备份生产 schema。
2. 删除本目录全部内容，`pnpm db:generate` 生成一份与当前 schema 等价的 `0000` 初始迁移。
3. 在生产库的 `drizzle.__drizzle_migrations` 表里把这条记录标记为已应用（baseline），
   避免 `migrate` 重复建表。
4. 之后统一用 `db:generate` + `db:migrate`，禁用 `db:push`。
