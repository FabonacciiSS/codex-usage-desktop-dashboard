# AI Usage Dashboard

本地桌面仪表盘，集中监控各 AI 服务的用量与额度，免去逐个打开网页查看。深色/浅色随系统自动切换。

![AI Usage Dashboard](assets/dashboard.png)

## 自动监控的数据源

- **ChatGPT Codex** — 5 小时 / 每周窗口用量与重置时间（通过本机 opencode 的 OpenAI OAuth 自动读取）。
- **Car360** — 每日 `$100` 限额、已用金额、剩余金额与请求数（官方 usage API）。
- **DeepSeek API** — 实时账户余额（官方 balance API）。
- **OpenCode Go** — 两个账号（Github / Gmail 各一）的 5 小时 / 每周 / 每月用量、Token 用量与额度。

## 启动

```bash
npm install
npm start
```

## OpenCode Go 会话绑定（仅首次）

OpenCode Go 用量页面需要登录态，且一次只能登录一个账号。首次绑定时用 Tabbit 等浏览器登录 opencode.ai 并打开对应 workspace 的 go 页面，取得登录 cookie 后加密导入：

```powershell
# 环境变量指定当前要导入的账号
$env:OPENCODE_GO_IMPORT_LABEL = "github"      # 或 "gmail"
$env:OPENCODE_GO_WORKSPACE_ID = "wrk_xxx"
$env:OPENCODE_GO_COOKIE_FILE = "C:\path\to\cookie.txt"
npm start
```

会话使用 Windows 凭据加密（DPAPI）保存在本机 userData，明文 cookie 导入后立即删除。日常同步不再需要打开浏览器；只有会话过期时才需重新绑定。

## 数据隐私

- API key 只从本机环境变量 / 配置文件读取，不会写入页面存储，也不会提交到仓库。
- 会话凭证经 Windows 加密后仅存本机。
- 敏感文件（`.env`、cookie、dump、截图等）已加入 `.gitignore`。