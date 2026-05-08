# Jackson Hu · AIPM Resume

个人简历主页，托管于 [GitHub Pages](https://pages.github.com/)。

🌐 **在线访问**：<https://doveboy13.github.io>

## 项目说明

本仓库以 `Resume-AIPM-Jackson.md` 作为唯一信息源，页面通过 `index.html` 在浏览器侧用 [marked.js](https://github.com/markedjs/marked) 实时渲染并应用 AI 科技风样式，简历内容更新只需要修改一处 Markdown 即可。

## 文件结构

```
.
├── index.html                  页面入口
├── assets/
│   ├── css/style.css           AI 科技风样式（含响应式与打印样式）
│   └── js/main.js              MD 加载、渲染、目录、进度条、入场动画等交互
├── .nojekyll                   告诉 GitHub Pages 跳过 Jekyll 处理
├── Resume-AIPM-Jackson.md      简历内容（唯一信息源）
└── README.md
```

## 功能特性

- **动态渲染**：浏览器实时 fetch + 解析 Markdown，简历内容只维护 MD 一份
- **AI 科技视觉**：深色玻璃拟态卡片 + 紫青渐变 accent + 动态光斑背景
- **左侧目录**（≥1280px）：滚动联动高亮，点击平滑跳转
- **顶部阅读进度条**
- **关键词 chip**：「关键词：A、B、C」自动拆为渐变标签
- **联系方式解锁**：电话邮箱默认打码，点击展开 + 一键复制
- **入场动画**：滚动进入视口时模块淡入上滑
- **导出 PDF**：右上角按钮一键打印为 A4 简洁版（白底正文样式）
- **响应式**：移动端单列堆叠，操作按钮折叠为 FAB

## 本地预览

由于浏览器禁止 `file://` 协议下 fetch 本地文件，**不能直接双击 index.html**。请通过本地 HTTP 服务预览：

```bash
# Python 3
python -m http.server 8000

# 或 Node.js
npx serve .
```

然后访问 <http://localhost:8000>。

## 部署

仓库名为 `Doveboy13.github.io`（User Pages 仓库），GitHub Pages 会自动从 `main` 分支根目录发布。任何对 `main` 的 push 都会触发重新部署，1-2 分钟后访问 <https://doveboy13.github.io> 即可看到最新版本。

如未生效，请到仓库 **Settings → Pages**，确认 Source 为 `Deploy from a branch`，Branch 为 `main / (root)`。

## 更新简历

直接修改 `Resume-AIPM-Jackson.md`，提交并推送到 `main` 分支即可。

```bash
git add Resume-AIPM-Jackson.md
git commit -m "docs: update resume"
git push origin main
```

## License

简历内容版权属于 Jackson Hu。页面代码可自由参考。
