import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export interface VideoClip {
  url: string
  startTime: number
  endTime: number
  duration: number
  transition?: TransitionEffect
}

export type TransitionType = 'fade' | 'fadeblack' | 'fadewhite' | 'slideleft' | 'slideright' | 'slideup' | 'slidedown' | 'wipeleft' | 'wiperight' | 'circleopen' | 'circleclose' | 'none'

export interface TransitionEffect {
  type: TransitionType
  duration: number // 转场时长（秒）
}

export interface MergeProgress {
  phase: 'loading' | 'processing' | 'encoding' | 'completed'
  progress: number
  message: string
}

class VideoMerger {
  private ffmpeg: FFmpeg
  private loaded: boolean = false
  private onProgress?: (progress: MergeProgress) => void

  constructor() {
    this.ffmpeg = new FFmpeg()
  }

  async initialize(onProgress?: (progress: MergeProgress) => void) {
    if (this.loaded) return

    this.onProgress = onProgress
    
    this.onProgress?.({
      phase: 'loading',
      progress: 0,
      message: '正在加载FFmpeg引擎（首次需要下载约30MB）...'
    })

    // CDN列表（优先使用国内CDN）
    const cdnList = [
      'https://unpkg.zhimg.com/@ffmpeg/core@0.12.6/dist/esm',        // 知乎CDN镜像（国内）
      'https://npm.elemecdn.com/@ffmpeg/core@0.12.6/dist/esm',       // 饿了么CDN（国内）
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',   // jsDelivr（全球CDN，国内可用）
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',              // unpkg（国外）
    ]
    
    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message)
    })

    this.ffmpeg.on('progress', ({ progress, time }) => {
      this.onProgress?.({
        phase: 'encoding',
        progress: Math.round(progress * 100),
        message: `正在合并视频... ${Math.round(progress * 100)}%`
      })
    })

    // 尝试多个CDN源
    let lastError: Error | null = null
    for (let i = 0; i < cdnList.length; i++) {
      const baseURL = cdnList[i]
      
      try {
        this.onProgress?.({
          phase: 'loading',
          progress: (i / cdnList.length) * 50,
          message: `正在从CDN ${i + 1}/${cdnList.length} 加载FFmpeg...`
        })

        // 添加超时控制
        const loadPromise = this.ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('加载超时')), 60000) // 60秒超时
        })

        await Promise.race([loadPromise, timeoutPromise])
        
        // 加载成功
        this.loaded = true
        
        this.onProgress?.({
          phase: 'loading',
          progress: 100,
          message: 'FFmpeg加载完成'
        })
        
        return
      } catch (error) {
        console.error(`CDN ${i + 1} 加载失败:`, error)
        lastError = error as Error
        
        if (i < cdnList.length - 1) {
          this.onProgress?.({
            phase: 'loading',
            progress: ((i + 1) / cdnList.length) * 50,
            message: `CDN ${i + 1} 失败，尝试备用源...`
          })
        }
      }
    }

    // 所有CDN都失败
    throw new Error(`FFmpeg加载失败: ${lastError?.message || '未知错误'}。请检查网络连接或稍后重试。`)
  }

  async mergeVideos(clips: VideoClip[]): Promise<Blob> {
    if (!this.loaded) {
      await this.initialize(this.onProgress)
    }

    if (clips.length === 0) {
      throw new Error('没有视频片段')
    }

    this.onProgress?.({
      phase: 'processing',
      progress: 0,
      message: '正在下载视频片段...'
    })

    // 并行下载所有视频文件
    this.onProgress?.({
      phase: 'processing',
      progress: 0,
      message: `正在下载 ${clips.length} 个视频片段...`
    })

    const downloadPromises = clips.map((clip, i) => 
      fetchFile(clip.url).then(data => ({ index: i, data }))
    )
    
    const downloads = await Promise.all(downloadPromises)
    
    this.onProgress?.({
      phase: 'processing',
      progress: 30,
      message: '下载完成，正在处理视频...'
    })

    // 写入文件系统并处理
    const inputFiles: string[] = []
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const download = downloads.find(d => d.index === i)!
      const inputFileName = `input${i}.mp4`
      const outputFileName = `clip${i}.mp4`
      
      // 写入原始视频
      await this.ffmpeg.writeFile(inputFileName, download.data)

      // 如果需要裁剪，先裁剪视频
      if (clip.startTime > 0 || clip.endTime < clip.duration) {
        this.onProgress?.({
          phase: 'processing',
          progress: Math.round(30 + (i / clips.length) * 20),
          message: `正在裁剪视频片段 ${i + 1}/${clips.length}...`
        })

        await this.ffmpeg.exec([
          '-i', inputFileName,
          '-ss', clip.startTime.toString(),
          '-t', (clip.endTime - clip.startTime).toString(),
          '-c', 'copy',
          outputFileName
        ])
        
        inputFiles.push(outputFileName)
        await this.ffmpeg.deleteFile(inputFileName)
      } else {
        inputFiles.push(inputFileName)
      }
    }

    this.onProgress?.({
      phase: 'processing',
      progress: 50,
      message: '正在准备合并...'
    })

    // 检查是否有转场效果
    const hasTransitions = clips.some(clip => clip.transition && clip.transition.type !== 'none')

    if (!hasTransitions || clips.length === 1) {
      // 没有转场效果，使用简单的concat方式（更快）
      const concatContent = inputFiles.map(f => `file '${f}'`).join('\n')
      await this.ffmpeg.writeFile('concat.txt', concatContent)

      this.onProgress?.({
        phase: 'encoding',
        progress: 0,
        message: '正在合并视频...'
      })

      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        '-c', 'copy',
        '-movflags', '+faststart',
        'output.mp4'
      ])
    } else {
      // 有转场效果，使用filter_complex（需要重新编码）
      this.onProgress?.({
        phase: 'encoding',
        progress: 0,
        message: '正在添加转场效果并合并视频（这需要较长时间）...'
      })

      await this.mergeWithTransitions(inputFiles, clips)
    }

    this.onProgress?.({
      phase: 'completed',
      progress: 90,
      message: '正在生成最终文件...'
    })

    // 读取输出文件
    const data = await this.ffmpeg.readFile('output.mp4')
    const blob = new Blob([data as BlobPart], { type: 'video/mp4' })

    // 清理临时文件
    for (const file of inputFiles) {
      await this.ffmpeg.deleteFile(file)
    }
    await this.ffmpeg.deleteFile('concat.txt')
    await this.ffmpeg.deleteFile('output.mp4')

    this.onProgress?.({
      phase: 'completed',
      progress: 100,
      message: '合并完成！'
    })

    return blob
  }

  private async mergeWithTransitions(inputFiles: string[], clips: VideoClip[]) {
    // 构建FFmpeg filter_complex命令
    const filterParts: string[] = []
    const inputs: string[] = []
    
    // 为每个输入添加标签
    for (let i = 0; i < inputFiles.length; i++) {
      inputs.push('-i', inputFiles[i])
      filterParts.push(`[${i}:v]setpts=PTS-STARTPTS[v${i}]`)
      filterParts.push(`[${i}:a]asetpts=PTS-STARTPTS[a${i}]`)
    }
    
    // 构建转场链
    let videoChain = 'v0'
    let audioChain = 'a0'
    
    for (let i = 1; i < clips.length; i++) {
      const transition = clips[i].transition
      const transType = transition?.type || 'fade'
      const transDuration = transition?.duration || 1.0
      
      const offset = clips.slice(0, i).reduce((sum, c) => sum + c.duration, 0) - transDuration
      
      // 视频转场
      const xfadeFilter = this.getXfadeFilter(transType, transDuration, offset)
      filterParts.push(`[${videoChain}][v${i}]${xfadeFilter}[v${i}out]`)
      videoChain = `v${i}out`
      
      // 音频交叉淡入淡出
      filterParts.push(`[${audioChain}][a${i}]acrossfade=d=${transDuration}:c1=tri:c2=tri[a${i}out]`)
      audioChain = `a${i}out`
    }
    
    const filterComplex = filterParts.join(';')
    
    // 执行FFmpeg命令
    await this.ffmpeg.exec([
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', `[${videoChain}]`,
      '-map', `[${audioChain}]`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      'output.mp4'
    ])
  }
  
  private getXfadeFilter(type: TransitionType, duration: number, offset: number): string {
    const xfadeTypes: Record<string, string> = {
      'fade': 'fade',
      'fadeblack': 'fadeblack',
      'fadewhite': 'fadewhite',
      'slideleft': 'slideleft',
      'slideright': 'slideright',
      'slideup': 'slideup',
      'slidedown': 'slidedown',
      'wipeleft': 'wipeleft',
      'wiperight': 'wiperight',
      'circleopen': 'circleopen',
      'circleclose': 'circleclose'
    }
    
    const xfadeType = xfadeTypes[type] || 'fade'
    return `xfade=transition=${xfadeType}:duration=${duration}:offset=${offset}`
  }

  async terminate() {
    if (this.loaded) {
      this.ffmpeg.terminate()
      this.loaded = false
    }
  }
}

export const videoMerger = new VideoMerger()
