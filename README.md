# Codex Usage Desktop Dashboard

本地桌面仪表盘，用来跟踪 Codex 使用额度、5 小时/weekly 重置时间，以及 OpenAI API 用量/费用。

## 能自动获取什么

- OpenAI API 用量和费用：可通过 OpenAI Admin API key 读取官方 Usage/Cost API。
- Codex / ChatGPT Work 的产品内额度：目前没有稳定公开的个人额度读取接口，仪表盘提供手动录入和重置提醒。

## 启动

```bash
npm install
npm start
```

也可以直接打开 `src/index.html` 使用离线版，离线版不会自动读取 API 用量。

## API 自动同步

设置环境变量后启动：

```bash
OPENAI_ADMIN_KEY=sk-admin-... npm start
```

进入仪表盘后点击 `Sync API usage`。

## 数据隐私

- Codex 额度记录保存在本机浏览器存储中。
- API key 只从本机环境变量读取，不会写入页面存储。
- OpenAI API 用量请求由 Electron 主进程发起，避免把密钥暴露给前端页面。
