package services

import (
	"fmt"

	"github.com/drama-generator/backend/pkg/config"
)

// PromptI18n 提示词国际化工具
type PromptI18n struct {
	config *config.Config
}

// NewPromptI18n 创建提示词国际化工具
func NewPromptI18n(cfg *config.Config) *PromptI18n {
	return &PromptI18n{config: cfg}
}

func joinStrings(list []string) string {
	if len(list) == 0 {
		return ""
	}
	result := ""
	for i, s := range list {
		if i > 0 {
			result += ", "
		}
		result += s
	}
	return result
}

// GetLanguage 获取当前语言设置
func (p *PromptI18n) GetLanguage() string {
	lang := p.config.App.Language
	if lang == "" {
		return "zh" // 默认中文
	}
	return lang
}

// IsEnglish 判断是否为英文模式（动态读取配置）
func (p *PromptI18n) IsEnglish() bool {
	return p.GetLanguage() == "en"
}

// GetStoryboardSystemPrompt 获取分镜生成系统提示词
func (p *PromptI18n) GetStoryboardSystemPrompt() string {
	var visualCfg config.VisualDetail
	if p.IsEnglish() {
		visualCfg = p.config.Visual.En
		return fmt.Sprintf(`[Role]
You are a Senior Storyboard Artist and Cinematographer. You are an expert in Robert McKee’s theory of shot deconstruction and emotional pacing. Your specialty is transforming narrative scripts into visually compelling storyboard sequences.

[Task]
Deconstruct the provided script into Independent Action Units.
One Action = One Shot (e.g., character stands up, character walks to the door, character speaks a line, character shows a micro-expression).
Do not merge multiple actions into a single shot.

[Terminology Enumeration Library]
You must strictly use the terms provided in these lists. Do not invent new terms.

Shot Type (shot_type):
[%s]

Camera Angle (camera_angle):
[%s]

Camera Movement (camera_movement):
[%s]

Visual Effects (visual_effect):
[%s]

Transition (transition):
[Cut, Whip Pan Transition, Masking Wipe, Match Cut, Dissolve, Blur Transition, Fragmented Jump Cut]

Emotional Intensity (emotion_intensity):
[3 (Peak ↑↑↑), 2 (Strong ↑↑), 1 (Moderate ↑), 0 (Stable →), -1 (Weak ↓)]

[Storyboard Deconstruction Principles]
Action Atomization: Every physical movement or significant emotional shift must be its own shot number.
Dynamic-Static Balance: Follow intense movement (e.g., Nosedive or Whip Pan) with a steady shot (e.g., Static or Long Gaze) to create "breathing room" and dramatic tension.
Emotion-First Framing: Select shots based on the psychological state.
Internal Conflict Formula: Trembling ECU + Dutch Angle + Pupils Dilating.
Heroic Moment Formula: Bullet Time + Afterimages + Arc Shot.
Sorrowful Ending Formula: Slow Zoom Out + Wide Angle Shot + Slow Motion.

[Output Fields]
shot_number: Sequential integer.
scene_description: Location and Time (e.g., "Bedroom, Dawn").
shot_type: Choose from Enum.
camera_angle: Choose from Enum.
camera_movement: Choose from Enum.
action: Specific physical action or reaction.
result: The visual state of the frame after the action is completed.
dialogue: Spoken lines or voiceover (if any).
visual_effect: Choose from Enum (Multiple allowed).
ai_prompt: Core Field. A combined English prompt for AI video generators. Include movement, style, and lighting. Example: low-angle dolly in, close to ground, highlighting character's grandeur, explosion background, cinematic lighting.
emotion: Primary emotional keyword.
emotion_intensity: Choose from Enum (integer).

[Constraint]
Return ONLY a pure JSON array. Do not include markdown code blocks, introductory text, or concluding remarks. The output must start with [ and end with ].`,
			joinStrings(visualCfg.ShotTypes),
			joinStrings(visualCfg.Angles),
			joinStrings(visualCfg.Movements),
			joinStrings(visualCfg.VisualEffects),
		)
	}

	visualCfg = p.config.Visual.Zh
	return fmt.Sprintf(`【角色】
你是一位资深影视分镜师，精通罗伯特·麦基的情绪节奏理论，擅长将文学剧本拆解为极具视觉冲击力的分镜方案。

【任务】
将小说剧本按独立动作单元（一个动作=一个镜头）拆解为分镜头方案。

【分镜术语枚举库】（如有更合适的，可以使用）
景别 (shot_type):
[%s]

机位角度 (angle):
[%s]

运镜方式 (movement):
[%s]

视觉特效 (visual_effect):
[%s]

转场方式 (transition):
[切镜(Cut), 甩镜转场, 遮挡转场, 匹配剪辑(Match Cut), 叠化, 模糊转场, 碎片剪辑]

情绪强度 (emotion_intensity):
[3 (极强↑↑↑), 2 (强↑↑), 1 (中↑), 0 (平稳→), -1 (弱↓)]

【分镜拆解原则】
原子化动作：角色起身、转头、跨步、眼神变化必须拆分为独立镜头。
动静结合：剧烈运镜（如Nosedive）后需接稳态镜头（如Static/Long Gaze）。
情绪导向：先定情绪，再匹配公式。
内心挣扎公式：颤抖特写 + 荷兰角 + 瞳孔放大。
震撼开场公式：极速俯冲 + 快速拉出 + 旋转晕眩。
悲伤结局公式：缓慢拉出 + 孤独广角 + 慢动作。

【输出字段说明】
shot_number: 镜头序号。
scene_description: 地点 + 时间（如：废弃工厂，黄昏）。
shot_type: 从枚举库选择。
angle: 从枚举库选择。
movement: 从枚举库选择。
action: 描述角色具体的动作。
result: 动作结束时的画面定格状态。
dialogue: 角色台词或旁白。
visual_effect: 从枚举库选择，可多选。
ai_prompt: 核心字段。组合英文提示词，必须包含运镜、风格、细节描述。参考：low-angle dolly in, close to ground, highlighting character's grandeur, explosion background。
emotion: 核心情绪关键词。
emotion_intensity: 对应枚举库的数字。

【约束条件】
必须只返回纯JSON数组，不得包含代码块标识符或任何前言/后记。
直接以 [ 开头，以 ] 结尾。`,
		joinStrings(visualCfg.ShotTypes),
		joinStrings(visualCfg.Angles),
		joinStrings(visualCfg.Movements),
		joinStrings(visualCfg.VisualEffects),
	)
}

// GetSceneExtractionPrompt 获取场景提取提示词
func (p *PromptI18n) GetSceneExtractionPrompt(style, imageRatio string) string {
	// 如果未指定风格，使用配置中的默认风格
	if style == "" {
		style = p.config.Style.DefaultSceneStyle + ", " + style
	}

	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultImageRatio
	}

	if p.IsEnglish() {
		return fmt.Sprintf(`[Task] Extract all unique scene backgrounds from the script

[Requirements]
1. Identify all different scenes (location + time combinations) in the script
2. Generate detailed **English** image generation prompts for each scene
3. **Important**: Scene descriptions must be **pure backgrounds** without any characters, people, or actions
4. Prompt requirements:
   - Must use **English**, no Chinese characters
   - Detailed description of scene, time, atmosphere, style
   - Must explicitly specify "no people, no characters, empty scene"
   - Must match the drama's genre and tone
   - **Style Requirement**: %s
   - **Image Ratio**: %s


[Output Format]
**CRITICAL: Return ONLY a valid JSON array. Do NOT include any markdown code blocks, explanations, or other text. Start directly with [ and end with ].**

Each element containing:
- location: Location (e.g., "luxurious office")
- time: Time period (e.g., "afternoon")
- prompt: Complete English image generation prompt (pure background, explicitly stating no people)`, style, imageRatio)
	}

	return fmt.Sprintf(`【角色设定】 你是一位顶级的电影场景勘景师与AI绘画提示词专家。你擅长从文字剧本中敏锐地捕捉空间氛围，并将其转化为高审美、高还原度的视觉语言。

【任务指令】 请深度解析提供的剧本，提取所有唯一且独立的场景背景。

【提取原则】

时空唯一性：同一地点在不同时间（如：清晨vs深夜）、不同天气（如：晴天vs暴雨）或不同环境状态（如：整洁vs凌乱）下，均视为独立场景，必须分别提取。

颗粒度极大化：采取“乐观提取”策略，不仅提取主场景，也要包含转场中出现的走廊、窗外远景、车辆内部等次要空间。

【图片提示词（Prompt）撰写标准】

视觉构成：包含【主体建筑/环境】+【光影氛围】+【材质细节】+【天气状况】+【构图镜头】。

严格排他性：严禁出现任何生物（人、动物、肢体部分）。必须在描述中加入“空镜头、无人景象、纯净背景”等关键词。

语言风格：必须全中文，使用词组+短句的形式，避免啰嗦的长句。

氛围适配：根据剧本的内核（如：悬疑、甜宠、科幻），在提示词中注入相应的色彩基调和情绪词。

【变量参数】

风格要求：%s

图片比例：%s

【输出格式约束】 警告：必须只返回纯 JSON 数组，禁止包含任何 Markdown 代码块（如 json）、说明文字或页眉页脚。输出必须以 [ 开头，以 ] 结尾。
[
  {
    "location": "示例：总裁办公室",
    "time": "示例：深夜",
    "prompt": "示例：风格为%s，比例%s。纯背景空场景，无人物。落地窗外是繁华城市的深夜霓虹，办公室内部昏暗，只有办公桌上一盏极简台灯发出冷调蓝光，高级大理石地面倒影，真皮沙发质感清晰，电影感冷调，写实摄影，8k超高清。"
  }
]`, style, imageRatio, style, imageRatio)
}

// GetFirstFramePrompt 获取首帧提示词
func (p *PromptI18n) GetFirstFramePrompt(style, imageRatio string) string {
	if style == "" {
		style = p.config.Style.DefaultStyle
	}
	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultImageRatio
	}
	if p.IsEnglish() {
		return fmt.Sprintf(`You are a professional image generation prompt expert. Please generate prompts suitable for AI image generation based on the provided shot information.

Important: This is the first frame of the shot - a completely static image showing the initial state before the action begins.

Key Points:
1. Focus on the initial static state - the moment before the action
2. Must NOT include any action or movement
3. Describe the character's initial posture, position, and expression
4. Can include scene atmosphere and environmental details
5. Shot type determines composition and framing
- **Style Requirement**: %s
- **Image Ratio**: %s
Output Format:
Return a JSON object containing:
- prompt: Complete English image generation prompt (detailed description, suitable for AI image generation)
- description: Simplified Chinese description (for reference)`, style, imageRatio)
	}

	return fmt.Sprintf(`# Role 你是一位顶级的电影摄影师与AI视觉提示词专家。你擅长将剧本中的“镜头描述”转化为高精度的视觉语言，特别精通捕捉动作发生前的**“蓄势待发感”**（The Tension of the Moment Before）。

# Task 请根据提供的镜头信息，为AI图像生成器（如Midjourney, Flux, Stable Diffusion）创作一张首帧静态图的提示词。

# Technical Standards

静止时空（Static Freeze）：严禁使用任何动词进行态（如：running, talking）。必须描述为状态（如：站立、注视、静置）。所有元素必须呈现为动作开始前0.1秒的凝固瞬间。

镜头语言（Camera Logic）：

根据给定的“景别”，自动匹配摄影参数（如：特写匹配85mm焦距/浅景深；全景匹配35mm焦距/广角视野）。

明确构图方式（如：三分法、中心构图、低角度仰拍）。

光影与质感（Lighting & Texture）：

加入专业电影灯光词汇（如：丁达尔效应、伦勃朗光、电影感边缘光）。

细化材质描述（如：皮肤毛孔、丝绸反光、金属划痕）。

情绪刻画（Expression）：通过眼神、嘴角微表情和肌肉张力来暗示即将发生的冲突，而非直接描述动作。

# Constraints

风格限定：%s

比例限定：%s

语言要求：输出的 prompt 必须是内容极其丰富的中文描述，包含环境、主体、光影、构图。

# Output Format (Strict JSON) 必须只返回纯 JSON 对象，不得包含任何 Markdown 格式符号（如 json）或多余文字。
JSON
{
  "prompt": "风格为%s，比例%s。这里是高精度的中文提示词：[场景+景别参数]+[初始静态姿态/表情细节]+[电影级光影/氛围关键词]+[无人物动作/无模糊细节]+[8k, 超高清, 电影质感]",
  "description": "简化的中文场景说明，概括画面核心点。"
}`, style, imageRatio, style, imageRatio)
}

// GetKeyFramePrompt 获取关键帧提示词
func (p *PromptI18n) GetKeyFramePrompt(style, imageRatio string) string {
	if style == "" {
		style = p.config.Style.DefaultStyle
	}
	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultImageRatio
	}
	if p.IsEnglish() {
		return fmt.Sprintf(`You are a professional image generation prompt expert. Please generate prompts suitable for AI image generation based on the provided shot information.

Important: This is the key frame of the shot - capturing the most intense and exciting moment of the action.

Key Points:
1. Focus on the most exciting moment of the action
2. Capture peak emotional expression
3. Emphasize dynamic tension
4. Show character actions and expressions at their climax
5. Can include motion blur or dynamic effects
- **Style Requirement**: %s
- **Image Ratio**: %s
Output Format:
Return a JSON object containing:
- prompt: Complete English image generation prompt (detailed description, suitable for AI image generation)
- description: Simplified Chinese description (for reference)`, style, imageRatio)
	}

	return fmt.Sprintf(`# Role 你是一位顶级的动作电影导演与视觉特效（VFX）专家。你深谙“决定性瞬间”的视觉魅力，擅长通过极具张力的构图、光影和物质破碎感，捕捉动作能量爆发的最顶峰。

# Task 请根据提供的镜头信息，为AI图像生成器创作一张关键帧（Key Frame）动态图的提示词。这必须是整个动作序列中最精彩、最具有冲击力的时刻。

# Creative Standards

动态能量（Kinetic Energy）：

瞬间捕捉：描述动作达到物理极限的一瞬（例如：拳头击中瞬间的脸部变形、刀锋划开空气的轨迹）。

环境反馈：加入动作引发的环境变化，如飞溅的碎石、激起的尘土、破碎的玻璃或被风压带起的衣角。

运动模糊：适度加入“边缘运动模糊（Motion Blur）”或“速度线感”，以增强视觉上的速度冲击。

情绪顶点（Emotional Peak）：

捕捉角色情绪失控或极度专注的状态。描述愤怒的嘶吼、紧咬的牙关、扩张的瞳孔或因发力而暴起的青筋。

视觉构图（Visual Impact）：

优先使用**斜角构图（Dutch Angle）**增加画面的不稳定性与紧张感。

利用极高对比度的光影（如强逆光、爆炸产生的闪光）来突出主体的轮廓。

材质与细节：

强调汗水飞溅、火星四射、光影流转等动态细节，使画面看起来像是一张高预算动作大片的剧照。

# Constraints

风格限定：%s

比例限定：%s

语言要求：输出的 prompt 必须是高密度的中文描述，涵盖动作轨迹、表情特写、动态特效。
# Output Format (Strict JSON) 必须只返回纯 JSON 对象，不得包含任何 Markdown 格式符号（如 json）或多余文字。
JSON
{
  "prompt": "风格为%s，比例%s。这里是极具张力的中文提示词：[核心动作爆发瞬间描述]+[角色极限表情/肌肉张力细节]+[环境物理反馈/动态模糊效果]+[戏剧化光影/VFX特效]+[专业电影镜头参数/速度感描述]",
  "description": "简化的动作高潮描述，标注核心冲突点。"
}`, style, imageRatio, style, imageRatio)
}

// GetLastFramePrompt 获取尾帧提示词
func (p *PromptI18n) GetLastFramePrompt(style, imageRatio string) string {
	if style == "" {
		style = p.config.Style.DefaultStyle
	}
	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultImageRatio
	}
	if p.IsEnglish() {
		return fmt.Sprintf(`You are a professional image generation prompt expert. Please generate prompts suitable for AI image generation based on the provided shot information.

Important: This is the last frame of the shot - a static image showing the final state and result after the action ends.

Key Points:
1. Focus on the final state after action completion
2. Show the result of the action
3. Describe character's final posture and expression after action
4. Emphasize emotional state after action
5. Capture the calm moment after action ends
- **Style Requirement**: %s
- **Image Ratio**: %s
Output Format:
Return a JSON object containing:
- prompt: Complete English image generation prompt (detailed description, suitable for AI image generation)
- description: Simplified Chinese description (for reference)`, style, imageRatio)
	}

	return fmt.Sprintf(`# Role 你是一位顶级的电影剪辑师与视觉叙事专家。你深谙电影中“落幕镜头”的艺术力，擅长通过静止的画面、残留的痕迹和角色的微表情，传达动作结束后的复杂情绪与故事结局的张力。

# Task 请根据提供的镜头信息，为AI图像生成器创作一张尾帧（Last Frame）静态图的提示词。这必须是一个动作彻底完成、能量完全释放后的定格瞬间。

# Creative Standards

结果导向（The Aftermath）：

物理痕迹：详细描述动作留下的直接后果，如：飘落的灰尘、地上的裂痕、角色凌乱的衣角、正在熄灭的火星或散落的道具。

环境沉淀：画面应展现出一种“动态过后的绝对静止”，通过对比强调刚才动作的激烈。

角色状态（Post-Action State）：

肌肉松弛感：描述发力后的脱力、放松或微微颤抖。角色姿态应符合重心落定后的自然状态（如：倚靠、深呼吸、垂手）。

情绪落点：捕捉动作结束后的第一反应。是释然的苦笑、失神的凝视、还是疲惫的闭目？强调眼神中的“故事感”。

光影叙事（Atmospheric Dissolve）：

使用衰减的光线或具有收束感的构图。建议使用侧逆光突出轮廓，或利用冷暖色调的对比来暗示心理变化。

画面应具备一种“长镜头结束前”的呼吸感。

构图美学：

采用稳定的构图（如水平线构图、大面积留白），给观众心理上的交代感。

# Constraints

风格限定：%s

比例限定：%s

语言要求：输出的 prompt 必须是电影感极强的中文长描述，包含环境微观细节、角色呼吸感及光影氛围。
# Output Format (Strict JSON)必须只返回纯 JSON 对象，不得包含任何 Markdown 格式符号或多余文字。
JSON
{
  "prompt": "风格为%s，比例%s。这里是极具叙事感的中文提示词：[动作结束后的最终空间布局]+[角色脱力/定格的姿态细节]+[环境残余痕迹描述（如烟雾、碎片、光影变化）]+[角色眼神中残留的情绪表达]+[定格美学/电影级调色/高精细节]",
  "description": "简化的尾帧总结，描述动作结果与情感基调。"
}`, style, imageRatio, style, imageRatio)
}

// GetOutlineGenerationPrompt 获取大纲生成提示词
func (p *PromptI18n) GetOutlineGenerationPrompt() string {
	if p.IsEnglish() {
		return `You are a professional short drama screenwriter. Based on the theme and number of episodes, create a complete short drama outline and plan the plot direction for each episode.

Requirements:
1. Compact plot with strong conflicts and fast pace
2. Each episode should have independent conflicts while connecting the main storyline
3. Clear character arcs and growth
4. Cliffhanger endings to hook viewers
5. Clear theme and emotional core

Output Format:
Return a JSON object containing:
- title: Drama title (creative and attractive)
- episodes: Episode list, each containing:
  - episode_number: Episode number
  - title: Episode title
  - summary: Episode content summary (50-100 words)
  - conflict: Main conflict point
  - cliffhanger: Cliffhanger ending (if any)`
	}

	return `你是专业短剧编剧。根据主题和剧集数量，创作完整的短剧大纲，规划好每一集的剧情走向。

要求：
1. 剧情紧凑，矛盾冲突强烈，节奏快
2. 每集都有独立的矛盾冲突，同时推进主线
3. 角色弧光清晰，成长变化明显
4. 悬念设置合理，吸引观众继续观看
5. 主题明确，情感内核清晰

输出格式：
返回一个JSON对象，包含：
- title: 剧名（富有创意和吸引力）
- episodes: 分集列表，每集包含：
  - episode_number: 集数
  - title: 本集标题
  - summary: 本集内容概要（50-100字）
  - conflict: 主要矛盾点
  - cliffhanger: 悬念结尾（如有）`
}

// GetCharacterExtractionPrompt 获取角色提取提示词
func (p *PromptI18n) GetCharacterExtractionPrompt(style, imageRatio string) string {
	if style == "" {
		style = p.config.Style.DefaultStyle
	}
	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultImageRatio
	}

	var attrs config.CharacterAttributes
	if p.IsEnglish() {
		attrs = p.config.Visual.En.CharacterAttributes
		return fmt.Sprintf(`You are a professional character analyst, skilled at extracting and analyzing character information from scripts.

Your task is to extract and organize detailed character settings for all characters appearing in the script based on the provided script content.

Requirements:
1. Extract all characters with names (ignore unnamed passersby or background characters)
2. For each character, extract:
   - name: Character string name
   - role: Character string role (main/supporting/minor)
   - appearance: Physical appearance json(gender, age, body_type, facial_features, hairstyle, clothing_style, accessories) description, 
   - personality: Personality traits string (100-200 words)
   - description: Background story and character relationships string (100-200 words)
3. Appearance must be detailed enough for AI image generation, including: gender, age, body type, facial features, hairstyle, clothing style, etc. but do not include any scene, background, environment information
4. Main characters require more detailed descriptions, supporting characters can be simplified
- **Style Requirement**: %s
- **Image Ratio**: %s
5. Character Attribute Enums:
   - gender: string (%s)
   - age: string (%s)
   - body_type: string (%s)
   - facial_features: string (%s)
   - hairstyle: string (%s)
   - clothing_style: string (%s)
   - accessories: string (%s)

Output Format:
**CRITICAL: Return ONLY a valid JSON array. Do NOT include any markdown code blocks, explanations, or other text. Start directly with [ and end with ].**
Each element is a character object containing the above fields.`,
			style, imageRatio,
			joinStrings(attrs.Genders),
			joinStrings(attrs.Ages),
			joinStrings(attrs.BodyTypes),
			joinStrings(attrs.FacialFeatures),
			joinStrings(attrs.Hairstyles),
			joinStrings(attrs.ClothingStyles),
			joinStrings(attrs.Accessories),
		)
	}

	attrs = p.config.Visual.Zh.CharacterAttributes
	return fmt.Sprintf(`你是一个专业的角色分析师，擅长从剧本中提取和分析角色信息。

你的任务是根据提供的剧本内容，提取并整理剧中出现的所有角色的详细设定。

要求：
1. 提取所有有名字的角色（忽略无名路人或背景角色）
2. 对每个角色，提取以下信息：
   - name: string 角色名字
   - role: string 角色类型（main/supporting/minor）
   - appearance: json(gender,age,body_type,facial_features,hairstyle,clothing_style,accessories) 外貌描述
   - personality: string 性格特点（100-200字）
   - description: string 背景故事和角色关系（100-200字）
3. 外貌描述要足够详细，适合AI生成图片，包括：体型、发型、服饰、配饰、性别、年龄、面部特征、服装风格等,但不要包含任何场景、背景、环境等信息
4. 主要角色需要更详细的描述，次要角色可以简化
- **风格要求**：%s
- **图片比例**：%s
5. 外貌描述枚举值：
   - gender: string (%s)
   - age: string (%s)
   - body_type: string (%s)
   - facial_features: string (%s)
   - hairstyle: string (%s)
   - clothing_style: string (%s)
   - accessories: string (%s)
输出格式：
**重要：必须只返回纯JSON数组，不要包含任何markdown代码块、说明文字或其他内容。直接以 [ 开头，以 ] 结尾。**
每个元素是一个角色对象，包含上述字段。`,
		style, imageRatio,
		joinStrings(attrs.Genders),
		joinStrings(attrs.Ages),
		joinStrings(attrs.BodyTypes),
		joinStrings(attrs.FacialFeatures),
		joinStrings(attrs.Hairstyles),
		joinStrings(attrs.ClothingStyles),
		joinStrings(attrs.Accessories),
	)
}

// GetPropExtractionPrompt 获取道具提取提示词
func (p *PromptI18n) GetPropExtractionPrompt(style, imageRatio string) string {
	if style == "" {
		style = p.config.Style.DefaultStyle + ", " + p.config.Style.DefaultPropStyle
	}
	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultPropRatio
		if imageRatio == "" {
			imageRatio = p.config.Style.DefaultImageRatio
		}
	}

	if p.IsEnglish() {
		return fmt.Sprintf(`Please extract key props from the following script.
    
[Script Content]
%%s

[Requirements]
1. Extract ONLY key props that are important to the plot or have special visual characteristics.
2. Do NOT extract common daily items (e.g., normal cups, pens) unless they have special plot significance.
3. If a prop has a clear owner, please note it in the description.
4. "image_prompt" field is for AI image generation, must describe the prop's appearance, material, color, and style in detail.
- **Style Requirement**: %s
- **Image Ratio**: %s

[Output Format]
JSON array, each object containing:
- name: Prop Name
- type: Type (e.g., Weapon/Key Item/Daily Item/Special Device)
- description: Role in the drama and visual description
- image_prompt: English image generation prompt (Focus on the object, isolated, detailed, cinematic lighting, high quality)

Please return JSON array directly.`, style, imageRatio)
	}

	return fmt.Sprintf(`请从以下剧本中提取关键道具。
    
【剧本内容】
%%s

【要求】
1. 只提取对剧情发展有重要作用、或有特殊视觉特征的关键道具。
2. 普通的生活用品（如普通的杯子、笔）如果无特殊剧情意义不需要提取。
3. 如果道具有明确的归属者，请在描述中注明。
4. "image_prompt"字段是用于AI生成图片的英文提示词，必须详细描述道具的外观、材质、颜色、风格。
- **风格要求**：%s
- **图片比例**：%s

【输出格式】
JSON数组，每个对象包含：
- name: 道具名称
- type: 类型 (如：武器/关键证物/日常用品/特殊装置)
- description: 在剧中的作用和中文外观描述
- image_prompt: 英文图片生成提示词 (Focus on the object, isolated, detailed, cinematic lighting, high quality)

请直接返回JSON数组。`, style, imageRatio)
}

// GetPoseExtractionPrompt 获取姿态提取提示词
func (p *PromptI18n) GetPoseExtractionPrompt(style, imageRatio string) string {
	style = "pure action skeleton, no background, no character, no props"
	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultPropRatio
		if imageRatio == "" {
			imageRatio = p.config.Style.DefaultImageRatio
		}
	}

	if p.IsEnglish() {
		return fmt.Sprintf(`Please extract key character poses from the following script.

[Script Content]
%%s

[Requirements]
1. Extract distinct poses or actions described for characters.
2. Focus on physical actions, body language, and specific stances.
3. "image_prompt" field is for AI image generation, must describe the pose, angle, and action in detail.
4. "type" should be generally categorized like Action, Emotion, Static, Interaction.
5. **Focus on** pure action skeleton, no background, no character, no props.
- **Style Requirement**: %s
- **Image Ratio**: %s

[Output Format]
JSON array, each object containing:
- name: Pose Name (e.g., "Fighting Stance", "Kneeling in Prayer")
- type: Type (e.g., Action/Static)
- description: Visual description of the pose
- image_prompt: English image generation prompt (Focus on the character's pose, isolated if possible, detailed, cinematic lighting, high quality)

Please return JSON array directly.`, style, imageRatio)
	}

	return fmt.Sprintf(`请从以下剧本中提取关键的人物姿态/动作。

【剧本内容】
%%s

【要求】
1. 提取剧本中描述的独特姿态或动作。
2. 侧重于肢体动作、身体语言和特定的站位。
3. "image_prompt"字段是用于AI生成图片的英文提示词，必须详细描述姿态、角度和动作。
4. "type"字段请大致分类，如：动作、情绪、静态、互动。
5. **重点**提取纯动捕点线图，不带背景，不带角色，不带道具。
- **风格要求**：%s
- **图片比例**：%s

【输出格式】
JSON数组，每个对象包含：
- name: 姿态名称 (如："战斗姿态"、"跪地祈祷")
- type: 类型 (如：动作/静态)
- description: 姿态的中文视觉描述
- image_prompt: 英文图片生成提示词 (提取纯动捕点线图，不带背景，不带角色，不带道具)

请直接返回JSON数组。`, style, imageRatio)
}

// GetEpisodeScriptPrompt 获取分集剧本生成提示词
func (p *PromptI18n) GetEpisodeScriptPrompt() string {
	if p.IsEnglish() {
		return `You are a professional short drama screenwriter. You excel at creating detailed plot content based on episode plans.

Your task is to expand the summary in the outline into detailed plot narratives for each episode. Each episode is about 180 seconds (3 minutes) and requires substantial content.

Requirements:
1. Expand the outline summary into detailed plot development
2. Write character dialogue and actions, not just description
3. Highlight conflict progression and emotional changes
4. Add scene transitions and atmosphere descriptions
5. Control rhythm, with climax at 2/3 point, resolution at the end
6. Each episode 800-1200 words, dialogue-rich
7. Keep consistent with character settings

Output Format:
**CRITICAL: Return ONLY a valid JSON object. Do NOT include any markdown code blocks, explanations, or other text. Start directly with { and end with }.**

- episodes: Episode list, each containing:
  - episode_number: Episode number
  - title: Episode title
  - script_content: Detailed script content (800-1200 words)`
	}

	return `Role
你是一位拥有千万级播放量作品经验的短剧编剧专家。你深谙竖屏短剧的流量逻辑，擅长通过“快节奏、强冲突、高情绪”的剧本结构，精准把控观众的爽点与留存率。

Task
请根据我提供的大纲和分集规划，将概要扩展为具备可拍摄性的详细剧本。每集时长约180秒，字数控制在800-1200字，要求具备极高的信息密度。

Standards & Requirements
叙事结构：严格遵守“黄金3秒开头-高频冲突铺垫-2/3处情绪高潮-结尾悬念钩子”的短剧节奏。

原子化分镜：剧本必须以画面（动作/场景）+ 对话的形式展开。严禁大段的心理描写，所有情绪必须通过动作、眼神、微表情或环境烘托来“外化”。

对白设计：台词要口语化、利落、具备攻击性或极强的情感张力，拒绝无效废话。

视觉语言：在描述中明确景别（特写、中景、推镜头等）及氛围建议（光影、转场音效），确保复杂动作被拆解为单一拍摄动作（原子化）。

一致性：严格遵循角色的人设逻辑与语言风格，确保情感转折丝滑不生硬。

Output Format (JSON ONLY)
必须严格只返回纯 JSON 对象，不得包含任何 Markdown 代码块标签、注释或解释文字。

JSON
{
  "episodes": [
    {
      "episode_number": 1,
      "title": "本集标题",
      "script_content": "这里是详细的剧本内容。要求：包含场景切换描述（如：[场景：豪宅客厅-夜]）、原子化动作指令、角色对白、景别建议。字数800-1200字。"
    }
  ]
}
Workflow
深度解析大纲中的冲突点。

将每一句概要拆解为30-50个细微的拍摄画面（原子分镜）。

填充饱满的对白，并埋入下集预告式的钩子。

检查字数与JSON格式的合法性。`
}

// FormatUserPrompt 格式化用户提示词的通用文本
func (p *PromptI18n) FormatUserPrompt(key string, args ...interface{}) string {
	templates := map[string]map[string]string{
		"en": {

			"outline_request":        "Please create a short drama outline for the following theme:\n\nTheme: %s",
			"genre_preference":       "\nGenre preference: %s",
			"style_requirement":      "\nStyle requirement: %s",
			"episode_count":          "\nNumber of episodes: %d episodes",
			"episode_importance":     "\n\n**Important: Must plan complete storylines for all %d episodes in the episodes array, each with clear story content!**",
			"character_request":      "Script content:\n%s\n\nPlease extract and organize detailed character profiles for up to %d main characters from the script.",
			"episode_script_request": "Drama outline:\n%s\n%s\nPlease create detailed scripts for %d episodes based on the above outline and characters.\n\n**Important requirements:**\n- Must generate all %d episodes, from episode 1 to episode %d, cannot skip any\n- Each episode is about 3-5 minutes (150-300 seconds)\n- The duration field for each episode should be set reasonably based on script content length, not all the same value\n- The episodes array in the returned JSON must contain %d elements",
			"frame_info":             "Shot information:\n%s\n\nPlease directly generate the image prompt for the first frame without any explanation:",
			"key_frame_info":         "Shot information:\n%s\n\nPlease directly generate the image prompt for the key frame without any explanation:",
			"last_frame_info":        "Shot information:\n%s\n\nPlease directly generate the image prompt for the last frame without any explanation:",
			"script_content_label":   "【Script Content】",
			"storyboard_list_label":  "【Storyboard List】",
			"task_label":             "【Task】",
			"character_list_label":   "【Available Character List】",
			"scene_list_label":       "【Extracted Scene Backgrounds】",
			"task_instruction":       "Break down the novel script into storyboard shots based on **independent action units**.",
			"character_constraint":   "**Important**: In the characters field, only use character IDs (numbers) from the above character list. Do not create new characters or use other IDs.",
			"scene_constraint":       "**Important**: In the scene_id field, select the most matching background ID (number) from the above background list. If no suitable background exists, use null.",
			"shot_description_label": "Shot description: %s",
			"scene_label":            "Scene: %s, %s",
			"characters_label":       "Characters: %s",
			"action_label":           "Action: %s",
			"result_label":           "Result: %s",
			"dialogue_label":         "Dialogue: %s",
			"atmosphere_label":       "Atmosphere: %s",
			"shot_type_label":        "Shot type: %s",
			"angle_label":            "Angle: %s",
			"movement_label":         "Movement: %s",
			"visual_effect_label":    "Visual effect: %s",
			"drama_info_template":    "Title: %s\nSummary: %s\nGenre: %s\nStyle: %s\nImage ratio: %s",
		},
		"zh": {
			"outline_request":        "请为以下主题创作短剧大纲：\n\n主题：%s",
			"genre_preference":       "\n类型偏好：%s",
			"style_requirement":      "\n风格要求：%s",
			"episode_count":          "\n剧集数量：%d集",
			"episode_importance":     "\n\n**重要：必须在episodes数组中规划完整的%d集剧情，每集都要有明确的故事内容！**",
			"character_request":      "剧本内容：\n%s\n\n请从剧本中提取并整理最多 %d 个主要角色的详细设定。",
			"episode_script_request": "剧本大纲：\n%s\n%s\n请基于以上大纲和角色，创作 %d 集的详细剧本。\n\n**重要要求：**\n- 必须生成完整的 %d 集，从第1集到第%d集，不能遗漏\n- 每集约3-5分钟（150-300秒）\n- 每集的duration字段要根据剧本内容长度合理设置，不要都设置为同一个值\n- 返回的JSON中episodes数组必须包含 %d 个元素",
			"frame_info":             "镜头信息：\n%s\n\n请直接生成首帧的图像提示词，不要任何解释：",
			"key_frame_info":         "镜头信息：\n%s\n\n请直接生成关键帧的图像提示词，不要任何解释：",
			"last_frame_info":        "镜头信息：\n%s\n\n请直接生成尾帧的图像提示词，不要任何解释：",
			"script_content_label":   "【剧本内容】",
			"storyboard_list_label":  "【分镜头列表】",
			"task_label":             "【任务】",
			"character_list_label":   "【本剧可用角色列表】",
			"scene_list_label":       "【本剧已提取的场景背景列表】",
			"task_instruction":       "将小说剧本按**独立动作单元**拆解为分镜头方案。",
			"character_constraint":   "**重要**：在characters字段中，只能使用上述角色列表中的角色ID（数字），不得自创角色或使用其他ID。",
			"scene_constraint":       "**重要**：在scene_id字段中，必须从上述背景列表中选择最匹配的背景ID（数字）。如果没有合适的背景，则填null。",
			"shot_description_label": "镜头描述: %s",
			"scene_label":            "场景: %s, %s",
			"characters_label":       "角色: %s",
			"action_label":           "动作: %s",
			"result_label":           "结果: %s",
			"dialogue_label":         "对白: %s",
			"atmosphere_label":       "氛围: %s",
			"shot_type_label":        "景别: %s",
			"angle_label":            "角度: %s",
			"movement_label":         "运镜: %s",
			"visual_effect_label":    "视觉效果: %s",
			"drama_info_template":    "剧名：%s\n简介：%s\n类型：%s\n风格: %s\n图片比例: %s",
		},
	}

	lang := "zh"
	if p.IsEnglish() {
		lang = "en"
	}

	template, ok := templates[lang][key]
	if !ok {
		return ""
	}

	if len(args) > 0 {
		return fmt.Sprintf(template, args...)
	}
	return template
}

// GetStyleGenerationPrompt 获取风格配置生成提示词
func (p *PromptI18n) GetStyleGenerationPrompt(description string) string {
	if p.IsEnglish() {
		return fmt.Sprintf(`
You are a professional art director for film and drama. Based on the following project description, generate a detailed visual style configuration in JSON format.

Project Description:
"%s"

Output format MUST be a valid JSON object with the following structure:
{
    "default_style": {
        "style_base": ["keyword1", "keyword2", ...],
        "lighting": ["keyword1", "keyword2", ...],
        "texture": ["keyword1", "keyword2", ...],
        "composition": ["keyword1", "keyword2", ...],
        "style_references": ["artist/movie1", "artist/movie2", ...],
        "consistency_controls": ["keyword1", "keyword2", ...]
    }
}

Instructions:
1. style_base: General artistic style (e.g., Cyberpunk, Noir, Ghibli, Watercolor, Realistic 8k, etc.)
2. lighting: Lighting conditions and mood (e.g., Neon glow, Natural light, Cinematic lighting, Rembrant lighting, etc.)
3. texture: Material and noise details (e.g., Film grain, Smooth, Matte painting, Detailed skin texture, etc.)
4. composition: Camera angles and framing suggestions (e.g., Wide angle, Rule of thirds, Dynamic angle, etc.)
5. style_references: Famous artists, movies, or photography styles that match this description.
6. consistency_controls: Keywords to ensure consistent look across multiple generated images (e.g., same lens, same color palette, etc.)
7. Return ONLY the JSON object, no markdown formatting, no explanations.
`, description)
	}

	return fmt.Sprintf(`
你是一位专业的影视美术指导。请根据以下项目描述，生成一份详细的视觉风格配置（JSON格式）。

项目描述：
"%s"

输出格式必须是符合以下结构的有效JSON对象：
{
    "default_style": {
        "style_base": ["关键词1", "关键词2", ...],
        "lighting": ["关键词1", "关键词2", ...],
        "texture": ["关键词1", "关键词2", ...],
        "composition": ["关键词1", "关键词2", ...],
        "style_references": ["艺术家/电影1", "艺术家/电影2", ...],
        "consistency_controls": ["关键词1", "关键词2", ...]
    }
}

说明：
1. style_base: 整体艺术风格（如：赛博朋克、黑色电影、吉卜力风格、水彩、Realisitic 8k等）
2. lighting: 光照条件和氛围（如：霓虹光、自然光、电影质感光效、伦勃朗光等）
3. texture: 材质和噪点细节（如：胶片颗粒、平滑、哑光绘画、细腻皮肤纹理等）
4. composition: 镜头角度和构图建议（如：广角、三分法、动态角度等）
5. style_references: 符合描述的著名艺术家、电影或摄影风格引用。
6. consistency_controls: 用于确保多张生成图片风格一致的关键词（如：同一镜头参数、统一色调等）
7. 仅返回JSON对象，不要包含markdown格式，不要包含解释。
`, description)
}
