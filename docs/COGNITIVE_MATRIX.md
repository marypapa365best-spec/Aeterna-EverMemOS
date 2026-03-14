## 认知维度矩阵（Cognitive Matrix）

本节说明【分身养成中心】-【认知维度矩阵】的**维度定义**、**数据来源**与**计算规则**，供开发者与评委参考。

---

### 1. 维度定义（6 轴）

内部使用 6 个认知维度，统一用 0–100 分数（越高代表该倾向越强）：

- **情绪稳定度 `emotional_stability`**  
  - 高：情绪波动小，遇事相对冷静、抗压强  
  - 低：容易焦虑、紧张、被外部评价强烈影响

- **社交能量 `social_energy`**  
  - 高：偏外向，社交充电，喜欢在人群中表达自己  
  - 低：偏独处，社交容易“电量不足”，更习惯一对一或文字沟通

- **开放性·想象力 `openness_imagination`**  
  - 高：好奇心强，接受新事物，喜欢艺术/创作/幻想场景  
  - 低：偏现实务实，喜欢可预期、结构清晰的环境

- **结构化·执行力 `structure_execution`**  
  - 高：爱规划、会拆解目标，强调方法论与落地执行  
  - 低：更多凭直觉行动，抗拒繁杂计划，易“想到哪做到哪”

- **价值观边界 `value_boundary`**  
  - 高：原则感强，界限清晰，对“底线问题”反应更敏锐  
  - 低：更灵活务实，倾向“看情况而定”，包容多元标准

- **自我反省力 `self_reflection`**  
  - 高：经常复盘、写日记、反思自己的行为与动机  
  - 低：较少系统复盘，多依赖当下感觉做判断

---

### 2. 数据来源概览

当前版本的认知矩阵 **不依赖一次性 MBTI/16 型测试**，而是持续从三个入口自动更新：

1. **记忆碎片（Memory Vault）**  
   - 只使用：  
     - 已同步到 EverMemOS 的碎片（有 `messageId`）  
     - 且未被标记为“本地删除”（`deletedLocally !== true`）  
   - 数据位置：`localStorage.twin_memory_vault`

2. **进化聊天室中的反馈（👍 / 👎）**  
   - 用户对分身回复的反馈，用于长期微调  
   - 数据位置：`localStorage.twin_feedback_stats`

3. **（预留）灵魂拷贝 1–6 关表单**  
   - 当前代码中已设计了从关卡映射到 6 维的规则草案  
   - 后续可在后端或 `twinApi.ts` 中接入，生成基础人格画像  
   - 存储位置建议：`localStorage.twin_cognitive_profile` + EverMemOS 一条 profile 记忆

本次提交已经实现的是 **入口 1 + 入口 2**，并通过 `twin_cognitive_profile` 暴露给前端。

---

### 3. 数据流与持久化

#### 3.1 统一 Profile 结构

计算完成后的认知矩阵（0–100）采用统一结构存储在本地：

```json
{
  "emotional_stability": 62,
  "social_energy": 47,
  "openness_imagination": 71,
  "structure_execution": 59,
  "value_boundary": 68,
  "self_reflection": 80
}
```

- 存储键名：`localStorage.twin_cognitive_profile`
- 目前按单一 demo 分身 `demo-twin-001` 设计，如需多分身可改为 `twin_cognitive_profile_${twinId}`

#### 3.2 写入时机

- **Memory Vault 上传/编辑成功后**  
  - 文件：`src/components/MemoryVault.tsx`  
  - 行为：调用 `saveVaultMemory` 成功后，执行 `recomputeCognitiveProfile()`  

- **进化聊天室唤醒分身时**  
  - 文件：`src/components/EvolutionChat.tsx`  
  - 行为：`handleAwaken` 中，在 `loadSessionMemory` 成功后调用 `recomputeCognitiveProfile()`  

- **聊天反馈点赞/点踩**  
  - 文件：`src/components/EvolutionChat.tsx`  
  - 行为：在 `onFeedbackSync` 回调中累计 `upCount / downCount` 至 `localStorage.twin_feedback_stats`，供下一次 `recomputeCognitiveProfile()` 使用  

#### 3.3 读取位置（展示层）

- **分身养成中心 → Dashboard → 认知维度矩阵**  
  - 文件：`src/components/TwinStudio.tsx`  
  - 加载函数 `loadCognitiveProfile()` 从 `localStorage.twin_cognitive_profile` 读取  
  - 将 6 维映射为 Recharts `radarData`，渲染到 `RadarChart` 中  
  - 按钮“刷新同步率与认知矩阵”会重新读取同步率与 profile

---

### 4. Memory Vault → 认知维度的加减分规则

内部采用双层评分：  
1. 先在 \[-50, +50] 区间累计原始分数 `RawScore`  
2. 再线性映射到 0–100，保存为 `twin_cognitive_profile`

#### 4.1 原始分类型

```ts
type CogDim =
  | "emotional_stability"
  | "social_energy"
  | "openness_imagination"
  | "structure_execution"
  | "value_boundary"
  | "self_reflection";

type RawScore = Record<CogDim, number>; // -50 ~ +50
```

#### 4.2 标签映射表 `TAG_EFFECTS`

文件：`src/api/twinApi.ts`

```ts
const TAG_EFFECTS: Record<string, Partial<RawScore>> = {
  "#社交电量低": { social_energy: -15 },
  "#社交牛逼症": { social_energy: +15 },
  "#完美主义":   { structure_execution: +15, emotional_stability: -5 },
  "#长期复盘":   { self_reflection: +10 },
  "#喜欢冒险":   { openness_imagination: +15, emotional_stability: +5 },
  "#佛系":       { structure_execution: -5, emotional_stability: +5 },
  "#正义感":     { value_boundary: +10 },
};
```

- 遍历所有满足条件的 `VaultMemory`：  
  - `messageId` 存在（说明已同步 EverMemOS）  
  - `deletedLocally !== true`（未在 Memory Vault 中“本地删除”）  
- 对每个标签累计对应维度的加减分。

#### 4.3 文本关键词规则 `TEXT_KEYWORDS`

```ts
const TEXT_KEYWORDS: { pattern: string; effects: Partial<RawScore> }[] = [
  { pattern: "复盘",     effects: { self_reflection: +5 } },
  { pattern: "说走就走", effects: { openness_imagination: +5 } },
  { pattern: "不想见人", effects: { social_energy: -5 } },
  { pattern: "焦虑",     effects: { emotional_stability: -5 } },
];
```

- 对每条碎片的 `content` 做 `includes` 匹配，命中则对对应维度轻微调节。

#### 4.4 Memory Vault 权重上限

为了避免 Memory Vault 对单一维度影响过大，应用完所有标签和关键词后，对每个维度的贡献做一次裁剪：

```ts
(Object.keys(score) as CogDim[]).forEach((k) => {
  score[k] = Math.max(-20, Math.min(20, score[k]));
});
```

这意味着 Memory Vault 对任一维度的最大正/负影响为 ±20 分（在最终 0–100 映射前）。

---

### 5. 聊天反馈（👍 / 👎）的长期微调规则

#### 5.1 反馈统计结构

```ts
type FeedbackStats = {
  upCount: number;
  downCount: number;
};
```

- 存储键名：`localStorage.twin_feedback_stats`  
- 在 `EvolutionChat.tsx` 的 `onFeedbackSync` 中维护：
  - 点 👍 → `upCount + 1`
  - 点 👎 → `downCount + 1`

#### 5.2 规则 `applyFeedbackRules`

文件：`src/api/twinApi.ts`

```ts
const stats = loadFeedbackStats();
const upUnits = Math.floor(stats.upCount / 5);
const downUnits = Math.floor(stats.downCount / 5);

if (upUnits > 0) {
  score.self_reflection   += upUnits; // 用户愿意给反馈 → 更自省
  score.structure_execution += upUnits; // 在意效果 → 更执行导向
}
if (downUnits > 0) {
  score.emotional_stability -= downUnits; // 多次踩雷 → 情绪安全感略降
}
```

- 设计为**极轻量微调**：每累计 5 次点赞/点踩才生效一次，最多在整体画像上做细微校准，而不会彻底颠覆。

---

### 6. 统一重算函数 `recomputeCognitiveProfile()`

文件：`src/api/twinApi.ts`

```ts
export function recomputeCognitiveProfile(): Record<CogDim, number> {
  const raw = createEmptyRawScore();        // 初始为 0

  applyVaultRules(raw);    // Memory Vault 标签 + 文本
  applyFeedbackRules(raw); // 聊天反馈

  const display: Record<CogDim, number> = { ...raw };
  (Object.keys(display) as CogDim[]).forEach((k) => {
    const v = Math.max(-50, Math.min(50, raw[k]));
    display[k] = Math.round(((v + 50) / 100) * 100); // 映射到 0~100
  });

  try {
    window.localStorage.setItem("twin_cognitive_profile", JSON.stringify(display));
  } catch {
    // ignore
  }

  return display;
}
```

调用时机见第 3 节。

---

### 7. 展示层细节（与评委体验相关）

- **雷达图组件**：`src/components/TwinStudio.tsx` 使用 `recharts` 的 `RadarChart` 渲染：
  - 6 个轴分别对应上述 6 维度
  - 无数值刻度文本，仅保留网格坐标系（参考考试成绩雷达图视觉）
  - 若当前尚无 `twin_cognitive_profile`，默认各轴显示 55 分作为柔和占位值

- **与【进化聊天室】联动**：
  - 【进化聊天室】中的【大脑同步率】与 Dashboard 中的同步率使用同一数据源 `localStorage.twin_sync_rate`  
  - 在评委视角下：  
    - 他在聊天里给分身点 👍 / 👎 → 同步率与认知矩阵会在下一次【唤醒并连接】或点击 Dashboard “刷新同步率与认知矩阵”后更新  
    - 形成“边聊边调教”的可视化反馈闭环。

---

### 8. 后续可扩展方向（给评委的说明）

当前版本使用的是**规则驱动 + 本地数据**，主要目的是在 Demo 中展示：

- 记忆碎片与反馈如何驱动分身的“认知画像”变化  
- 分身不是一次性设定，而是会随着用户互动持续进化

未来可以进一步扩展：

- 将灵魂拷贝 1–6 关的完整表单接入 `computeCognitiveProfileFromSoul`，作为基础画像  
- 在后端增加 `/api/twins/cognitive-profile`，把 profile 写入 EverMemOS 作为一条高层 profile 记忆  
- 使用 LLM 对长文本记忆做更细腻的“人格维度抽取”，替代/补充当前的关键词+标签规则。

