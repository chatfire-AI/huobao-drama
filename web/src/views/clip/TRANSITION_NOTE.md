# 转场效果说明

## 当前实现状态

### ✅ 已实现功能
1. **转场设置界面** - 可以点击视频拼接处设置转场效果
2. **转场类型选择** - 支持淡入淡出、溶解、擦除、滑动等类型
3. **转场时长调整** - 可以设置0.3-3秒的转场时长
4. **转场指示器** - 在时间线上显示黄色圆形图标标识转场位置
5. **转场数据保存** - 转场配置保存在片段的 `transition` 属性中

### ⚠️ 未实现功能
**转场效果预览播放** - 转场效果在预览播放时不会呈现

## 为什么转场效果不显示？

转场效果的实际渲染需要**视频处理能力**，这在浏览器中无法直接实现。原因如下：

1. **浏览器限制**
   - HTML5 `<video>` 元素只能播放单个视频源
   - 无法在两个视频之间实时应用转场效果
   - 需要实时视频合成和特效处理能力

2. **技术要求**
   - 转场效果需要同时读取两个视频的帧
   - 需要进行像素级别的混合计算（如淡入淡出、溶解等）
   - 需要实时渲染合成后的视频帧

## 实现转场效果预览的方案

### 方案 1: WebGL/Canvas 实时渲染（复杂）
**优点**: 可以在浏览器中实现
**缺点**: 
- 实现复杂度极高
- 性能开销大
- 需要手动实现每种转场效果的算法

**实现步骤**:
```javascript
// 1. 使用 Canvas 绘制视频帧
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')

// 2. 在转场区域同时绘制两个视频
const video1 = document.createElement('video')
const video2 = document.createElement('video')

// 3. 根据转场类型应用混合算法
if (transition.type === 'fade') {
  // 计算透明度
  const alpha = (currentTime - transitionStart) / transition.duration
  ctx.globalAlpha = 1 - alpha
  ctx.drawImage(video1, 0, 0)
  ctx.globalAlpha = alpha
  ctx.drawImage(video2, 0, 0)
}

// 4. 将 Canvas 作为预览源
previewPlayer.srcObject = canvas.captureStream()
```

### 方案 2: 服务端预渲染（推荐）
**优点**: 
- 效果准确
- 性能好
- 可以使用专业视频处理库

**缺点**: 
- 需要服务端支持
- 预渲染需要时间

**实现步骤**:
1. 用户设置转场效果后，发送到服务端
2. 服务端使用 FFmpeg 预渲染转场效果
3. 返回预览视频 URL
4. 前端播放预渲染的视频

**FFmpeg 转场命令示例**:
```bash
# 淡入淡出转场
ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=1:offset=5[v]" \
  -map "[v]" output.mp4

# 溶解转场
ffmpeg -i video1.mp4 -i video2.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=dissolve:duration=1:offset=5[v]" \
  -map "[v]" output.mp4
```

### 方案 3: 简化预览（快速实现）
**优点**: 实现简单
**缺点**: 效果不完全准确

**实现方式**:
- 在转场位置快速切换视频
- 添加简单的淡入淡出 CSS 动画
- 仅作为参考预览，不是最终效果

## 当前代码中的转场数据结构

```typescript
interface TimelineClip {
  // ... 其他属性
  transition?: {
    type: string      // 'fade' | 'dissolve' | 'wipe' | 'slide' | 'none'
    duration: number  // 转场时长（秒）
  }
}
```

## 导出时如何应用转场？

在导出视频时，转场数据会被传递给后端，后端使用 FFmpeg 应用转场效果：

```go
// 伪代码示例
func ApplyTransition(clip1, clip2 VideoClip, transition Transition) {
    ffmpegCmd := fmt.Sprintf(
        "ffmpeg -i %s -i %s -filter_complex "+
        "[0:v][1:v]xfade=transition=%s:duration=%f:offset=%f[v] "+
        "-map [v] output.mp4",
        clip1.URL, clip2.URL, 
        transition.Type, transition.Duration, clip1.Duration,
    )
    exec.Command("sh", "-c", ffmpegCmd).Run()
}
```

## 建议

对于当前的视频剪辑编辑器：

1. **保持当前实现** - 转场设置界面和数据保存已经完成
2. **添加提示** - 在转场设置对话框中说明"转场效果将在导出时应用"
3. **后续优化** - 如果需要预览，建议使用服务端预渲染方案

## 修改建议

如果要添加转场预览提示，可以在转场对话框中添加：

```vue
<el-dialog v-model="transitionDialogVisible" title="设置转场效果">
  <el-alert 
    type="info" 
    :closable="false"
    style="margin-bottom: 16px"
  >
    转场效果将在导出视频时应用，预览播放时不会显示
  </el-alert>
  <!-- 现有的表单内容 -->
</el-dialog>
```
