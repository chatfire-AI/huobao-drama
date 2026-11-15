/**
 * preload — 渲染进程安全桥
 * 暴露 window.huobaoDesktop：目录选择、迁移触发、迁移进度订阅。
 * contextIsolation 默认开启，仅经 contextBridge 暴露白名单方法。
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('huobaoDesktop', {
  /** 弹原生目录选择框；返回 { ok, path?, freeBytes?, error?, canceled? } */
  pickDirectory: () => ipcRenderer.invoke('huobao:pick-directory'),
  /** 触发存储迁移；返回 { ok } 或 reject（错误信息见进度事件/异常） */
  startMigration: (opts: { targetDir: string, migrateFiles: boolean }) =>
    ipcRenderer.invoke('huobao:start-migration', opts),
  /** 订阅迁移进度；返回取消订阅函数 */
  onMigrateProgress: (cb: (progress: { phase: string, copiedBytes?: number, totalBytes?: number, message?: string }) => void) => {
    const listener = (_event: unknown, progress: Parameters<typeof cb>[0]) => cb(progress)
    ipcRenderer.on('huobao:migrate-progress', listener)
    return () => ipcRenderer.removeListener('huobao:migrate-progress', listener)
  },
  // ---- 应用内更新 ----
  getUpdateState: () => ipcRenderer.invoke('huobao:update-state'),
  checkUpdate: () => ipcRenderer.invoke('huobao:update-check'),
  downloadUpdate: () => ipcRenderer.invoke('huobao:update-download'),
  applyUpdate: () => ipcRenderer.invoke('huobao:update-apply'),
  /** 订阅更新下载进度（0-100）；返回取消订阅函数 */
  onUpdateProgress: (cb: (percent: number) => void) => {
    const listener = (_event: unknown, percent: number) => cb(percent)
    ipcRenderer.on('huobao:update-progress', listener)
    return () => ipcRenderer.removeListener('huobao:update-progress', listener)
  },
})
