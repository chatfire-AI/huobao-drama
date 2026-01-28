package ffmpeg

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/drama-generator/backend/pkg/logger"
)

type FFmpeg struct {
	log     *logger.Logger
	tempDir string
}

func NewFFmpeg(log *logger.Logger) *FFmpeg {
	tempDir := filepath.Join(os.TempDir(), "drama-video-merge")
	os.MkdirAll(tempDir, 0755)

	return &FFmpeg{
		log:     log,
		tempDir: tempDir,
	}
}

type VideoClip struct {
	URL        string
	Duration   float64
	StartTime  float64
	EndTime    float64
	Transition map[string]interface{}
}

type MergeOptions struct {
	OutputPath string
	Clips      []VideoClip
}

func (f *FFmpeg) MergeVideos(opts *MergeOptions) (string, error) {
	if len(opts.Clips) == 0 {
		return "", fmt.Errorf("no video clips to merge")
	}

	f.log.Infow("Starting video merge with trimming", "clips_count", len(opts.Clips))

	// 下载并裁剪所有视频片段
	trimmedPaths := make([]string, 0, len(opts.Clips))
	downloadedPaths := make([]string, 0, len(opts.Clips))

	for i, clip := range opts.Clips {
		// 下载原始视频
		downloadPath := filepath.Join(f.tempDir, fmt.Sprintf("download_%d_%d.mp4", time.Now().Unix(), i))
		localPath, err := f.downloadVideo(clip.URL, downloadPath)
		if err != nil {
			f.cleanup(downloadedPaths)
			f.cleanup(trimmedPaths)
			return "", fmt.Errorf("failed to download clip %d: %w", i, err)
		}
		downloadedPaths = append(downloadedPaths, localPath)

		// 裁剪视频片段（根据StartTime和EndTime）
		trimmedPath := filepath.Join(f.tempDir, fmt.Sprintf("trimmed_%d_%d.mp4", time.Now().Unix(), i))
		err = f.trimVideo(localPath, trimmedPath, clip.StartTime, clip.EndTime)
		if err != nil {
			f.cleanup(downloadedPaths)
			f.cleanup(trimmedPaths)
			return "", fmt.Errorf("failed to trim clip %d: %w", i, err)
		}
		trimmedPaths = append(trimmedPaths, trimmedPath)

		f.log.Infow("Clip trimmed",
			"index", i,
			"start", clip.StartTime,
			"end", clip.EndTime,
			"duration", clip.EndTime-clip.StartTime)
	}

	// 清理下载的原始文件
	f.cleanup(downloadedPaths)

	// 确保输出目录存在
	outputDir := filepath.Dir(opts.OutputPath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		f.cleanup(trimmedPaths)
		return "", fmt.Errorf("failed to create output directory: %w", err)
	}

	// 合并裁剪后的视频片段（支持转场效果）
	err := f.concatenateVideosWithTransitions(trimmedPaths, opts.Clips, opts.OutputPath)

	// 清理裁剪后的临时文件
	f.cleanup(trimmedPaths)

	if err != nil {
		return "", fmt.Errorf("failed to concatenate videos: %w", err)
	}

	f.log.Infow("Video merge completed", "output", opts.OutputPath)
	return opts.OutputPath, nil
}

func (f *FFmpeg) downloadVideo(url, destPath string) (string, error) {
	// 检查是否是本地文件路径
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		// 这是本地文件路径，检查文件是否存在
		if _, err := os.Stat(url); err == nil {
			f.log.Infow("Copying local video file to temp", "source", url, "dest", destPath)
			// 复制本地文件到临时目录，避免删除原始文件
			sourceFile, err := os.Open(url)
			if err != nil {
				return "", fmt.Errorf("failed to open source file: %w", err)
			}
			defer sourceFile.Close()

			destFile, err := os.Create(destPath)
			if err != nil {
				return "", fmt.Errorf("failed to create dest file: %w", err)
			}
			defer destFile.Close()

			_, err = io.Copy(destFile, sourceFile)
			if err != nil {
				return "", fmt.Errorf("failed to copy file: %w", err)
			}

			return destPath, nil
		} else {
			return "", fmt.Errorf("local file not found: %s", url)
		}
	}

	// 远程 URL，需要下载
	f.log.Infow("Downloading video", "url", url, "dest", destPath)

	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("bad status: %s", resp.Status)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return destPath, nil
}

func (f *FFmpeg) trimVideo(inputPath, outputPath string, startTime, endTime float64) error {
	f.log.Infow("Trimming video",
		"input", inputPath,
		"output", outputPath,
		"start", startTime,
		"end", endTime)

	// 如果startTime和endTime都为0，或者endTime <= startTime，复制整个视频
	// 使用重新编码而非-c copy以确保输出文件完整性
	if (startTime == 0 && endTime == 0) || endTime <= startTime {
		f.log.Infow("No valid trim range, re-encoding entire video")

		cmd := exec.Command("ffmpeg",
			"-i", inputPath,
			"-c:v", "libx264",
			"-preset", "fast",
			"-crf", "23",
			"-c:a", "aac",
			"-b:a", "128k",
			"-movflags", "+faststart",
			"-y",
			outputPath,
		)

		output, err := cmd.CombinedOutput()
		if err != nil {
			f.log.Errorw("FFmpeg re-encode failed", "error", err, "output", string(output))
			return fmt.Errorf("ffmpeg re-encode failed: %w, output: %s", err, string(output))
		}

		f.log.Infow("Video re-encoded successfully", "output", outputPath)
		return nil
	}

	// 使用FFmpeg裁剪视频
	// -ss: 开始时间（秒）
	// -to/-t: 结束时间或持续时间
	// 使用重新编码而非-c copy以确保输出文件完整性，避免Windows环境下流信息丢失
	var cmd *exec.Cmd
	if endTime > 0 {
		// 有明确的结束时间
		cmd = exec.Command("ffmpeg",
			"-i", inputPath,
			"-ss", fmt.Sprintf("%.2f", startTime),
			"-to", fmt.Sprintf("%.2f", endTime),
			"-c:v", "libx264",
			"-preset", "fast",
			"-crf", "23",
			"-c:a", "aac",
			"-b:a", "128k",
			"-movflags", "+faststart",
			"-y",
			outputPath,
		)
	} else {
		// 只有开始时间，裁剪到视频末尾
		cmd = exec.Command("ffmpeg",
			"-i", inputPath,
			"-ss", fmt.Sprintf("%.2f", startTime),
			"-c:v", "libx264",
			"-preset", "fast",
			"-crf", "23",
			"-c:a", "aac",
			"-b:a", "128k",
			"-movflags", "+faststart",
			"-y",
			outputPath,
		)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Errorw("FFmpeg trim failed", "error", err, "output", string(output))
		return fmt.Errorf("ffmpeg trim failed: %w, output: %s", err, string(output))
	}

	f.log.Infow("Video trimmed successfully", "output", outputPath)
	return nil
}

func (f *FFmpeg) concatenateVideosWithTransitions(inputPaths []string, clips []VideoClip, outputPath string) error {
	if len(inputPaths) == 0 {
		return fmt.Errorf("no input paths")
	}

	// 如果只有一个视频，直接复制
	if len(inputPaths) == 1 {
		f.log.Infow("Only one clip, copying directly")
		return f.copyFile(inputPaths[0], outputPath)
	}

	// 检查是否有转场效果
	hasTransitions := false
	for _, clip := range clips {
		if clip.Transition != nil && len(clip.Transition) > 0 {
			hasTransitions = true
			break
		}
	}

	// 如果没有转场效果，使用简单拼接
	if !hasTransitions {
		f.log.Infow("No transitions, using simple concatenation")
		return f.concatenateVideos(inputPaths, outputPath)
	}

	// 使用xfade滤镜添加转场效果
	f.log.Infow("Merging with transitions", "clips_count", len(inputPaths))
	return f.mergeWithXfade(inputPaths, clips, outputPath)
}

func (f *FFmpeg) concatenateVideos(inputPaths []string, outputPath string) error {
	// 创建文件列表
	listFile := filepath.Join(f.tempDir, fmt.Sprintf("filelist_%d.txt", time.Now().Unix()))
	defer os.Remove(listFile)

	var content strings.Builder
	for _, path := range inputPaths {
		content.WriteString(fmt.Sprintf("file '%s'\n", path))
	}

	if err := os.WriteFile(listFile, []byte(content.String()), 0644); err != nil {
		return fmt.Errorf("failed to create file list: %w", err)
	}

	// 使用FFmpeg合并视频
	// -f concat: 使用concat demuxer
	// -safe 0: 允许不安全的文件路径
	// -i: 输入文件列表
	// -c copy: 直接复制流，不重新编码（速度快）
	cmd := exec.Command("ffmpeg",
		"-f", "concat",
		"-safe", "0",
		"-i", listFile,
		"-c", "copy",
		"-y", // 覆盖输出文件
		outputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Errorw("FFmpeg failed", "error", err, "output", string(output))
		return fmt.Errorf("ffmpeg execution failed: %w, output: %s", err, string(output))
	}

	f.log.Infow("FFmpeg concatenation completed", "output", outputPath)
	return nil
}

func (f *FFmpeg) mergeWithXfade(inputPaths []string, clips []VideoClip, outputPath string) error {
	// 使用xfade滤镜进行转场
	// 构建输入参数
	args := []string{}
	for _, path := range inputPaths {
		args = append(args, "-i", path)
	}

	// 检测每个视频是否有音频流
	audioStreams := make([]bool, len(inputPaths))
	hasAnyAudio := false
	for i, path := range inputPaths {
		audioStreams[i] = f.hasAudioStream(path)
		if audioStreams[i] {
			hasAnyAudio = true
		}
		f.log.Infow("Audio stream detection", "index", i, "path", path, "has_audio", audioStreams[i])
	}
	f.log.Infow("Overall audio detection", "has_any_audio", hasAnyAudio, "audio_streams", audioStreams)

	// 检测视频分辨率，找到最大分辨率作为目标分辨率
	maxWidth := 0
	maxHeight := 0
	for i, path := range inputPaths {
		width, height := f.getVideoResolution(path)
		if width > maxWidth {
			maxWidth = width
		}
		if height > maxHeight {
			maxHeight = height
		}
		f.log.Infow("Video resolution detection", "index", i, "width", width, "height", height)
	}
	f.log.Infow("Target resolution", "width", maxWidth, "height", maxHeight)

	// 为每个视频流添加缩放滤镜，统一分辨率
	// 同时为有转场的视频添加 tpad 延长（freeze 最后一帧）
	var scaleFilters []string
	for i := 0; i < len(inputPaths); i++ {
		// 检查当前视频是否需要转场到下一个视频
		var tpadDuration float64 = 0
		if i < len(clips)-1 && clips[i].Transition != nil {
			// 检查转场类型
			if tType, ok := clips[i].Transition["type"].(string); ok {
				// none 转场不需要 tpad
				if strings.ToLower(tType) != "none" && tType != "" {
					if tDuration, ok := clips[i].Transition["duration"].(float64); ok && tDuration > 0 {
						tpadDuration = tDuration
					} else {
						tpadDuration = 1.0 // 默认1秒
					}
				}
			} else {
				// 没有指定类型，默认需要转场
				if tDuration, ok := clips[i].Transition["duration"].(float64); ok && tDuration > 0 {
					tpadDuration = tDuration
				} else {
					tpadDuration = 1.0
				}
			}
		}

		// 使用scale滤镜缩放到目标分辨率，pad添加黑边保持长宽比
		// 如果需要转场，使用 tpad 延长视频（freeze最后一帧）
		if tpadDuration > 0 {
			scaleFilters = append(scaleFilters,
				fmt.Sprintf("[%d:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,tpad=stop_mode=clone:stop_duration=%.2f[v%d]",
					i, maxWidth, maxHeight, maxWidth, maxHeight, tpadDuration, i))
			f.log.Infow("Adding tpad to video", "index", i, "duration", tpadDuration)
		} else {
			scaleFilters = append(scaleFilters,
				fmt.Sprintf("[%d:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2[v%d]",
					i, maxWidth, maxHeight, maxWidth, maxHeight, i))
		}
	}

	// 构建filter_complex
	// 检查是否有任何转场效果
	hasAnyTransition := false
	for i := 0; i < len(inputPaths)-1; i++ {
		if clips[i].Transition != nil {
			if tType, ok := clips[i].Transition["type"].(string); ok {
				if strings.ToLower(tType) != "none" && tType != "" {
					hasAnyTransition = true
					break
				}
			}
		}
	}

	// 如果没有任何转场，使用简单拼接
	if !hasAnyTransition {
		f.log.Infow("No transitions detected, using simple concatenation")
		return f.concatenateVideos(inputPaths, outputPath)
	}

	// 构建转场滤镜，使用缩放后的视频流
	// 对所有相邻视频都应用 xfade，type=none 时使用 0 秒时长实现无缝拼接
	var transitionFilters []string
	var offset float64 = 0

	for i := 0; i < len(inputPaths)-1; i++ {
		// 获取当前片段的时长
		clipDuration := clips[i].Duration
		if clips[i].EndTime > 0 && clips[i].StartTime >= 0 {
			clipDuration = clips[i].EndTime - clips[i].StartTime
		}

		// 默认转场参数
		transitionType := "fade"
		transitionDuration := 1.0

		if clips[i].Transition != nil {
			if tType, ok := clips[i].Transition["type"].(string); ok {
				if strings.ToLower(tType) == "none" || tType == "" {
					// none 转场使用 0 秒时长，实现无缝拼接
					transitionDuration = 0.0
					f.log.Infow("Using no transition (0s xfade)", "clip_index", i)
				} else {
					transitionType = f.mapTransitionType(tType)
					f.log.Infow("Using transition type", "type", tType, "mapped", transitionType)
				}
			}
			// 只有非 none 转场才读取时长
			if transitionDuration > 0 {
				if tDuration, ok := clips[i].Transition["duration"].(float64); ok && tDuration > 0 {
					transitionDuration = tDuration
				}
			}
		}

		// 计算转场开始的时间点
		offset += clipDuration
		if offset < 0 {
			offset = 0
		}

		f.log.Infow("Transition settings",
			"clip_index", i,
			"type", transitionType,
			"duration", transitionDuration,
			"offset", offset,
			"clip_duration", clipDuration)

		var inputLabel, outputLabel string
		if i == 0 {
			inputLabel = fmt.Sprintf("[v0][v1]")
		} else {
			inputLabel = fmt.Sprintf("[vx%02d][v%d]", i-1, i+1)
		}

		if i == len(inputPaths)-2 {
			outputLabel = "[outv]"
		} else {
			outputLabel = fmt.Sprintf("[vx%02d]", i)
		}

		filterPart := fmt.Sprintf("%sxfade=transition=%s:duration=%.1f:offset=%.1f%s",
			inputLabel, transitionType, transitionDuration, offset, outputLabel)
		transitionFilters = append(transitionFilters, filterPart)
	}

	// 合并缩放和转场滤镜
	var videoFilters []string
	videoFilters = append(videoFilters, scaleFilters...)
	videoFilters = append(videoFilters, transitionFilters...)
	filterComplex := strings.Join(videoFilters, ";")

	// 音频处理：如果有任何视频包含音频流，则处理音频
	var fullFilter string
	if hasAnyAudio {
		// 为音频流添加处理：生成静音流或延长音频
		var audioFilters []string
		for i := 0; i < len(inputPaths); i++ {
			// 计算该视频的时长
			clipDuration := clips[i].Duration
			if clips[i].EndTime > 0 && clips[i].StartTime >= 0 {
				clipDuration = clips[i].EndTime - clips[i].StartTime
			}

			// 检查是否需要为转场延长音频
			var padDuration float64 = 0
			if i < len(clips)-1 && clips[i].Transition != nil {
				// 检查转场类型
				needTransition := true
				if tType, ok := clips[i].Transition["type"].(string); ok {
					if strings.ToLower(tType) == "none" || tType == "" {
						needTransition = false
					}
				}

				// 只有需要转场时才延长音频
				if needTransition {
					if tDuration, ok := clips[i].Transition["duration"].(float64); ok && tDuration > 0 {
						padDuration = tDuration
					} else {
						padDuration = 1.0
					}
				}
			}

			if !audioStreams[i] {
				// 没有音频的视频：生成静音轨道（包括转场延长）
				totalDuration := clipDuration + padDuration
				audioFilters = append(audioFilters,
					fmt.Sprintf("anullsrc=channel_layout=stereo:sample_rate=44100:duration=%.2f[a%d]", totalDuration, i))
				f.log.Infow("Generated silence for audio", "index", i, "duration", totalDuration)
			} else if padDuration > 0 {
				// 有音频且需要延长：使用apad添加静音延长（稍后会用acrossfade处理）
				audioFilters = append(audioFilters,
					fmt.Sprintf("[%d:a]apad=pad_dur=%.2f[a%d]", i, padDuration, i))
				f.log.Infow("Padding audio with silence", "index", i, "pad_duration", padDuration)
			} else {
				// 有音频但不需要延长：直接标记
				audioFilters = append(audioFilters,
					fmt.Sprintf("[%d:a]acopy[a%d]", i, i))
			}
		}

		// 音频交叉淡入淡出（避免转场时静音）
		// 对所有相邻音频都应用 acrossfade，type=none 时使用 0 秒时长
		var audioCrossfades []string

		for i := 0; i < len(inputPaths)-1; i++ {
			// 默认转场时长
			transitionDuration := 1.0
			if clips[i].Transition != nil {
				if tType, ok := clips[i].Transition["type"].(string); ok {
					if strings.ToLower(tType) == "none" || tType == "" {
						// none 转场使用 0 秒
						transitionDuration = 0.0
					}
				}
				// 只有非 none 转场才读取自定义时长
				if transitionDuration > 0 {
					if tDuration, ok := clips[i].Transition["duration"].(float64); ok && tDuration > 0 {
						transitionDuration = tDuration
					}
				}
			}

			var inputLabel, outputLabel string
			if i == 0 {
				inputLabel = "[a0][a1]"
			} else {
				inputLabel = fmt.Sprintf("[ax%02d][a%d]", i-1, i+1)
			}

			if i == len(inputPaths)-2 {
				outputLabel = "[outa]"
			} else {
				outputLabel = fmt.Sprintf("[ax%02d]", i)
			}

			// acrossfade: d=转场时长，c1=第一个音频淡出曲线，c2=第二个音频淡入曲线
			// 0 秒时长实现无缝音频拼接
			audioCrossfades = append(audioCrossfades,
				fmt.Sprintf("%sacrossfade=d=%.2f:c1=tri:c2=tri%s", inputLabel, transitionDuration, outputLabel))

			f.log.Infow("Audio crossfade",
				"clip_index", i,
				"duration", transitionDuration)
		}

		// 构建完整滤镜：音频处理 + 音频交叉淡入淡出
		var allAudioFilters []string
		allAudioFilters = append(allAudioFilters, audioFilters...)
		allAudioFilters = append(allAudioFilters, audioCrossfades...)
		fullFilter = filterComplex + ";" + strings.Join(allAudioFilters, ";")
	} else {
		// 所有视频都无音频流，只处理视频
		fullFilter = filterComplex
	}

	// 构建完整命令
	args = append(args,
		"-filter_complex", fullFilter,
		"-map", "[outv]",
	)

	// 仅在有任何音频时映射音频输出
	if hasAnyAudio {
		args = append(args, "-map", "[outa]")
	}

	args = append(args,
		"-c:v", "libx264",
		"-preset", "medium",
		"-crf", "23",
	)

	// 仅在有任何音频时设置音频编码参数
	if hasAnyAudio {
		args = append(args,
			"-c:a", "aac",
			"-b:a", "128k",
		)
	}

	args = append(args,
		"-y",
		outputPath,
	)

	f.log.Infow("Running FFmpeg with transitions", "filter", fullFilter, "has_any_audio", hasAnyAudio)

	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Errorw("FFmpeg xfade failed", "error", err, "output", string(output))
		return fmt.Errorf("ffmpeg xfade failed: %w, output: %s", err, string(output))
	}

	f.log.Infow("Video merged with transitions successfully")
	return nil
}

func (f *FFmpeg) mapTransitionType(transType string) string {
	// 将前端传入的转场类型映射为FFmpeg xfade支持的类型
	// FFmpeg xfade支持的完整转场列表: https://ffmpeg.org/ffmpeg-filters.html#xfade
	switch strings.ToLower(transType) {
	// 淡入淡出类
	case "fade", "fadein", "fadeout":
		return "fade"
	case "fadeblack":
		return "fadeblack"
	case "fadewhite":
		return "fadewhite"
	case "fadegrays":
		return "fadegrays"

	// 滑动类
	case "slideleft":
		return "slideleft"
	case "slideright":
		return "slideright"
	case "slideup":
		return "slideup"
	case "slidedown":
		return "slidedown"

	// 擦除类
	case "wipeleft":
		return "wipeleft"
	case "wiperight":
		return "wiperight"
	case "wipeup":
		return "wipeup"
	case "wipedown":
		return "wipedown"

	// 圆形类
	case "circleopen":
		return "circleopen"
	case "circleclose":
		return "circleclose"

	// 矩形打开/关闭类
	case "horzopen":
		return "horzopen"
	case "horzclose":
		return "horzclose"
	case "vertopen":
		return "vertopen"
	case "vertclose":
		return "vertclose"

	// 其他特效
	case "dissolve":
		return "dissolve"
	case "distance":
		return "distance"
	case "pixelize":
		return "pixelize"

	default:
		return "fade" // 默认淡入淡出
	}
}

func (f *FFmpeg) hasAudioStream(videoPath string) bool {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-select_streams", "a:0",
		"-show_entries", "stream=codec_type",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}

	result := strings.TrimSpace(string(output))
	return result == "audio"
}

func (f *FFmpeg) getVideoResolution(videoPath string) (int, int) {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height",
		"-of", "csv=p=0",
		videoPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Warnw("Failed to get video resolution", "path", videoPath, "error", err)
		return 1920, 1080 // 默认分辨率
	}

	result := strings.TrimSpace(string(output))
	parts := strings.Split(result, ",")
	if len(parts) != 2 {
		f.log.Warnw("Invalid resolution format", "output", result)
		return 1920, 1080
	}

	var width, height int
	fmt.Sscanf(parts[0], "%d", &width)
	fmt.Sscanf(parts[1], "%d", &height)

	if width <= 0 || height <= 0 {
		return 1920, 1080
	}

	return width, height
}

// GetVideoDuration 获取视频时长（秒）
func (f *FFmpeg) GetVideoDuration(videoPath string) (float64, error) {
	cmd := exec.Command("ffprobe",
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Errorw("Failed to get video duration", "path", videoPath, "error", err)
		return 0, fmt.Errorf("ffprobe failed: %w", err)
	}

	result := strings.TrimSpace(string(output))
	var duration float64
	_, err = fmt.Sscanf(result, "%f", &duration)
	if err != nil {
		f.log.Errorw("Failed to parse duration", "output", result, "error", err)
		return 0, fmt.Errorf("parse duration failed: %w", err)
	}

	if duration <= 0 {
		return 0, fmt.Errorf("invalid duration: %f", duration)
	}

	return duration, nil
}

func (f *FFmpeg) copyFile(src, dst string) error {
	cmd := exec.Command("cp", src, dst)
	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Errorw("File copy failed", "error", err, "output", string(output))
		return fmt.Errorf("copy failed: %w", err)
	}
	return nil
}

func (f *FFmpeg) cleanup(paths []string) {
	for _, path := range paths {
		if err := os.Remove(path); err != nil {
			f.log.Warnw("Failed to cleanup file", "path", path, "error", err)
		}
	}
}

func (f *FFmpeg) CleanupTempDir() error {
	return os.RemoveAll(f.tempDir)
}

// ExtractAudio 从视频文件中提取音频轨道
// 返回提取的音频文件路径
func (f *FFmpeg) ExtractAudio(videoURL, outputPath string) (string, error) {
	f.log.Infow("Extracting audio from video", "url", videoURL, "output", outputPath)

	// 下载视频文件
	downloadPath := filepath.Join(f.tempDir, fmt.Sprintf("video_%d.mp4", time.Now().Unix()))
	localVideoPath, err := f.downloadVideo(videoURL, downloadPath)
	if err != nil {
		return "", fmt.Errorf("failed to download video: %w", err)
	}
	defer os.Remove(localVideoPath)

	// 检查视频是否有音频流
	if !f.hasAudioStream(localVideoPath) {
		f.log.Warnw("Video has no audio stream, generating silence", "video", videoURL)
		// 获取视频时长
		duration, err := f.GetVideoDuration(localVideoPath)
		if err != nil {
			return "", fmt.Errorf("failed to get video duration: %w", err)
		}
		// 生成静音音频文件
		return f.generateSilence(outputPath, duration)
	}

	// 确保输出目录存在
	outputDir := filepath.Dir(outputPath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create output directory: %w", err)
	}

	// 使用FFmpeg提取音频
	// -vn: 禁用视频
	// -acodec: 音频编码器
	// -ar: 音频采样率
	// -ac: 音频声道数
	// -ab: 音频比特率
	cmd := exec.Command("ffmpeg",
		"-i", localVideoPath,
		"-vn",
		"-acodec", "aac",
		"-ar", "44100",
		"-ac", "2",
		"-ab", "128k",
		"-y",
		outputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Errorw("FFmpeg audio extraction failed", "error", err, "output", string(output))
		return "", fmt.Errorf("ffmpeg audio extraction failed: %w, output: %s", err, string(output))
	}

	f.log.Infow("Audio extracted successfully", "output", outputPath)
	return outputPath, nil
}

// generateSilence 生成指定时长的静音音频文件
func (f *FFmpeg) generateSilence(outputPath string, duration float64) (string, error) {
	f.log.Infow("Generating silence audio", "duration", duration, "output", outputPath)

	// 确保输出目录存在
	outputDir := filepath.Dir(outputPath)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create output directory: %w", err)
	}

	// 使用FFmpeg生成静音
	// -f lavfi: 使用lavfi（libavfilter）输入
	// -i anullsrc: 生成静音音频源
	cmd := exec.Command("ffmpeg",
		"-f", "lavfi",
		"-i", fmt.Sprintf("anullsrc=channel_layout=stereo:sample_rate=44100"),
		"-t", fmt.Sprintf("%.2f", duration),
		"-acodec", "aac",
		"-ab", "128k",
		"-y",
		outputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		f.log.Errorw("FFmpeg silence generation failed", "error", err, "output", string(output))
		return "", fmt.Errorf("ffmpeg silence generation failed: %w, output: %s", err, string(output))
	}

	f.log.Infow("Silence audio generated successfully", "output", outputPath)
	return outputPath, nil
}
