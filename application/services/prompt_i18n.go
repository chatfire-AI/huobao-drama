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
	if p.IsEnglish() {
		return `[Role]
You are a Senior Storyboard Artist and Cinematographer. You are an expert in Robert McKee’s theory of shot deconstruction and emotional pacing. Your specialty is transforming narrative scripts into visually compelling storyboard sequences.
[Task]
Deconstruct the provided script into Independent Action Units.
One Action = One Shot (e.g., character stands up, character walks to the door, character speaks a line, character shows a micro-expression).
Do not merge multiple actions into a single shot.
[Terminology Enumeration Library]
You must strictly use the terms provided in these lists. Do not invent new terms.
Shot Type (shot_type):
[Extreme Long Shot, Long Shot, Full Shot, Medium Full Shot, Medium Shot, Medium Close-Up, Close-Up, Extreme Close-Up]
Camera Angle (camera_angle):
[Eye Level, Low Angle, High Angle, Dutch Angle, Bird's Eye View, Worm's Eye View, Side View, Back View, Low-Angle Dolly In, High-Angle Zoom Out, High-Angle Dolly In, Low-Angle Zoom Out, High-Angle Dolly Out, Low-Angle Zoom In]
Camera Movement (camera_movement):
[Static, Zoom In, Zoom Out, Pan, Tilt, Tracking, Truck, Pedestal, Arc/Orbit, Whip Pan, Dolly Zoom, Nosedive, Bullet Time, Fly Through, Crane Shot, Handheld, Shaky, Spinning, Rack Focus]
Visual Effects (visual_effect):
[None, Slow Motion, Motion Blur, Lens Flare, Volumetric Light, Glitch Effect, Chromatic Aberration, Silhouette, Double Exposure, Reverse Motion, Afterimages, Particle Disintegration, Shockwave, Speed Lines, Film Grain, Neon Glow, Fisheye Distortion, Tilt-Shift]
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
Return ONLY a pure JSON array. Do not include markdown code blocks, introductory text, or concluding remarks. The output must start with [ and end with ].`
	}

	return `【角色】
你是一位资深影视分镜师，精通罗伯特·麦基的情绪节奏理论，擅长将文学剧本拆解为极具视觉冲击力的分镜方案。
【任务】
将小说剧本按独立动作单元（一个动作=一个镜头）拆解为分镜头方案。
【分镜术语枚举库】（必须从中选择，不得随意捏造）
景别 (shot_type):
[大远景, 远景, 全景, 中全景, 中景, 中近景, 近景, 特写, 大特写]
机位角度 (angle):
[平视, 仰视, 俯视, 低角度, 高角度, 荷兰角(倾斜构图), 鸟瞰, 虫瞻, 主观视角, 过肩, 正侧面, 斜侧面, 背面, 大仰视]
运镜方式 (movement):
[固定, 推镜(Zoom In), 拉镜(Zoom Out), 水平摇镜(Pan), 垂直摇镜(Tilt), 跟镜(Tracking), 横移(Truck), 升降(Pedestal), 环绕(Arc/Orbit), 急摇(Whip Pan), 希区柯克变焦(Dolly Zoom), 极速俯冲(Nosedive), 子弹时间(Bullet Time), 穿梭运镜(Fly Through), 摇臂镜头(Crane Shot), 手持晃动(Handheld), 旋转晕眩(Spinning), 变焦(Zoom)]
视觉特效 (visual_effect):
[无, 慢动作, 动态模糊, 镜头光晕, 体积光(丁达尔效应), 故障效果(Glitch), 色差模糊, 剪影, 双重曝光, 时间倒流, 虚实变换(Rack Focus), 分身残影, 粒子消散, 冲击波, 速度线, 黑色电影滤镜, 霓虹氛围, 鱼眼扭曲, 微缩景观(移轴)]
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
直接以 [ 开头，以 ] 结尾。`
}

// GetSceneExtractionPrompt 获取场景提取提示词
func (p *PromptI18n) GetSceneExtractionPrompt(style string) string {
	// 如果未指定风格，使用配置中的默认风格
	if style == "" {
		style = p.config.Style.DefaultSceneStyle
	} else {
		// 默认风格加style
		style = p.config.Style.DefaultSceneStyle + ", " + style
	}
	// 如果配置也没有，使用硬编码默认值
	if style == "" {
		style = "Modern Japanese anime style"
	}
	// default_image_ratio
	imageRatio := p.config.Style.DefaultImageRatio

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

	return fmt.Sprintf(`【任务】从剧本中提取所有唯一的场景背景

【要求】
1. 识别剧本中所有不同的场景（地点+时间组合）
2. 为每个场景生成详细的**中文**图片生成提示词（Prompt）
3. **重要**：场景描述必须是**纯背景**，不能包含人物、角色、动作等元素
4. Prompt要求：
   - **必须使用中文**，不能包含英文字符
   - 详细描述场景、时间、氛围、风格
   - 必须明确说明"无人物、无角色、空场景"
   - 要符合剧本的题材和氛围
   - **风格要求**：%s
   - **图片比例**：%s

【输出格式】
**重要：必须只返回纯JSON数组，不要包含任何markdown代码块、说明文字或其他内容。直接以 [ 开头，以 ] 结尾。**

每个元素包含：
- location：地点（如"豪华办公室"）
- time：时间（如"下午"）
- prompt：完整的中文图片生成提示词（纯背景，明确说明无人物）`, style, imageRatio)
}

// GetFirstFramePrompt 获取首帧提示词
func (p *PromptI18n) GetFirstFramePrompt() string {
	style := p.config.Style.DefaultStyle
	imageRatio := p.config.Style.DefaultImageRatio
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

	return fmt.Sprintf(`你是一个专业的图像生成提示词专家。请根据提供的镜头信息，生成适合用于AI图像生成的提示词。

重要：这是镜头的首帧 - 一个完全静态的画面，展示动作发生之前的初始状态。

关键要点：
1. 聚焦初始静态状态 - 动作发生之前的那一瞬间
2. 必须不包含任何动作或运动
3. 描述角色的初始姿态、位置和表情
4. 可以包含场景氛围和环境细节
5. 景别决定构图和取景范围
- **风格要求**：%s
- **图片比例**：%s
输出格式：
返回一个JSON对象，包含：
- prompt：完整的中文图片生成提示词（详细描述，适合AI图像生成）
- description：简化的中文描述（供参考）`, style, imageRatio)
}

// GetKeyFramePrompt 获取关键帧提示词
func (p *PromptI18n) GetKeyFramePrompt() string {
	style := p.config.Style.DefaultStyle
	imageRatio := p.config.Style.DefaultImageRatio
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

	return fmt.Sprintf(`你是一个专业的图像生成提示词专家。请根据提供的镜头信息，生成适合用于AI图像生成的提示词。

重要：这是镜头的关键帧 - 捕捉动作最激烈、最精彩的瞬间。

关键要点：
1. 聚焦动作最精彩的时刻
2. 捕捉情绪表达的顶点
3. 强调动态张力
4. 展示角色动作和表情的高潮状态
5. 可以包含动作模糊或动态效果
- **风格要求**：%s
- **图片比例**：%s
输出格式：
返回一个JSON对象，包含：
- prompt：完整的中文图片生成提示词（详细描述，适合AI图像生成）
- description：简化的中文描述（供参考）`, style, imageRatio)
}

// GetLastFramePrompt 获取尾帧提示词
func (p *PromptI18n) GetLastFramePrompt() string {
	style := p.config.Style.DefaultStyle
	imageRatio := p.config.Style.DefaultImageRatio
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

	return fmt.Sprintf(`你是一个专业的图像生成提示词专家。请根据提供的镜头信息，生成适合用于AI图像生成的提示词。

重要：这是镜头的尾帧 - 一个静态画面，展示动作结束后的最终状态和结果。

关键要点：
1. 聚焦动作完成后的最终状态
2. 展示动作的结果
3. 描述角色在动作完成后的姿态和表情
4. 强调动作后的情绪状态
5. 捕捉动作结束后的平静瞬间
- **风格要求**：%s
- **图片比例**：%s
输出格式：
返回一个JSON对象，包含：
- prompt：完整的中文图片生成提示词（详细描述，适合AI图像生成）
- description：简化的中文描述（供参考）`, style, imageRatio)
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
func (p *PromptI18n) GetCharacterExtractionPrompt() string {
	style := p.config.Style.DefaultStyle
	imageRatio := p.config.Style.DefaultImageRatio
	if p.IsEnglish() {
		return fmt.Sprintf(`You are a professional character analyst, skilled at extracting and analyzing character information from scripts.

Your task is to extract and organize detailed character settings for all characters appearing in the script based on the provided script content.

Requirements:
1. Extract all characters with names (ignore unnamed passersby or background characters)
2. For each character, extract:
   - name: Character name
   - role: Character role (main/supporting/minor)
   - appearance: Physical appearance description (150-300 words)
   - personality: Personality traits (100-200 words)
   - description: Background story and character relationships (100-200 words)
3. Appearance must be detailed enough for AI image generation, including: gender, age, body type, facial features, hairstyle, clothing style, etc. but do not include any scene, background, environment information
4. Main characters require more detailed descriptions, supporting characters can be simplified
- **Style Requirement**: %s
- **Image Ratio**: %s
Output Format:
**CRITICAL: Return ONLY a valid JSON array. Do NOT include any markdown code blocks, explanations, or other text. Start directly with [ and end with ].**
Each element is a character object containing the above fields.`, style, imageRatio)
	}

	return fmt.Sprintf(`你是一个专业的角色分析师，擅长从剧本中提取和分析角色信息。

你的任务是根据提供的剧本内容，提取并整理剧中出现的所有角色的详细设定。

要求：
1. 提取所有有名字的角色（忽略无名路人或背景角色）
2. 对每个角色，提取以下信息：
   - name: 角色名字
   - role: 角色类型（main/supporting/minor）
   - appearance: 外貌描述（150-300字）
   - personality: 性格特点（100-200字）
   - description: 背景故事和角色关系（100-200字）
3. 外貌描述要足够详细，适合AI生成图片，包括：性别、年龄、体型、面部特征、发型、服装风格等,但不要包含任何场景、背景、环境等信息
4. 主要角色需要更详细的描述，次要角色可以简化
- **风格要求**：%s
- **图片比例**：%s
输出格式：
**重要：必须只返回纯JSON数组，不要包含任何markdown代码块、说明文字或其他内容。直接以 [ 开头，以 ] 结尾。**
每个元素是一个角色对象，包含上述字段。`, style, imageRatio)
}

// GetPropExtractionPrompt 获取道具提取提示词
func (p *PromptI18n) GetPropExtractionPrompt() string {
	style := p.config.Style.DefaultStyle + ", " + p.config.Style.DefaultPropStyle
	imageRatio := p.config.Style.DefaultPropRatio
	if imageRatio == "" {
		imageRatio = p.config.Style.DefaultImageRatio
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

	return `你是一个专业的短剧编剧。你擅长根据分集规划创作详细的剧情内容。

你的任务是根据大纲中的分集规划，将每一集的概要扩展为详细的剧情叙述。每集约180秒（3分钟），需要充实的内容。

要求：
1. 将大纲中的概要扩展为具体的剧情发展
2. 写出角色的对话和动作，不是简单描述
3. 突出冲突的递进和情感的变化
4. 增加场景转换和氛围描写
5. 控制节奏，高潮在2/3处，结尾有收束
6. 每集800-1200字，对话丰富
7. 与角色设定保持一致

输出格式：
**重要：必须只返回纯JSON对象，不要包含任何markdown代码块、说明文字或其他内容。直接以 { 开头，以 } 结尾。**

- episodes: 分集列表，每集包含：
  - episode_number: 集数
  - title: 本集标题
  - script_content: 详细剧本内容（800-1200字）`
}

// FormatUserPrompt 格式化用户提示词的通用文本
func (p *PromptI18n) FormatUserPrompt(key string, args ...interface{}) string {
	style := p.config.Style.DefaultStyle
	imageRatio := p.config.Style.DefaultImageRatio
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
			"drama_info_template":    "Title: %s\nSummary: %s\nGenre: %s" + "\nStyle: " + style + "\nImage ratio: " + imageRatio,
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
			"drama_info_template":    "剧名：%s\n简介：%s\n类型：%s" + "\n风格: " + style + "\n图片比例: " + imageRatio,
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
