#!/bin/bash
# HuobaoDrama 首次打开修复脚本
# 未签名 app 从浏览器下载后带 quarantine 属性，Gatekeeper 会误报"已损坏"，
# 本脚本移除该属性。仅首次安装需要运行一次，后续应用内自动更新不受影响。

APP_PATH="/Applications/HuobaoDrama.app"

echo "======================================"
echo "  HuobaoDrama 修复「App 已损坏」提示"
echo "======================================"
echo ""

if [ ! -d "$APP_PATH" ]; then
  echo "❌ 未找到 $APP_PATH"
  echo "   请先将 HuobaoDrama.app 拖入「应用程序」文件夹，再运行本脚本。"
  echo ""
  read -n 1 -s -r -p "按任意键退出..."
  exit 1
fi

xattr -cr "$APP_PATH"

if [ $? -eq 0 ]; then
  echo "✅ 修复完成！现在可以正常打开 HuobaoDrama 了。"
  echo "   （本操作只需执行一次，以后双击图标即可启动）"
else
  echo "❌ 修复失败，请尝试在终端手动执行："
  echo "   sudo xattr -cr $APP_PATH"
fi

echo ""
read -n 1 -s -r -p "按任意键退出..."
