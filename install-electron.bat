@echo off
chcp 65001 >nul
echo 正在使用国内镜像安装 Electron...

:: 设置国内镜像
npm config set registry https://registry.npmmirror.com

:: 设置 Electron 镜像环境变量
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_CUSTOM_DIR=35.0.0

:: 清理旧的 electron
echo 清理旧的安装...
if exist "node_modules\electron" rmdir /s /q "node_modules\electron"

:: 重新安装 electron
echo 开始安装 Electron...
npm install electron@35.0.0 --save-dev

echo.
echo 安装完成！
pause
