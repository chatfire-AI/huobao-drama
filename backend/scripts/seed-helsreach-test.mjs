import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(here, '../../data/huobao_drama.db')
const db = new Database(dbPath)

const dramaId = 1
const episodeId = 1
const timestamp = new Date().toISOString()

const script = `《赫尔斯里奇》10秒电影化测试

00:00—00:02.5　外景·赫尔斯里奇蜂巢城·战时黄昏
黑云压住整座蜂巢城。镜头贴着燃烧的防空塔高速俯冲，一枚炮弹擦过镜头，在下方街区炸开。爆炸冲击让画面突然失焦。

00:02.5—00:06.5　外景·帝皇升天神殿防线
碎石遮住前景。镜头从坍塌墙体后横移，格里马尔杜斯背对镜头踏上防线；黑色圣堂战士从烟尘中冲过。近处爆炸迫使镜头急停、下沉，再重新捕捉主体。

00:06.5—00:10　神殿防线·格里马尔杜斯近景
低机位三分之二侧面。火光扫过骷髅面具和黑色动力甲。格里马尔杜斯缓慢转头。
格里马尔杜斯：“我将死在这个世界上。”
最后一个字落下时重炮命中，画面切黑。`

const scenePrompt = `Warhammer 40,000 Helsreach, Temple of the Emperor Ascendant defensive line on Armageddon, Chaplain Grimaldus and Black Templars, colossal gothic hive-city architecture, burning manufactorums, dense black smoke, artillery fire and collapsing masonry, brutal monochrome charcoal palette with restrained crimson fire and blood accents, realistic live-action war cinematography, vertical 9:16 composition, foreground rubble occlusion, asymmetric framing, harsh moving light, volumetric ash, no text, no logo, no watermark`

const character = {
  name: '格里马尔杜斯',
  role: '黑色圣堂牧师／主角',
  description: '赫尔斯里奇防卫战中的黑色圣堂牧师，沉默、克制，以近乎宿命的意志统率守军。',
  appearance: '黑色重型动力甲，骨白色骷髅面具，胸前锁链与圣物，破损黑色罩袍，甲面沾满灰尘和干涸血迹；高大、沉重、具有压迫感。',
  personality: '冷峻、虔诚、愤怒被严格压制；说话低沉缓慢，在关键字上爆发。',
  voiceStyle: 'Chinese (Mandarin)_Deep_Voice_Man',
  voiceProvider: 'minimax',
}

const shots = [
  {
    number: 1,
    title: '蜂巢城俯冲',
    shotType: '超广角建立镜头',
    angle: '高空俯拍转贴地掠过',
    movement: '高速俯冲，炮弹擦镜后突然震偏并短暂失焦',
    action: '黑云覆盖赫尔斯里奇，防空塔燃烧，炮弹在街区爆炸。',
    result: '爆炸冲击将镜头甩向神殿防线。',
    atmosphere: '末日工业、失控、规模压迫',
    imagePrompt: 'Vertical 9:16 cinematic first frame, Helsreach hive city under siege at dusk, camera diving beside a burning gothic anti-air tower, colossal industrial spires disappearing into black smoke, asymmetric composition, foreground steel beams slicing across frame, tiny artillery flashes far below, charcoal monochrome with restrained red-orange fire, photoreal live-action war film, deep atmospheric perspective, no text, no logo, no watermark',
    videoPrompt: '2.5-second cinematic shot. Camera dives violently past the burning anti-air tower with real mass and wind resistance; foreground beams whip past at different speeds. A shell crosses close to lens and detonates below, producing a hard shockwave, abrupt camera yaw, rolling shutter vibration and momentary focus loss. No smooth drone motion, no centered weapon, no game camera.',
    dialogue: '环境音：防空炮、风压、远处重炮',
    soundEffect: '呼啸风压；炮弹擦镜；近距离爆炸；金属结构呻吟',
    duration: 2.5,
  },
  {
    number: 2,
    title: '牧师踏上防线',
    shotType: '中广角跟拍',
    angle: '低机位后侧三分之二',
    movement: '碎石前景后横移跟拍，爆炸时急停下沉，再甩镜找回主体',
    action: '格里马尔杜斯背对镜头踏上神殿防线，黑色圣堂战士从烟尘中冲过。',
    result: '镜头在混乱中重新锁定格里马尔杜斯的侧面轮廓。',
    atmosphere: '窒息、沉重、临战爆发',
    imagePrompt: 'Vertical 9:16 live-action war film frame, Chaplain Grimaldus seen from low rear three-quarter angle stepping through a breached wall onto the Temple of the Emperor Ascendant defensive line, massive black power armor, skull mask partly visible, chains and torn tabard, Black Templars rushing through dense ash behind him, foreground rubble blocks one third of frame, off-center subject, hard artillery backlight, monochrome charcoal with dark crimson accents, realistic weight and grime, no text, no logo, no watermark',
    videoPrompt: '4-second handheld cinematic tracking shot with human camera behavior. Slide laterally from behind foreground rubble as Grimaldus takes two heavy steps forward; every footfall shifts armor weight and makes chains react. Marines rush across near foreground, briefly occluding him. A close impact forces an involuntary stop, camera duck and dirty whip-pan before recovering his silhouette. Uneven rhythm, no centered composition, no videogame movement.',
    dialogue: '环境音：装甲脚步、急促呼吸、近处爆炸',
    soundEffect: '沉重装甲脚步；碎石坠落；爆炸耳鸣；战士冲锋',
    duration: 4,
  },
  {
    number: 3,
    title: '宿命宣言',
    shotType: '近景转大特写',
    angle: '低机位三分之二侧面',
    movement: '先静止压迫，缓慢推近；重炮命中瞬间硬切黑',
    action: '移动火光扫过骷髅面具。格里马尔杜斯缓慢转头，说出宿命宣言。',
    result: '最后一个字落下，重炮命中，画面黑场。',
    atmosphere: '克制、宿命、突然爆发',
    imagePrompt: 'Vertical 9:16 extreme cinematic portrait of Chaplain Grimaldus, low-angle three-quarter profile, bone-white skull mask emerging from near-black smoke, battered black power armor and sacred chains, one moving strip of crimson firelight across the mask, foreground ash and a blurred broken weapon partially occluding lower frame, eyes hidden in deep shadow, brutal charcoal monochrome, realistic live-action texture, shallow depth of field, no text, no logo, no watermark',
    videoPrompt: '3.5-second dramatic close shot. Hold almost still for one beat with subtle handheld breathing and drifting ash, then make a slow heavy push toward Grimaldus as moving firelight reveals the skull mask. He turns only a few degrees, controlled and deliberate. On the final word, an artillery impact creates one violent frame of white-orange light and debris, then immediate hard cut to black. No lip-sync close-up, no smooth orbit, no game camera.',
    dialogue: '格里马尔杜斯：我将死在这个世界上。',
    soundEffect: '低频战场轰鸣；面具内呼吸；末尾重炮命中后瞬间静音',
    duration: 3.5,
  },
]

const run = db.transaction(() => {
  const drama = db.prepare('SELECT id FROM dramas WHERE id = ? AND deleted_at IS NULL').get(dramaId)
  const episode = db.prepare('SELECT id FROM episodes WHERE id = ? AND drama_id = ? AND deleted_at IS NULL').get(episodeId, dramaId)
  if (!drama || !episode) throw new Error('Project 1 or episode 1 does not exist')

  db.prepare(`
    UPDATE episodes
    SET title = ?, description = ?, content = ?, script_content = ?, duration = ?, updated_at = ?
    WHERE id = ?
  `).run(
    '第1集｜蜂巢城降临',
    '《赫尔斯里奇》10秒第三人称电影化样片：三镜头，竖屏，24fps。',
    script,
    script,
    10,
    timestamp,
    episodeId,
  )

  let characterRow = db.prepare('SELECT id FROM characters WHERE drama_id = ? AND name = ? AND deleted_at IS NULL').get(dramaId, character.name)
  if (characterRow) {
    db.prepare(`
      UPDATE characters
      SET role = ?, description = ?, appearance = ?, personality = ?, voice_style = ?, voice_provider = ?, updated_at = ?
      WHERE id = ?
    `).run(character.role, character.description, character.appearance, character.personality, character.voiceStyle, character.voiceProvider, timestamp, characterRow.id)
  } else {
    const result = db.prepare(`
      INSERT INTO characters
      (drama_id, name, role, description, appearance, personality, voice_style, voice_provider, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(dramaId, character.name, character.role, character.description, character.appearance, character.personality, character.voiceStyle, character.voiceProvider, timestamp, timestamp)
    characterRow = { id: Number(result.lastInsertRowid) }
  }

  db.prepare('INSERT OR IGNORE INTO episode_characters (episode_id, character_id, created_at) VALUES (?, ?, ?)')
    .run(episodeId, characterRow.id, timestamp)

  let sceneRow = db.prepare('SELECT id FROM scenes WHERE drama_id = ? AND location = ? AND time = ? AND deleted_at IS NULL')
    .get(dramaId, '帝皇升天神殿与赫尔斯里奇蜂巢城防线', '战时黄昏')
  if (sceneRow) {
    db.prepare('UPDATE scenes SET episode_id = ?, prompt = ?, storyboard_count = ?, updated_at = ? WHERE id = ?')
      .run(episodeId, scenePrompt, shots.length, timestamp, sceneRow.id)
  } else {
    const result = db.prepare(`
      INSERT INTO scenes
      (drama_id, episode_id, location, time, prompt, storyboard_count, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(dramaId, episodeId, '帝皇升天神殿与赫尔斯里奇蜂巢城防线', '战时黄昏', scenePrompt, shots.length, timestamp, timestamp)
    sceneRow = { id: Number(result.lastInsertRowid) }
  }

  db.prepare('INSERT OR IGNORE INTO episode_scenes (episode_id, scene_id, created_at) VALUES (?, ?, ?)')
    .run(episodeId, sceneRow.id, timestamp)

  const oldStoryboardIds = db.prepare('SELECT id FROM storyboards WHERE episode_id = ?').all(episodeId).map(row => row.id)
  const deleteStoryboardCharacters = db.prepare('DELETE FROM storyboard_characters WHERE storyboard_id = ?')
  for (const storyboardId of oldStoryboardIds) deleteStoryboardCharacters.run(storyboardId)
  db.prepare('DELETE FROM storyboards WHERE episode_id = ?').run(episodeId)

  const insertStoryboard = db.prepare(`
    INSERT INTO storyboards
    (episode_id, scene_id, storyboard_number, title, location, time, shot_type, angle, movement,
     action, result, atmosphere, image_prompt, video_prompt, sound_effect, dialogue, duration,
     status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `)
  const linkStoryboardCharacter = db.prepare('INSERT OR IGNORE INTO storyboard_characters (storyboard_id, character_id) VALUES (?, ?)')

  for (const shot of shots) {
    const result = insertStoryboard.run(
      episodeId,
      sceneRow.id,
      shot.number,
      shot.title,
      '帝皇升天神殿与赫尔斯里奇蜂巢城防线',
      '战时黄昏',
      shot.shotType,
      shot.angle,
      shot.movement,
      shot.action,
      shot.result,
      shot.atmosphere,
      shot.imagePrompt,
      shot.videoPrompt,
      shot.soundEffect,
      shot.dialogue,
      shot.duration,
      timestamp,
      timestamp,
    )
    if (shot.number > 1) linkStoryboardCharacter.run(Number(result.lastInsertRowid), characterRow.id)
  }

  db.prepare('UPDATE dramas SET total_duration = ?, updated_at = ? WHERE id = ?').run(10, timestamp, dramaId)

  return {
    drama_id: dramaId,
    episode_id: episodeId,
    character_id: characterRow.id,
    scene_id: sceneRow.id,
    shots: shots.length,
    duration_seconds: shots.reduce((sum, shot) => sum + shot.duration, 0),
  }
})

try {
  const result = run()
  console.log(JSON.stringify(result))
} finally {
  db.close()
}
