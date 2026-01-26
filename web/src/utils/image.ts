/**
 * 图片URL工具函数
 */

/**
 * 修复图片URL，处理相对路径和绝对路径
 */
export function fixImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${import.meta.env.VITE_API_BASE_URL || ''}${url}`;
}

/**
 * 获取图片URL，优先使用 local_path
 * @param item 包含 local_path 或 image_url 的对象
 * @returns 处理后的图片URL
 */
export function getImageUrl(item: any): string {
  if (!item) return '';
  
  // 优先使用 local_path
  if (item.local_path) {
    // local_path 是相对路径（如 images/xxx.jpg），需要添加 /static/ 前缀
    return `/static/${item.local_path}`;
  }
  
  // 回退到 image_url
  if (item.image_url) {
    return fixImageUrl(item.image_url);
  }
  
  return '';
}

/**
 * 检查是否有图片
 */
export function hasImage(item: any): boolean {
  return !!(item?.local_path || item?.image_url);
}
