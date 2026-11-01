/** Shared by first-time breakdown and single/batch video prompt generation.
 * Inject at runtime so existing/custom desktop prompt files also see the voice contract.
 */
const instructions: Record<string, string> = {
  zh: `## 视频提示词中的角色音色引用
- read_storyboard_context 的角色提供 has_voice 与 voice_reference；已有分镜提供 available_voice_references。只有 has_voice 为 true 的角色才有可用音色。
- 为某个分镜生成或重写 video_prompt 时，只使用该分镜 available_voice_references 中的音色；首次拆分时，只使用本段 character_ids 对应角色的 voice_reference。
- 先从 description 的台词确定说话角色。画面动作使用 @角色名；有台词且有可用音色时，在对应对白的说话人位置直接使用 #角色名，紧接语气、发声动作与台词。例如：0-3秒：@林小雨抬头，#林小雨轻声说：「早上好。」
- 音色引用必须与对白写在同一个时间段内，不新增独立的「音色：」信息头。每次对白都明确标出自己的 #说话人；多人对话逐句对应，不能把所有音色集中列在开头。
- 直接复制 voice_reference 的完整值（如 #林小雨），禁止改名、缩写、翻译或追加“音色”后缀。@角色名引用形象，#角色名引用音色，两者分别放在画面动作与发声位置。
- 没有上传音色的角色、未绑定角色、已移除音色和不说话的角色，不添加 # 引用。旁白只有明确对应某个已绑定、已有音色的角色时才可引用，不借用其他角色的音色。
- 音频仅用于参考音色，台词内容与说话时机遵循 description；不要为了使用音色新增台词、人物或镜头。
- 保存前检查 @图片引用、#音色引用和说话角色的对应关系。video_prompt 中保留原始 #角色名 标签，不写音频 URL、Base64、音频1 等上游编号；编号由视频生成接口自动映射。`,
  en: `## Character voice references in video_prompt
- read_storyboard_context provides has_voice and voice_reference for each character, plus available_voice_references for each existing storyboard.
- For an existing shot, use only its available_voice_references. During initial breakdown, use only voice_reference values belonging to this segment's character_ids.
- Identify speakers from description. Use @CharacterName for visual actions and #CharacterName directly as the speaker before delivery and dialogue, e.g. "0-3s: @Alex looks up; #Alex softly says: 'Good morning.'"
- Keep voice references inline with each utterance in its time segment. Do not add a separate voice header or collect all voices at the start. Mark the correct #speaker for every utterance, including repeated speakers and multi-person dialogue.
- Copy voice_reference exactly (e.g. #Alex). Do not translate, abbreviate or add a suffix. @CharacterName is the image; #CharacterName is the voice.
- Do not add # references for unbound characters, missing/removed uploads, or silent characters. Narration may use a voice only when its speaker is explicitly a bound character with that voice; never borrow another character's voice.
- Reference audio supplies timbre only: preserve the original dialogue and timing from description, and do not add dialogue, characters or shots just to use a voice.
- Before saving, check speaker/image/voice bindings. Save the original #CharacterName tokens, never audio URLs, Base64 or provider audio numbers; video generation resolves the indices.`,
  ja: `## video_prompt のキャラクター音声参照
- read_storyboard_context は各キャラクターの has_voice と voice_reference、既存ショットの available_voice_references を返す。
- 既存ショットではその available_voice_references のみ使用する。初回分割では、その段落の character_ids に含まれるキャラクターの voice_reference のみ使用する。
- description のセリフから話者を確認する。画面の動作は @名前、音声がある話者の発声は #名前 を直接使う。例：「0-3秒：@太郎が顔を上げ、#太郎が優しく『おはよう』と言う。」
- 音声参照は各時間帯のセリフ内に記載する。独立した音声ヘッダーを追加せず、冒頭に音声をまとめない。発話ごとに正しい #話者 を指定する。
- voice_reference（例：#太郎）を完全一致でコピーし、翻訳・省略・接尾辞の追加をしない。@名前 は画像、#名前 は音声の参照。
- 未紐付け・未アップロード・削除済み音声・無言の人物には # 参照を付けない。ナレーションは話者が音声付きの紐付け済みキャラクターと明示されている場合のみ参照し、別人の声を流用しない。
- 音声は声質の参照のみ。description のセリフと発話タイミングを守り、音声を使うためのセリフ・人物・カットを追加しない。
- 保存前に話者・画像・音声の対応を確認する。video_prompt には元の #名前 を保存し、音声URL、Base64、音声番号を書かない。番号への変換は動画生成側が行う。`,
  ko: `## video_prompt의 캐릭터 음색 참조
- read_storyboard_context는 캐릭터별 has_voice와 voice_reference, 기존 샷별 available_voice_references를 제공한다.
- 기존 샷은 해당 available_voice_references만 사용한다. 최초 분할은 해당 구간 character_ids에 속하는 캐릭터의 voice_reference만 사용한다.
- description의 대사에서 화자를 확인한다. 화면 동작은 @이름, 음색이 있는 화자의 발화는 #이름을 직접 사용한다. 예: "0-3초: @민수가 고개를 들고, #민수가 부드럽게 '안녕'이라고 말한다."
- 각 시간 구간의 대사 안에 음색 참조를 넣는다. 별도의 음색 헤더를 추가하거나 처음에 음색을 모아 쓰지 않는다. 대사마다 정확한 #화자를 표시한다.
- voice_reference(예: #민수)를 그대로 복사한다. 번역, 축약, 접미사 추가를 하지 않는다. @이름은 이미지, #이름은 음색 참조다.
- 미연결 캐릭터, 미업로드/삭제된 음색, 말하지 않는 캐릭터에는 # 참조를 추가하지 않는다. 내레이션은 화자가 음색이 있는 연결 캐릭터로 명시된 경우에만 참조하며 다른 캐릭터의 음색을 빌리지 않는다.
- 오디오는 음색만 참고한다. description의 대사와 발화 시점을 유지하고 음색 사용을 위해 대사, 인물, 샷을 추가하지 않는다.
- 저장 전 화자/이미지/음색 연결을 확인한다. video_prompt에는 원래 #이름 토큰을 저장한다. 오디오 URL, Base64, 공급자 오디오 번호는 쓰지 않는다. 번호 변환은 영상 생성 단계에서 수행한다.`,
}

export function getVoiceReferenceInstructions(agentType: string, language?: string | null): string {
  if (agentType !== 'prompt_generator' && agentType !== 'storyboard_breaker') return ''
  return instructions[language || 'zh'] || instructions.zh
}
