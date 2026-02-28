// Suppress Element Plus DOM measurement errors in happy-dom
// el-input tries to access offsetHeight on elements that don't exist in happy-dom
process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('offsetHeight')) return
  throw reason
})
