import json, sys, os, urllib.request, uuid

token = os.environ.get("OPENAI_ACCESS_TOKEN", "").strip()
if not token:
    print(json.dumps({"ok": False, "error": "OPENAI_ACCESS_TOKEN not set"}))
    sys.exit(0)

headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "oai-device-id": str(uuid.uuid4()),
    "oai-app-name": "chatgpt-web",
    "oai-language": "en-US",
    "Origin": "https://chatgpt.com",
    "Referer": "https://chatgpt.com/",
}

url = "https://chatgpt.com/backend-api/codex/usage"
try:
    req = urllib.request.Request(url, headers=headers)
    resp = urllib.request.urlopen(req, timeout=25)
    body = resp.read().decode("utf-8", "replace")
    data = json.loads(body)
    print(json.dumps({"ok": True, "status": resp.status, "data": data}))
except urllib.error.HTTPError as e:
    msg = e.read().decode("utf-8", "replace")[:500]
    print(json.dumps({"ok": False, "status": e.code, "error": msg}))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}))