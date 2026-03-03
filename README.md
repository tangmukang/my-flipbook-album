# 📸 电子翻页相册

一个简单易用的电子翻页相册，支持手机和电脑访问。

## ✨ 功能特性

- 📱 完美适配手机和电脑
- 👆 支持触摸滑动翻页
- 🖱️ 支持鼠标点击和键盘控制
- 🔍 全屏模式
- ▶️ 自动播放
- 🖼️ 缩略图导航

## 🚀 部署到 Vercel

### 方法一：通过 Vercel 网站部署（推荐）

1. 访问 [Vercel 官网](https://vercel.com)
2. 使用 GitHub/GitLab/Bitbucket 账号登录
3. 点击 "Add New Project"
4. 导入这个项目（可以先上传到 GitHub）
5. 点击 "Deploy"，等待部署完成
6. 获得你的相册链接，分享给朋友！

### 方法二：使用 Vercel CLI（命令行）

1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 在项目目录运行：
```bash
vercel
```

3. 按照提示完成部署

## 📝 如何更换照片

### 方法1：使用在线图片（当前方法）
直接修改 `index.html` 中的图片链接：
```html
<img src="你的图片链接" alt="照片1" class="photo">
```

### 方法2：上传本地照片
1. 将照片放到 `images` 文件夹
2. 修改 `index.html` 中的图片路径：
```html
<img src="images/你的照片.jpg" alt="照片1" class="photo">
```

## 🎨 自定义配置

### 修改标题
编辑 `index.html` 第 12-13 行

### 修改颜色主题
编辑 `style.css` 第 10 行的渐变色

### 修改自动播放速度
编辑 `script.js` 第 181 行，修改时间（单位：毫秒）

## 📱 使用说明

- **电脑端**：点击左右按钮或使用键盘左右键翻页
- **手机端**：左右滑动或点击页面翻页
- **全屏**：点击"全屏"按钮进入沉浸式观看
- **自动播放**：点击"自动播放"按钮自动翻页

## 🔗 分享给朋友

部署成功后，你会得到一个链接，例如：
- `https://your-album.vercel.app`

可以：
1. 直接发送链接
2. 生成二维码让朋友扫描
3. 添加到微信收藏

## 📞 技术支持

如有问题，请查看 [Vercel 文档](https://vercel.com/docs)

---

Made with ❤️ by Claude
