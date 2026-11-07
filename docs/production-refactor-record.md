# 生产级制作链路重构 · 项目记录

> 项目：火宝短剧（Huobao Drama）  
> 记录日期：2026-11-08  
> 代码基线：`master @ b48e6b2`，工作区有 47 项未提交改动（模板/模式/编辑器等）  
> 目标版本：`4.1.0`；当前构建版本：`4.1.0-p0`  
> 当前状态：P0 全部完成（P0-01..P0-08），P1 未开始  
> 唯一事实源：本文件。README / CLAUDE.md 是项目说明，不是本重构的进度源。

---

## 0. 使用协议（防止上下文失忆）

### 0.1 每次会话开始，按顺序只读这些

1. 本文件 `§11 当前工作单元`（交接块）
2. 本文件 `§6 进度日志` 最近 5 条
3. 本文件 `§5` 中当前单元对应的一行
4. 该单元明确列出的源文件（通常 3–6 个）

**禁止**：一次性读 32 个模板技能、40 个 Qoder agent、82 个字字 skill。  
**原因**：本次重构的核心就是“按阶段和条件精确装载”，人（和模型）读文档也必须遵守同一原则。

### 0.2 工作单元定义

一个工作单元 = **一个岗位手艺** 或 **一个模式包**。  
不要在一次改动里同时处理多个模式、多个岗位。

单元执行顺序：

```text
读基线 → 列现有规则 → 分类（专属/共性/模式/专项/服务商）
→ 写目标文件 → 去重与风格词检查 → 装配预览
→ 单模式 dry-run → 更新本文件
```

### 0.3 单元完成定义（DoD）

- [ ] 目标文件已写入，路径与单元表一致
- [ ] 每条规则的来源已标注（现有技能 / Qoder 岗位 / 字字 skill）
- [ ] 与同层规则去重，无重复段落
- [ ] 无画风词（冷色、暖调、胶片、材质、色调等）
- [ ] 装配预览：技能 ≤ 8000 字，总提示词 ≤ 24000 字
- [ ] 单模式 dry-run 通过
- [ ] 本文件 `§6` 与 `§11` 已更新

### 0.4 每次会话结束，必须写交接块

```text
当前单元：
状态：未开始 / 进行中 / 已完成 / 已回退
已完成：
未完成：
验证结果：
下一步：
阻塞与待决策：
```

### 0.5 命名纪律（防止混淆）

| 名称 | 类型 | 示例 | 使用规则 |
|---|---|---|---|
| Qoder 岗位 | 参考组织角色 | 分镜与覆盖、时长与接点 | 只作为权责参考，**不能直接当技能 ID** |
| 字字 skill | 参考内容 | `baizhou`、`seedance25-video-prompt-master` | 只提炼规则，**不整篇导入**，**不导入风格前缀** |
| 我们的 Agent | 运行时角色 | `script_rewriter`、`storyboard_breaker` | 固定 4 个，不新增 |
| 我们的技能 | 可注入文件 | `craft/storyboard-craft` | 唯一注入单元 |
| 模板 | 制作模式 | `suspense-mystery` | 固定 8 个 |
| 阶段 | 流程节点 | `storyboard` | 固定 7 个 |
| 校验器 | 确定性代码 | `V3 storyboard-contract` | 不调用模型 |

**写文档时，必须写全限定名**：例如“Qoder 岗位「分镜与覆盖」” / “技能 `craft/storyboard-craft`” / “模板 `suspense-mystery`”。

---

## 1. 需求对齐

### 1.1 目标

1. 8 套制作模式共享 **一套 7 段链路骨架**，阶段顺序与阶段到 Agent 的映射固定。
2. 每个模式可配置：阶段 System Prompt、技能组合、阶段参数（temperature / maxSteps）。
3. 每个岗位有自己的**专属手艺**；共性规矩只保留极薄一层；技能按**阶段 + 条件**精确装载。
4. 视觉风格是项目硬约束，任何模板、技能、提示词都不得改写。
5. 生产级质量：可校验、可回退、可灰度、可追踪，不靠 LLM 隐式做关键决定。

### 1.2 硬约束

- 不新增 Agent（保持 4 个）。
- 不新增或调整阶段（保持 7 段）。
- 不改项目风格加载方式与风格优先级。
- 不物理删除旧技能文件；旧模板快照必须继续可用。
- 不做破坏性数据库迁移。
- 不关联正在使用的 SaaS 服务。
- 合规审查暂不进入链路，避免阻塞。

### 1.3 非目标

- 不复制 Qoder 的 24 个专岗 Agent。
- 不整篇导入字字动画 skill。
- 不做发行包装、投放增长。
- 不破解加密的第三方 skill。
- 不在本阶段做声音/字幕/混音的完整制作，只预留 P2 服务与校验。

---

## 2. 当前基线

### 2.1 运行与代码

| 项目 | 当前值 |
|---|---|
| 本地服务 | `http://localhost:5679` |
| 后端日志 | `/tmp/huobao-backend.log` |
| 数据库 | `data/huobao.sqlite3` |
| 后端 | Hono + Drizzle + better-sqlite3 + Mastra |
| 前端 | Nuxt 3 SPA（`ssr:false`） |
| 模板目录 | `backend/workspace/templates/<id>/template.json` |
| 技能目录 | `backend/workspace/skills/` |
| 版本注入 | `HUOBAO_VERSION=4.0.11` |

### 2.2 七段链路

```text
script → extract → storyboard → video_prompt → image → video → merge
```

| 阶段 | 执行者 | 产物 |
|---|---|---|
| script | `script_rewriter` | 格式化剧本 |
| extract | `extractor` | 角色 / 场景 / 道具 |
| storyboard | `storyboard_breaker` | 分镜行 |
| video_prompt | `prompt_generator` | 视频提示词 |
| image | 图片适配器 | 图片 |
| video | 视频适配器 | 视频片段 |
| merge | FFmpeg 服务 | 成片 |

### 2.3 四个 Agent

| Agent | 当前职责 |
|---|---|
| `script_rewriter` | 剧本改写 |
| `extractor` | 角色/场景/道具提取与去重 |
| `storyboard_breaker` | 分镜拆解 |
| `prompt_generator` | 生图 / 视频提示词 |

### 2.4 八套模板

| ID | 名称 |
|---|---|
| `urban-realistic` | 都市现实 |
| `costume-romance` | 古装言情 |
| `suspense-mystery` | 悬疑推理 |
| `horror-supernatural` | 惊悚怪谈 |
| `crime-espionage` | 犯罪谍战 |
| `xianxia-fantasy` | 玄幻修仙 |
| `family-ethics` | 家庭伦理 |
| `sports-competition` | 体育竞技 |

### 2.5 当前技能装配与已知问题

当前 `AGENT_SKILL_MAP` 按 Agent 前缀全量装载，导致同一 Agent 的所有基础技能每次都注入：

| 调用点 | 实测装配长度（字符） | 技能构成 | 问题 |
|---|---|---|---|
| `prompt_generator` | **≈8.0k** | 4 个基础技能 **5818 字** | 4 个基础技能全量装载；`video_prompt` 阶段只有 `video-prompt`（1946 字）相关，角色/场景/道具 3 个技能（3872 字）与当前阶段无关 |
| `storyboard_breaker` | **≈5.5k** | 基础技能 2300 字 | 通用手艺与类型知识混在一起 |
| `extractor` | **≈3.9k** | 基础技能 1964 字 | 角色/场景/道具规则全塞 |
| `script_rewriter` | **≈2.0k** | 基础技能 834 字 | 模板提示词承载过多 |

> 度量口径：以上是 JavaScript `String.length`（字符数），不是 UTF-8 字节数。字节数约为字符数的 2.4 倍，之前口头说的 14.2k/17.5k 是字节数，已按字符数纠正。
>
> 当前最高约 8.0k 字，**没有触及 24k 上限**。问题不是“上下文溢出”，而是**无关技能装入、岗位职责边界不清**；如果后续继续加专项包/服务商包，才会真正逼近预算。

模板阶段提示词目前只有 50–70 字，模式差异主要靠 300–500 字的模板技能硬拉，结构上不够清晰。

### 2.6 已有能力（本次保留）

- 模板快照：`dramas.template_snapshot` / `template_id` / `template_version`
- 统一解析器：`resolveModeContext()`
- 阶段上下文：`AgentRequestContextValues.stage`
- 装配预览：`GET /templates/:id/preview`
- 模板编辑锁与备份/恢复
- 结构校验脚本：`validate-templates.ts`、`audit-skills.ts`
- 8/8 结构通过（7 阶段、5/5 Agent 阶段装配、技能加载、快照绑定、路由正确）

### 2.7 版本与备份

#### 版本号

| 项 | 值 |
|---|---|
| 目标生产版本 | `4.1.0` |
| 当前构建版本 | `4.1.0-p0` |
| 单一来源 | 根目录 `VERSION` |
| 同步范围 | 根 / backend / frontend / desktop 四个 `package.json`，以及 backend / frontend / desktop 三个 `package-lock.json` |
| 运行时优先级 | `HUOBAO_VERSION` 环境变量 > `VERSION` > `package.json` |
| 健康检查 | `GET /api/v1/health` 返回 `version` |
| 桌面壳 | 启动后端时注入 `HUOBAO_VERSION=app.getVersion()` |

阶段版本规划：

```text
4.1.0-p0  兼容层与基础拆分（已完成）
4.1.0-p1  八套模式包迁移
4.1.0-p2  专项 / 服务商 / UI / 验收
4.1.0     生产发布
```

P0 收口版本为 `4.1.0-p0`；启动 P1 时执行 `npm run version:sync 4.1.0-p1`。

#### 版本命令

```bash
npm run version:check     # 校验 VERSION 与四个 package.json + 三个 lockfile
npm run version:sync      # 把 VERSION 同步到 package.json 与 lockfile
npm run verify:health     # 校验运行中的 /api/v1/health 版本
npm run verify:shadow     # 8 套模板 × 5 阶段 legacy/policy 对比
npm run verify:release    # 版本 + 类型检查 + 模板校验 + 技能审计 + 影子装配
```

#### 重构前备份

| 项 | 值 |
|---|---|
| 备份目录 | `backups/huobao-drama-pre-refactor-2026-11-08_000944/` |
| 归档 | `backups/huobao-drama-pre-refactor-2026-11-08_000944.tar.gz`（9.2MB） |
| SHA-256 | `81e8917c9b162485eb3c081954369777ab414cc20d6a0d10305f3e618638561b` |
| 内容 | 源码、`backend/workspace`、SQLite `.backup` 快照、git status/diff/untracked |
| 不包含 | `node_modules`、`.git`、`data/static`、构建产物 |

恢复步骤见备份目录内 `MANIFEST.md`。

---

## 3. 目标架构

### 3.1 五层模型

| 层 | 定义 | 归属 | 装载方式 |
|---|---|---|---|
| **L0 岗位契约** | 角色、工具边界、输出字段、禁止项 | 每个 Agent 自己 | 必装，800–1200 字 |
| **L1 专属手艺** | 该岗位的核心专业能力 | **每个 Agent 独有** | 只装自己的，不装别人的 |
| **L1S 共性规矩** | 事实保真、风格锁、连续性、对白逐字、输出契约 | 跨岗位共享 | 只装相关阶段，500–800 字 |
| **L2 模式差异** | 类型知识、禁忌、类型节奏 | 当前模板 | 只装当前模板 |
| **L3 专项能力** | 动作、情绪、特效 | 条件包 | trigger 命中才装 |
| **L4 服务商语法** | Seedance / Kling / 即梦 / LibTV | 当前 provider | 只装选中的那个 |

**核心原则：手艺是岗位的，不是全局的；共性是底线的，不是知识的；模式是增量的，不是重写的。**

### 3.2 每个岗位的专属手艺

| Agent | 专属手艺（L1） | 内部按专岗分节 | 共性（L1S） | 模式（L2） | 专项（L3） |
|---|---|---|---|---|---|
| `script_rewriter` | `craft/script-craft` | 场戏与行动、对白与发声归属、钩子与节奏 | 事实保真、对白逐字 | 当前模式剧本包 | 无 |
| `extractor` | `craft/asset-craft` | 角色母版、场景锚点、道具账本 | ID 保真、风格锁 | 当前模式资产包 | 无 |
| `storyboard_breaker` | `craft/storyboard-craft` | 覆盖、调度与表演、景别与构图、运镜与焦点、用光、时长与接点、自检 | 连续性、对白逐字、风格锁 | 当前模式分镜包 | 动作 / 情绪 / 特效 |
| `prompt_generator` | `craft/video-prompt-craft` + `craft/image-prompt-craft` | 镜头实现、参考图职责、模型语法；角色/场景/道具生图 | 风格锁、事实保真 | 当前模式提示词包 | 动作 / 特效 |

Qoder 的 24 个专岗收进对应岗位手艺的章节，不新增 Agent：

- 编剧部 2 个专岗 → `script-craft` 两节
- 美术部 3 个专岗 → `asset-craft` 三节
- 导演部 7 个专岗 → `storyboard-craft` 六节 + 自检
- 动作特效 2 个专岗 → `specialists/action`、`specialists/fx`
- 视频制作 2 个专岗 → `video-prompt-craft` + 生成回执校验
- 后期 / 声音 → P2 服务与校验，不塞进现有 4 个岗位

### 3.3 八模式矩阵

| 模式 | L2 模式包 | L3 默认专项 | 单次调用技能数 |
|---|---|---|---|
| 都市现实 | 都市生活质感 / 都市镜头 | 情绪 | 2–3 |
| 古装言情 | 古装礼制甜宠 / 古装视觉 | 情绪 | 2–3 |
| 悬疑推理 | 线索公平性 / 悬疑视觉 | 无（情绪可选） | 2 |
| 惊悚怪谈 | 恐怖规则 / 恐怖视觉 | 特效、动作 | 2–4 |
| 犯罪谍战 | 侦查情报链 / 犯罪视觉 | 动作 | 2–3 |
| 玄幻修仙 | 境界门派 / 仙侠视觉 | 特效、动作 | 2–4 |
| 家庭伦理 | 代际生活流 / 家庭视觉 | 情绪 | 2–3 |
| 体育竞技 | 赛制训练 / 竞技视觉 | 动作、情绪 | 2–4 |

### 3.4 一次调用的装载结果

以「悬疑推理 · 分镜」为例：

```text
L0  分镜契约（角色/工具/字段/禁止项）          1.0k
L1  导演手艺（覆盖→调度→景别→运镜→用光→时长） 3.2k
L1S 共性规矩（连续性/对白逐字/风格锁）          0.6k
L2  悬疑分镜模式（信息差/线索可见/不提前揭底）  0.4k
L3  情绪专项（可选，命中才装）                  1.2k
────────────────────────────────────────────
合计 5.2k（不装情绪时 4.0k）
```

「玄幻修仙 · 分镜」：

```text
L0 1.0k + L1 3.2k + L1S 0.6k + L2 仙侠 0.5k
+ L3 动作 1.2k + L3 特效 1.0k
= 7.5k
```

### 3.5 系统提示词契约化

| 内容 | 放在哪里 | 目标长度 |
|---|---|---|
| 角色、输入输出、工具、硬约束 | L0 基础提示词 | 800–1200 字 |
| 本模式 5–8 条决策指令 | 模板阶段提示词 | 300–500 字 |
| 具体写法、检查表、示例 | L1 / L2 技能 | 2000–3000 字 |

基础提示词在 8 个模式间保持稳定；模式差异只来自 L2；同一岗位的 L1 不随模式变化。

### 3.6 P0-02 试点结果（urban-realistic）

`urban-realistic` 已切换为 `schema_version: 2 + skill_policy`，模板版本从 `1.0.3` 升到 `1.1.0`；其余 7 套仍走旧 `agent_skills`：

| 阶段 | source | 装载技能 | 技能字 | 总字 |
|---|---|---|---|---|
| script | policy | `craft/script-craft` + `shared/project-facts` + urban 模式包 | 2294 | 3217 |
| extract | policy | `craft/asset-craft` + `shared/project-facts` + urban 模式包 | 2905 | 4573 |
| storyboard | policy | `craft/storyboard-craft` + `shared/project-facts` + urban 模式包 | 2973 | 5915 |
| video_prompt | policy | `craft/video-prompt-craft` + `shared/project-facts` + urban 模式包 | 2468 | **4609** |
| image | policy | `craft/image-prompt-craft` + `shared/project-facts` + urban 模式包 | 2911 | 5010 |
| 对照：costume-romance / video_prompt | legacy | 模板包 + 全量基础技能 | 5896 | 8006 |

结论：
- `video_prompt` 从 8006 降到 4609（约 -42%），`image` 从 8038 降到 5010（约 -38%）；提示词阶段不再装无关技能。
- `script / extract / storyboard` 分别增加 1160 / 639 / 392 字，因为专属手艺补齐了场戏、资产锚点、导演六步规则；这是有意的规则补全，不是冗余。
- 每阶段固定 3 个技能块：岗位手艺 + 共性底线 + 模式包；没有跨岗位、跨模式技能。
- 未配置 policy 的 7 套模板继续走 legacy，行为不变。

### 3.7 P0-08 影子装配结果

`npm run verify:shadow` 对 8 套模板 × 5 个阶段同时按 legacy / policy 装配：

| 模板 | schema | policy 阶段 | 对比结果 |
|---|---|---|---|
| urban-realistic | 2 | 5 | 5 个阶段均走 policy，0 缺失 |
| 其余 7 套 | 1 | 0 | 35 个组合 legacy = policy，完全一致 |

结论：兼容层没有改变旧模板行为；urban 的 policy 装配无缺失、无回退。影子装配只读，不写库、不调用模型、不切换运行时。

---

## 4. 装载、路由与防混乱

### 4.1 确定性装载算法

```text
stage = 当前阶段
agent = 当前阶段固定 Agent

blocks = [
  L0  agent.contract,
  L1  agent.craft,
  L1S shared.relevant(stage),
  L2  template.mode[stage],
  L3  specialists where trigger hit,
  L4  provider where provider match,
]

blocks = dedupe_by_rule_hash(blocks)
assert_no_style_descriptor(L1, L2, L3)
enforce_budget(craft 3500, mode 1500, specialist 1800, provider 1000, total 8000)
drop_optional_lowest_priority_if_over()
log_layer_breakdown()
```

### 4.2 优先级与冲突

1. L0 硬约束 > L2 模式 > L1 手艺 > L3 专项 > L4 服务商。
2. 同层按 `priority` 降序，再按 `id` 字典序，结果可复现。
3. 同一字段两条规则，高层胜，并记录日志。
4. 技能选择**不使用模型判断**，只依据：阶段、Agent、模板、provider、内容标记。

### 4.3 预算

| 项 | 上限 |
|---|---|
| 单个技能 | 3500 字（专项/服务商更小） |
| 单阶段技能总量 | 8000 字 |
| 单阶段系统提示词总量 | 24000 字 |
| 超限处理 | 只丢 L3/L4 最低优先级，**永不丢 L1/L2** |

### 4.4 一事实一来源

| 事实 | 唯一来源 | 下游只读 |
|---|---|---|
| 对白逐字 | script | storyboard / video_prompt |
| 角色外观 | 角色母版（asset-craft） | storyboard / video_prompt |
| 场景光 | 场景资产（asset-craft） | storyboard / video_prompt |
| 风格 | 项目 `dramas.style` | 所有阶段 |
| 镜号 | storyboard | video_prompt / merge |
| 时长 | storyboard | video_prompt / merge |

下游只能引用 ID，不能重新定义。

### 4.5 闸门与最多一次回修

- 校验器只做可测项，不调用模型。
- 失败时把结构化错误回给同一 Agent，最多修 1 次。
- 仍失败则标记 `needs_attention` 交人工，不无限循环。

---

## 5. 工作分解

### 5.1 P0：兼容层与基础拆分（先做）

| ID | 单元 | 目标 | 状态 |
|---|---|---|---|
| P0-01 | 基线冻结与版本标识 | 备份、VERSION 单一来源、版本校验 | 已完成 |
| P0-02 | 技能目录与 loader | `skill_policy` + `schemaVersion` + 新旧双读 + 回退 | 已完成 |
| P0-03 | 编剧专属手艺 | `craft/script-craft` | 已完成 |
| P0-04 | 资产专属手艺 | `craft/asset-craft` | 已完成 |
| P0-05 | 导演专属手艺 | `craft/storyboard-craft` | 已完成 |
| P0-06 | 提示词专属手艺 | `craft/video-prompt-craft` + `craft/image-prompt-craft` | 已完成 |
| P0-07 | 共性规矩 | `shared/project-facts` | 已完成 |
| P0-08 | 影子装配 | 新旧并装、只记录不切换、8 模式对比 | 已完成 |

### 5.2 P1：八套模式包（一套一套做）

| ID | 模式 | 目标 | 状态 |
|---|---|---|---|
| P1-01 | urban-realistic | 4 个阶段模式包 | 未开始 |
| P1-02 | costume-romance | 4 个阶段模式包 | 未开始 |
| P1-03 | suspense-mystery | 4 个阶段模式包 | 未开始 |
| P1-04 | horror-supernatural | 4 个阶段模式包 | 未开始 |
| P1-05 | crime-espionage | 4 个阶段模式包 | 未开始 |
| P1-06 | xianxia-fantasy | 4 个阶段模式包 | 未开始 |
| P1-07 | family-ethics | 4 个阶段模式包 | 未开始 |
| P1-08 | sports-competition | 4 个阶段模式包 | 未开始 |

每个模式完成后必须立即 dry-run 并记录，**不得攒到最后一起验**。

### 5.3 P2：专项、服务商、UI、验收

| ID | 单元 | 目标 | 状态 |
|---|---|---|---|
| P2-01 | 动作专项 | `specialists/action` | 未开始 |
| P2-02 | 情绪专项 | `specialists/emotion` | 未开始 |
| P2-03 | 特效专项 | `specialists/fx` | 未开始 |
| P2-04 | Seedance | `providers/seedance` | 未开始 |
| P2-05 | Kling | `providers/kling` | 未开始 |
| P2-06 | 即梦 | `providers/jimeng` | 未开始 |
| P2-07 | LibTV | `providers/libtv` | 未开始 |
| P2-08 | 模板编辑器 | 技能按层分组、预览分层 | 未开始 |
| P2-09 | 八模式验收 | 8 × 1 集全链路 | 未开始 |

---

## 6. 进度日志

格式：`日期 | 单元 ID | 动作 | 改动文件 | 验证 | 结果`

| 日期 | 单元 | 动作 | 文件 | 验证 | 结果 |
|---|---|---|---|---|---|
| 2026-11-07 | 基线 | 部署、8 模板、7 段流程、快照、编辑器、编辑锁 | `workspace/templates/*`、`services/templates.ts` 等 | 8/8 结构通过 | 完成 |
| 2026-11-08 | 设计 | 冻结五层模型与逐岗位手艺 | 本文件 | 需求对齐 | 完成 |
| 2026-11-08 | P0-00 | 建立项目记录 | `docs/production-refactor-record.md` | 文档审阅 | 完成 |
| 2026-11-08 | P0-01 | 重构前备份 | `backups/huobao-drama-pre-refactor-2026-11-08_000944/` | 归档 SHA-256 校验 | 完成 |
| 2026-11-08 | P0-01 | 版本单一来源与校验 | `VERSION`、`scripts/version.mjs`、四个 `package.json`、三个 lockfile、`backend/src/version.ts` | `version:check` 七项一致；`verify:health` 返回 `4.1.0-p0` | 完成 |
| 2026-11-08 | P0-01 | 装配体量实测与口径纠正 | 无代码改动 | 8 模式实测：script 1.9–2.1k、extract 3.9k、storyboard 5.4–5.5k、video_prompt 8.0k（字符）；无超 24k | 完成 |
| 2026-11-08 | P0-01 | 全量校验链 | `scripts/version.mjs`、`backend/src/version.ts`、`validate-templates.ts` | `verify:release` 通过：版本 7 项、类型检查、8/8 模板、0 超预算 | 完成 |
| 2026-11-08 | P0-02 | skill_policy 兼容层 | `services/templates.ts`、`agents/skills.ts`、`agents/index.ts`、`routes/templates.ts` | 类型检查通过；8/8 模板通过；legacy 对照正常 | 完成 |
| 2026-11-08 | P0-02 | urban 试点 | `templates/urban-realistic/template.json` | policy 5 阶段；video_prompt 4364 字，对照 legacy 8006 字 | 完成 |
| 2026-11-08 | P0-03 | 编剧专属手艺 | `skills/craft/script-craft/SKILL.md`、urban template | urban script 2742 字；对照 legacy 2003 字；其余模板不变 | 完成 |
| 2026-11-08 | P0-04 | 资产专属手艺 | `skills/craft/asset-craft/SKILL.md`、urban template | urban extract policy 2905 字；8/8 模板通过 | 完成 |
| 2026-11-08 | P0-05 | 导演专属手艺 | `skills/craft/storyboard-craft/SKILL.md`、urban template | urban storyboard policy 2973 字；8/8 模板通过 | 完成 |
| 2026-11-08 | P0-06 | 提示词专属手艺 | `skills/craft/video-prompt-craft`、`skills/craft/image-prompt-craft`、urban template | video_prompt 2468 字；image 2911 字；image 阶段也纳入校验 | 完成 |
| 2026-11-08 | P0-07 | 共性规矩 | `skills/shared/project-facts/SKILL.md`、policy schema | policy 支持 shared；urban 5 阶段各 3 个技能块 | 完成 |
| 2026-11-08 | P0-08 | 影子装配 | `scripts/shadow-assemble.ts`、`assembleShadow()` | 8 套 × 5 阶段；0 失败；旧模板全部 same | 完成 |
| 2026-11-08 | P0 收口 | 模板版本与最终校验 | `templates/urban-realistic/template.json` | urban 1.0.3 → 1.1.0；verify:release + verify:health 通过 | 完成 |

---

## 7. 决策记录

| ID | 决策 | 理由 | 影响 |
|---|---|---|---|
| D-001 | 一套 7 段骨架，8 套模式 | 避免 8 条链路分叉 | 阶段与阶段到 Agent 固定 |
| D-002 | 不新增 Agent | 24 专岗直接搬会产生 30+ 次调用和闸门循环 | 专岗收进岗位手艺章节 |
| D-003 | 风格是项目硬约束 | 模板不得改写画风 | L1/L2/L3 禁止画风词 |
| D-004 | 五层技能模型 | 契约/手艺/共性/模式/专项/服务商职责不同 | 装配按层选择 |
| D-005 | 手艺属于岗位，不全局共享 | 防止编剧规则进入分镜 | 每个 Agent 只装自己的 L1 |
| D-006 | 共性只保留底线 | 防止共性层变成第二个大杂烩 | L1S ≤ 800 字 |
| D-007 | 兼容优先 | 不破坏旧项目与快照 | 旧文件不删、双读、回退 |
| D-008 | 一次只做一个单元 | 防止多模板并行导致混淆 | 单元完成即验证即记录 |
| D-009 | 确定性路由 | 不让模型选技能 | 选择只看阶段/模板/provider/flags |
| D-010 | 闸门最多回修 1 次 | 防止无限循环 | 失败标记人工处理 |
| D-011 | P0 兼容优先：旧文件不删、policy 权威、shadow 只读 | 先证明新装配不破坏旧链路 | P0 完成；7 套旧模板零变化 |

---

## 8. 风险与回退

| ID | 风险 | 影响 | 兜底 |
|---|---|---|---|
| R-01 | 技能路径迁移导致技能为空 | 输出质量下降 | 新旧双读；新路径为空回退旧 `agent_skills` / `AGENT_SKILL_MAP` |
| R-02 | 模板 schema 变更导致旧快照解析失败 | 旧项目异常 | `schemaVersion` 分支；旧快照只读 |
| R-03 | `stage` 上下文缺失导致装错手艺 | 提示词阶段装成生图手艺 | 调用点补 stage；缺失时回退旧全量装载 |
| R-04 | 提示词变短导致质量波动 | 输出风格变化 | 影子装配 + 单模式灰度 |
| R-05 | UI 保存结构变化导致丢字段 | 配置丢失 | PUT 兼容新旧结构；先读后写 |
| R-06 | 用户自定义技能路径失效 | 自定义规则丢失 | 保留旧路径别名，不物理删除 |
| R-07 | 多文档混淆/上下文失忆 | 改错模板/技能 | 本文件 §0 协议 + 单元制 |
| R-08 | 上下文超限 | 决策质量下降 | 每次只读当前单元源文件 |
| R-09 | 试点模板已启用 policy，但 TemplateManager 仍显示旧 agent_skills | 编辑者误以为改动生效 | P0/P1 期间不改 urban 技能；P2-08 做分层 UI 与只读提示 |

### 回退步骤

1. 删除目标模板的 `skill_policy`，立即回到旧 `agent_skills` 行为。
2. 新技能目录保留但不再被引用；旧文件未删，可直接恢复。
3. 模板快照不迁移、不重写，旧项目始终走旧分支。
4. 数据库只做 nullable 增列，不做破坏性变更。
5. 前端 UI 改动可独立回退，不影响后端装配。

---

## 9. 验收标准

### 9.1 链路

- [ ] 8 模式 × 1 集，7 阶段全部跑完
- [ ] 阶段确认点、导航、工作流 API 正常
- [ ] 旧项目（无模板 / 旧快照）行为与改造前一致

### 9.2 装配

- [ ] 每个阶段只装 2–4 个技能块
- [ ] 每个阶段至少装到 1 个岗位专属手艺
- [ ] 不出现其他岗位的专属手艺
- [ ] 不出现其他模板的模式包
- [ ] 模式 / 专项 / 服务商包中画风词为 0
- [ ] 单阶段技能 ≤ 8000 字，总提示词 ≤ 24000 字

### 9.3 产物

- [ ] 对白逐字保留
- [ ] 角色 / 场景 / 道具 ID 无悬空
- [ ] 镜号连续，每个 beat 有镜头覆盖
- [ ] 时长整数且总和达标
- [ ] 提示词符合 provider 语法
- [ ] 风格哈希与项目预设一致

### 9.4 质量

- [ ] 每个模式至少 1 次人工抽检
- [ ] 8 模式装配报告留档
- [ ] 回退演练至少 1 次

---

## 10. 文件地图

| 作用 | 路径 |
|---|---|
| 技能装载 | `backend/src/agents/skills.ts` |
| Agent 装配 | `backend/src/agents/index.ts` |
| 模板服务 | `backend/src/services/templates.ts` |
| 模式解析 | `backend/src/services/mode-context.ts` |
| 模板 API | `backend/src/routes/templates.ts` |
| 工作流状态 | `backend/src/services/workflow-status.ts` |
| 模板编辑器 | `frontend/app/components/TemplateManager.vue` |
| 模板清单 | `backend/workspace/templates/<id>/template.json` |
| 现有技能 | `backend/workspace/skills/` |
| 岗位手艺 | `backend/workspace/skills/craft/` |
| 共性底线 | `backend/workspace/skills/shared/` |
| 结构校验 | `backend/scripts/validate-templates.ts` |
| 技能审计 | `backend/scripts/audit-skills.ts` |
| 影子装配 | `backend/scripts/shadow-assemble.ts` |
| 版本单一来源 | `VERSION` |
| 版本校验 | `scripts/version.mjs` |
| 运行时版本解析 | `backend/src/version.ts` |

### 验证命令

```bash
npm run version:check
npm run verify:health
npm run verify:shadow
npm run verify:release
cd backend && npx tsx scripts/validate-templates.ts
cd backend && npx tsx scripts/audit-skills.ts
cd backend && npx tsx scripts/shadow-assemble.ts
cd backend && npm run typecheck
```

前端改动后：

```bash
cd frontend && npm run generate
```

---

## 11. 当前工作单元（交接块）

```text
当前单元：P1-01 urban-realistic 模式包迁移
状态：未开始（P0 已完成）
已完成：
  - P0-01 备份 + 版本单一来源 4.1.0-p0 + 健康检查统一
  - P0-02 schema_version + skill_policy + 按 ID 精确装载 + 旧格式回退
  - P0-03 craft/script-craft
  - P0-04 craft/asset-craft
  - P0-05 craft/storyboard-craft
  - P0-06 craft/video-prompt-craft + craft/image-prompt-craft
  - P0-07 shared/project-facts + policy shared 层
  - P0-08 shadow 装配：8 套 × 5 阶段，0 失败
未完成：
  - P1：8 套模式包迁移到 modes/<mode>/<stage>
  - P2：action/emotion/fx 专项、4 个 provider 包、分层 UI、生产验收
验证结果：
  - npm run version:check：七项一致
  - npm run verify:health：运行时返回 4.1.0-p0
  - npm run verify:release：版本 + 类型检查 + 8/8 模板 + 0 超预算 + shadow 0 失败
  - urban policy：script 3217、extract 4573、storyboard 5915、video_prompt 4609、image 5010
  - 其余 7 套：legacy = policy，完全一致
下一步：
  1. 启动 P1 前把版本升到 4.1.0-p1
  2. 逐个模式迁移 4 个阶段包，完成一个验证一个
阻塞与待决策：无
```

---

## 附录 A：参考来源与使用边界

### A.1 Qoder 漫剧 agents（40 个）

- 位置：`~/.qoder/agents/`
- 结构：7 个业务主岗 + 24 个专岗 + 制片统筹
- 用途：提供权责与产物字段参考（`shot.coverage`、`shot.timing`、`art.character`、`sound.mix` 等）
- 边界：**不新增 Agent**；专岗收进岗位手艺章节

### A.2 字字动画 skills（约 82 个）

- 位置：`skill-library/zizidonghua/official_skills/`
- 用途：提供具体写法（钩子、节奏、分镜 JSON、Seedance 语法、情绪基底、打斗编排）
- 可复用核心约 15–18 个
- 边界：
  - `script-master`（1867 行）只取方法，不整篇注入
  - 各种 `_luxe` / `_filmgrain` / `_volume` 是风格副本，**不导入**
  - 加密 stub 不破解、不依赖

### A.3 使用对照

| 我们的技能 | 主要参考 |
|---|---|
| `craft/script-craft` | `script-master`、`hook_master`、`vertical_breakout`、`dongtai-man-rhythm`、`0715-scriptwriter` |
| `craft/asset-craft` | `character_guard`、`art_director`、`ai-comic-prop-consistency`、`dongtai-man-character` |
| `craft/storyboard-craft` | `baizhou`、`hf-drama-storyboard-script`、`novel-to-storyboard`、`panel_auditor`、`motion_choreographer` |
| `craft/video-prompt-craft` | `seedance25-video-prompt-master`、`gaven-script-to-video-prompts`、`mx_shell_improved` |
| `specialists/emotion` | `cinematic-emotion-foundation` |
| `specialists/action` | `urban_armor_combat_storyboard`、`cinematic-fight-short-drama-prompt` |
| `specialists/fx` | Qoder `fx.layers` + 项目既有特效字段 |

---

## 附录 B：目标技能清单

| 技能 ID | 层 | 归属 | 阶段 | 状态 |
|---|---|---|---|---|
| `craft/script-craft` | L1 | `script_rewriter` | script | 已完成 |
| `craft/asset-craft` | L1 | `extractor` | extract | 已完成 |
| `craft/storyboard-craft` | L1 | `storyboard_breaker` | storyboard | 已完成 |
| `craft/video-prompt-craft` | L1 | `prompt_generator` | video_prompt | 已完成 |
| `craft/image-prompt-craft` | L1 | `prompt_generator` | image | 已完成 |
| `shared/project-facts` | L1S | 全部 | 相关阶段 | 已完成 |
| `modes/urban-realistic/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `modes/costume-romance/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `modes/suspense-mystery/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `modes/horror-supernatural/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `modes/crime-espionage/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `modes/xianxia-fantasy/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `modes/family-ethics/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `modes/sports-competition/*` | L2 | 模板 | 4 阶段 | 未开始 |
| `specialists/action` | L3 | 条件 | storyboard / video_prompt | 未开始 |
| `specialists/emotion` | L3 | 条件 | script / storyboard | 未开始 |
| `specialists/fx` | L3 | 条件 | storyboard / video_prompt | 未开始 |
| `providers/seedance` | L4 | provider | video_prompt | 未开始 |
| `providers/kling` | L4 | provider | video_prompt | 未开始 |
| `providers/jimeng` | L4 | provider | video_prompt | 未开始 |
| `providers/libtv` | L4 | provider | video_prompt | 未开始 |

---

## 附录 C：现有文件到目标文件的迁移映射

| 现有 | 目标 | 处理方式 |
|---|---|---|
| `skills/script-rewriter/SKILL.md` | `craft/script-craft` | 提炼通用规则；保留旧文件 |
| `skills/extractor/SKILL.md` | `craft/asset-craft` | 提炼通用规则；保留旧文件 |
| `skills/storyboard-breaker/SKILL.md` | `craft/storyboard-craft` | 提炼通用规则；保留旧文件 |
| `skills/prompt-generator/character-prompt` | `craft/image-prompt-craft` | 合并生图规则；保留旧文件 |
| `skills/prompt-generator/scene-prompt` | `craft/image-prompt-craft` | 合并生图规则；保留旧文件 |
| `skills/prompt-generator/prop-prompt` | `craft/image-prompt-craft` | 合并生图规则；保留旧文件 |
| `skills/prompt-generator/video-prompt` | `craft/video-prompt-craft` | 提炼视频规则；保留旧文件 |
| `skills/templates/<mode>/<agent>` | `modes/<mode>/<stage>` | 仅新增映射；旧路径继续可读 |

**迁移原则：只新增，不物理移动；旧路径在 P0–P1 期间始终可用。**
