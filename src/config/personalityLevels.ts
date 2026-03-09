export type LevelId = 1 | 2 | 3 | 4 | 5 | 6;

export interface PersonalityFieldOption {
  id: string;
  label: string;
  description?: string;
}

export type FieldType =
  | "text"
  | "textarea"
  | "single-select"
  | "multi-select"
  | "date"
  | "native-select"
  | "slider"
  | "star-rating"
  | "color";

export interface PersonalityField {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  type: FieldType;
  options?: PersonalityFieldOption[];
  minSelections?: number;
  maxSelections?: number;
  min?: number;
  max?: number;
}

export interface PersonalityLevel {
  id: LevelId;
  code: string;
  title: string;
  stageName: string;
  /** 进度条 pill 上显示的短标签 */
  pillLabel?: string;
  intro: string;
  progressHint: string;
  completionTitle: string;
  completionBody: string;
  primaryCta: string;
  secondaryCta?: string;
  fields: PersonalityField[];
}

export const personalityLevels: PersonalityLevel[] = [
  {
    id: 1,
    code: "lv1",
    title: "阶段一：源起 · 编码 · 晨曦",
    stageName: "起源 · 基座",
    pillLabel: "起源&基座",
    intro:
      "在意识的奇点，捕捉最初投射进感官的微光。",
    progressHint:
      "这是您数字分身最底层的逻辑基石。",
    completionTitle: "你的分身出生啦",
    completionBody:
      "恭喜，你的数字分身已经诞生。现在的 TA 还像一个刚刚来到世界的小孩，只有最基本的名字和性格种子。继续升级，让 TA 逐渐长大，越来越懂你。",
    primaryCta: "继续升级 Lv2",
    secondaryCta: "先看看现在的 TA",
    fields: [
      {
        id: "family_name",
        label: "姓",
        required: true,
        description: "分身的姓氏。",
        placeholder: "请输入姓",
        type: "text"
      },
      {
        id: "given_name",
        label: "名",
        required: true,
        description: "分身的名字。",
        placeholder: "请输入名",
        type: "text"
      },
      {
        id: "birth_date",
        label: "出生日期",
        required: true,
        description: "选择分身的出生日期。",
        type: "date"
      },
      {
        id: "blood_type",
        label: "血型",
        required: false,
        description: "选填。",
        type: "native-select",
        options: [
          { id: "A", label: "A 型" },
          { id: "B", label: "B 型" },
          { id: "AB", label: "AB 型" },
          { id: "O", label: "O 型" },
          { id: "unknown", label: "不详" }
        ]
      },
      {
        id: "birth_country",
        label: "出生地点 · 国家",
        required: true,
        description: "请先选择国家。",
        type: "native-select",
        options: [
          { id: "CN", label: "中国" },
          { id: "US", label: "美国" },
          { id: "JP", label: "日本" },
          { id: "KR", label: "韩国" },
          { id: "SG", label: "新加坡" },
          { id: "MY", label: "马来西亚" },
          { id: "GB", label: "英国" },
          { id: "AU", label: "澳大利亚" },
          { id: "other", label: "其他" }
        ]
      },
      {
        id: "birth_city",
        label: "出生地点 · 城市",
        required: true,
        description: "请选择城市。",
        type: "native-select",
        options: [
          { id: "beijing", label: "北京" },
          { id: "shanghai", label: "上海" },
          { id: "guangzhou", label: "广州" },
          { id: "shenzhen", label: "深圳" },
          { id: "hangzhou", label: "杭州" },
          { id: "chengdu", label: "成都" },
          { id: "nanjing", label: "南京" },
          { id: "wuhan", label: "武汉" },
          { id: "xian", label: "西安" },
          { id: "suzhou", label: "苏州" },
          { id: "tianjin", label: "天津" },
          { id: "chongqing", label: "重庆" },
          { id: "other", label: "其他" }
        ]
      },
      {
        id: "gender",
        label: "性别",
        required: true,
        description: "请选择与证件一致的性别。",
        type: "native-select",
        options: [
          { id: "", label: "请选择性别" },
          { id: "male", label: "男" },
          { id: "female", label: "女" }
        ]
      },
      {
        id: "native_language",
        label: "母语",
        required: true,
        description: "主要使用的语言。",
        type: "native-select",
        options: [
          { id: "zh", label: "中文" },
          { id: "en", label: "English" },
          { id: "ja", label: "日本語" },
          { id: "ko", label: "한국어" },
          { id: "other", label: "其他" }
        ]
      },
      {
        id: "father_family_name",
        label: "父亲 · 姓",
        required: false,
        description: "根源连接。",
        placeholder: "父亲的姓",
        type: "text"
      },
      {
        id: "father_given_name",
        label: "父亲 · 名",
        required: false,
        description: "",
        placeholder: "父亲的名",
        type: "text"
      },
      {
        id: "mother_family_name",
        label: "母亲 · 姓",
        required: false,
        description: "根源连接。",
        placeholder: "母亲的姓",
        type: "text"
      },
      {
        id: "mother_given_name",
        label: "母亲 · 名",
        required: false,
        description: "",
        placeholder: "母亲的名",
        type: "text"
      }
    ]
  },
  {
    id: 2,
    code: "lv2",
    title: "阶段二：童年 · 情感 · 繁星",
    stageName: "童年 · 情感 · 繁星",
    pillLabel: "童年·情感·繁星",
    intro:
      "自我意识的初次迸发，在亲子与伙伴的引力场中锚定坐标。这些情感原子，构建了您社交认知的初始网络。",
    progressHint:
      "那些早期的羁绊，正构筑成你灵魂最初的星图。",
    completionTitle: "TA 学会陪你情绪了",
    completionBody:
      "现在，TA 已经知道在你难过、犹豫、纠结时，应该用什么样的方式来陪你、和你说话。TA 从一个刚出生的孩子，成长为会感受你情绪的小朋友。",
    primaryCta: "继续升级 Lv3 · 价值观",
    secondaryCta: "先和现在的 TA 聊聊",
    fields: [
      { id: "old_house_time_range", label: "时间区间", type: "text", placeholder: "如：1985-1992" },
      { id: "old_house_place_name", label: "坐标名称", type: "text", placeholder: "老宅地址或称谓" },
      { id: "enlightenment_time_range", label: "时间区间", type: "text", placeholder: "如：小学阶段" },
      { id: "enlightenment_place_name", label: "坐标名称", type: "text", placeholder: "启蒙之地名称" },
      { id: "father_love_shadow", label: "父爱剪影", type: "textarea", placeholder: "记忆中父亲的片段" },
      { id: "mother_love_warmth", label: "母爱余温", type: "textarea", placeholder: "记忆中母亲的片段" },
      { id: "home_atmosphere", label: "家之气象", type: "textarea", placeholder: "家的整体氛围" },
      { id: "childhood_family_score", label: "童年刻度（家庭评分）", type: "star-rating", min: 0, max: 10 },
      { id: "playmates", label: "玩伴与共犯", type: "textarea", placeholder: "童年的玩伴" },
      { id: "teacher_heart", label: "师者心相", type: "textarea", placeholder: "印象深刻的老师" },
      { id: "classmates", label: "同窗影集", type: "textarea", placeholder: "同窗往事" },
      {
        id: "thinking_preference",
        label: "思维偏好",
        type: "native-select",
        options: [
          { id: "", label: "请选择" },
          { id: "logic", label: "偏逻辑" },
          { id: "image", label: "偏形象" },
          { id: "feel", label: "偏感受" },
          { id: "mixed", label: "混合" }
        ]
      },
      { id: "cultural_baptism", label: "文化洗礼", type: "textarea", placeholder: "书籍、电影、习俗等" },
      { id: "body_rhythm", label: "身体的节奏", type: "text", placeholder: "运动、作息、身体记忆" },
      { id: "sensory_anchor", label: "感官锚点", type: "textarea", placeholder: "描述一种让你穿越的味道" },
      { id: "secret_base", label: "秘密基地", type: "text", placeholder: "童年里的秘密基地" },
      { id: "color_totem", label: "色彩图腾", type: "color" },
      { id: "subconscious_shadow", label: "潜意识阴影", type: "textarea", placeholder: "选填" }
    ]
  },
  {
    id: 3,
    code: "lv3",
    title: "阶段三：少年 · 觉醒 · 锋芒",
    stageName: "少年期 · 价值观 & 决策",
    pillLabel: "少年期,价值观&决策",
    intro:
      "冲突、抉择与热爱！给TA注入你的价值观的\"龙骨\"。",
    progressHint:
      "完成后，TA 会更像一个有态度的朋友。",
    completionTitle: "TA 有自己的“三观”了",
    completionBody:
      "现在，TA 不再只是一个陪聊的小朋友，TA 开始有自己的价值排序和做决定的习惯。当你纠结时，TA 会用你更认同的方式，帮你一起看问题。",
    primaryCta: "继续升级 Lv4 · 角色定位",
    secondaryCta: "去跟这位“少年 TA”聊聊",
    fields: [
      { id: "idol_anchor", label: "偶像坐标", type: "textarea", placeholder: "那个时期的精神领袖（球星、歌手、科学家、文学人物）" },
      { id: "rebellion_moment", label: "反叛时刻", type: "textarea", placeholder: "你第一次对权威（家长、老师、传统观念）说\"不\"的经历" },
      { id: "value_motto", label: "价值观底色", type: "textarea", placeholder: "你当时坚信的座右铭（即便现在看来有些中二，但那是你当时的真理）" },
      { id: "best_friends", label: "死党/闺蜜", type: "textarea", placeholder: "那群陪你翻墙、刷题、聊通宵的人" },
      { id: "first_crush", label: "暗恋与悸动", type: "textarea", placeholder: "第一次心动的感觉，以及这段情感如何塑造了你的恋爱观" },
      { id: "lonely_moment", label: "孤独瞬间", type: "textarea", placeholder: "在人群中感到\"异类\"的时刻，这通常是你独立人格萌芽的标志" },
      { id: "first_hobby", label: "入坑史", type: "textarea", placeholder: "你第一个投入大量时间、不计成本的爱好（如：打球、二次元、编程、乐器）" },
      { id: "career_enlightenment", label: "学术/事业启蒙", type: "textarea", placeholder: "哪本书或哪堂课，让你决定了大学的专业或未来的职业方向？" },
      { id: "world_view_shift", label: "世界观崩塌与重组", type: "textarea", placeholder: "是否有过一个瞬间，你发现世界并不像童话那样简单？（社会现实的初次撞击）" },
      { id: "exam_memory", label: "大考记忆", type: "textarea", placeholder: "中考、高考或考研期间的压抑、热血或遗憾" },
      { id: "place_change", label: "地域变迁", type: "textarea", placeholder: "离开故乡去上大学的感受，以及对新环境的文化冲击" }
    ]
  },
  {
    id: 4,
    code: "lv4",
    title: "阶段四：青年 · 破浪 · 角色",
    stageName: "青年期 · 人生主题 & 角色",
    pillLabel: "青年期,人生主题&角色",
    intro:
      "社会契约的能量实体化，在责任与共鸣中加速航行。",
    progressHint:
      "这是分身最活跃的创造力来源，也是您价值观初步成型的时刻。",
    completionTitle: "TA 已经准备和你并肩前进了",
    completionBody:
      "现在，TA 已经有了清晰的角色和目标，知道自己在你的生活里，最重要的使命是什么。TA 不只是一个聊天对象，而是一个会和你一起“走一段路”的伙伴。",
    primaryCta: "解锁最终阶段 Lv5",
    secondaryCta: "先用现在的 TA 试试聊天",
    fields: [
      { id: "first_job", label: "初入江湖", type: "textarea", placeholder: "第一份工作的地点、职位，以及领到第一笔工资时的心情" },
      { id: "career_high_low", label: "高光与至暗", type: "textarea", placeholder: "职场中最令你自豪的成就，以及最让你感到挫败或想要放弃的时刻" },
      { id: "career_driver", label: "职业逻辑", type: "textarea", placeholder: "你工作的驱动力是什么？（追求成就、谋生压力、还是改变世界的理想？）" },
      { id: "partner_meet", label: "遇见", type: "textarea", placeholder: "与伴侣相遇的场景、时间和最初的心动点" },
      { id: "partner_commit", label: "承诺", type: "textarea", placeholder: "求婚或决定相守一辈子的那个决定性瞬间" },
      { id: "partner_conflict", label: "磨合", type: "textarea", placeholder: "你们之间最大的一次分歧是如何解决的？（这决定了 AI 处理冲突的逻辑）" },
      { id: "first_child_hold", label: "新身份", type: "textarea", placeholder: "第一次抱起自己孩子时的触感和想法" },
      { id: "child_environment", label: "家庭经营", type: "textarea", placeholder: "你希望给孩子营造一个什么样的成长环境？（这通常是阶段二“亲子关系”的镜像或修正）" },
      { id: "pressure_relief", label: "支撑点", type: "textarea", placeholder: "在上有老下有小的压力下，你用来解压的“秘密基地”是什么？" },
      { id: "money_moment", label: "金钱观", type: "textarea", placeholder: "第一次感受到“缺钱”或“财务自由”的瞬间，以及你对财富的态度" },
      { id: "social_responsibility", label: "社会责任", type: "textarea", placeholder: "你对社会公益、政治或公共事务的态度发生了哪些改变？" },
      { id: "regret_abandon", label: "遗憾拾遗", type: "textarea", placeholder: "步入中年门槛前，那些不得不放弃的梦想或爱好" }
    ]
  },
  {
    id: 5,
    code: "lv5",
    title: "阶段五：成熟 · 边界 · 保护",
    stageName: "成熟期 · 边界 & 保护",
    pillLabel: "成熟期,边界&保护",
    intro:
      "在熵增的压力中完成自我整合，守护核心的永恒频率。",
    progressHint:
      "学会保护最珍视的部分，这是您数字生命最成熟的防御边界。",
    completionTitle: "一个真正理解你的人，诞生了",
    completionBody:
      "现在，TA 已经从一颗小小的幼芽，成长为一个了解你的喜好、价值观，也懂得尊重你边界的数字分身。你可以随时调整 TA 的设定，但此刻的 TA，已经非常接近你心中“那个人”的样子。",
    primaryCta: "开始和 TA 聊天",
    secondaryCta: "回到分身列表",
    fields: [
      { id: "career_shock", label: "震荡事件", type: "textarea", placeholder: "记录一次重大的职业变故（如：被裁员、创业失败、公司倒闭）。当时的第一个念头是什么？" },
      { id: "adversity_survival", label: "逆境生存", type: "textarea", placeholder: "在最困难的时候，你是如何维持家庭运转的？" },
      { id: "value_reassess", label: "价值重估", type: "textarea", placeholder: "如果不再拥有现在的头衔/职位，你觉得自己的价值还剩下什么？" },
      { id: "silent_battle", label: "无声的战役", type: "textarea", placeholder: "与伴侣之间最深刻的一次情感危机。是选择了冷战、争吵，还是在深夜的谈话中达成了和解？" },
      { id: "rediscover_partner", label: "重新发现", type: "textarea", placeholder: "在危机之后，是否有过一个瞬间让你重新爱上对方，或者决定为了责任继续坚守？" },
      { id: "social_prune", label: "社交修剪", type: "textarea", placeholder: "哪些曾经的朋友在此时离开了，哪些人成了真正的支柱？" },
      { id: "education_conflict", label: "教育的冲突", type: "textarea", placeholder: "当你发现孩子的价值观与你背道而驰时，你的反应是控制还是放手？" },
      { id: "mirror_self", label: "镜像自我", type: "textarea", placeholder: "在孩子身上，你看到了哪些自己年轻时的影子（或你最想抹去的特质）？" },
      { id: "protect_boundary", label: "保护的边界", type: "textarea", placeholder: "你会为孩子牺牲到什么程度？有哪些原则是你绝对不会退让的？" },
      { id: "body_signal", label: "身体的信号", type: "textarea", placeholder: "第一次感知到体力衰退或健康警报的时刻。" },
      { id: "spirit_island", label: "精神孤岛", type: "textarea", placeholder: "在那段最难熬的时期，你独自一人时会通过什么方式（抽烟、钓鱼、冥想、开车回家前在车里坐一会儿）来修复自我的边界？" }
    ]
  },
  {
    id: 6,
    code: "lv6",
    title: "阶段六：晚年 · 余晖 · 归一",
    stageName: "余晖 · 归一",
    pillLabel: "余晖,归一",
    intro: "对一生遗憾与成就的最后总结，复刻真实灵魂的最后拼图。",
    progressHint:
      "所有的经历在此刻归于和谐。请记录下最后的告别与最深的体悟。完成后，您的数字分身将完整承载一生的灵魂回响，在数字宇宙中获得永恒的宁静。",
    completionTitle: "灵魂归一",
    completionBody:
      "你的数字分身已承载从起源到余晖的完整图谱，可与世界持续互动。",
    primaryCta: "开始和 TA 聊天",
    secondaryCta: "回到分身列表",
    fields: [
      { id: "regret_release", label: "遗憾的消解", type: "textarea", placeholder: "如果你能回到阶段二或阶段三，对那个年轻的自己说一句话，你会说什么？" },
      { id: "fate_keywords", label: "命运的注脚", type: "textarea", placeholder: "用三个关键词概括你这一生最核心的逻辑（例如：热爱、责任、好奇）" },
      { id: "reconcile_moment", label: "和解时刻", type: "textarea", placeholder: "记录一个你曾经无法释怀，但在晚年终于放下的人或事" },
      { id: "legacy_letter", label: "遗训/家书", type: "textarea", placeholder: "你想留给后辈（或者这个世界）最重要的一条人生经验是什么？" },
      { id: "last_gift", label: "最后的礼物", type: "textarea", placeholder: "除了物质资产，你希望人们在提起你时，脑海中浮现的第一个画面是什么？" },
      { id: "witness", label: "见证者", type: "textarea", placeholder: "谁是你这一生最感激的见证者？" },
      { id: "end_vision", label: "终点图景", type: "textarea", placeholder: "你想象中生命最后时刻的理想状态是怎样的？（安静、被爱环绕、还是在旅途中？）" },
      { id: "fear_fade", label: "恐惧的消散", type: "textarea", placeholder: "你现在如何看待“消失”这件事？" },
      { id: "digital_legacy_wish", label: "数字永生愿望", type: "textarea", placeholder: "你希望你的数字分身（EverMemOS）在以后如何与世界互动？（是作为一个静态的纪念馆，还是一个能持续思考的智库？）" },
      { id: "final_thanks", label: "最终的感谢", type: "textarea", placeholder: "对此时此刻依然陪伴在身边的伴侣、子女或朋友说最后一段话" },
      { id: "soul_rest", label: "灵魂的栖息地", type: "textarea", placeholder: "如果你能化作宇宙中的一个元素，你希望是恒星、尘埃、还是虚无？" }
    ]
  }
];