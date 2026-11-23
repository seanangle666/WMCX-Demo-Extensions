# WMCX Example Extensions

本倉庫為 [Web mai Chart X](https://susuy0725.github.io/web-mai-chart-x/) 的擴充程式範例與發布集合，所有外掛皆依據源專案的擴充系統規格開發。

## 相關連結

- 編輯器網站：https://susuy0725.github.io/web-mai-chart-x/
- 源專案倉庫：https://github.com/Susuy0725/web-mai-chart-x
- [示範擴充程式的 GitHub 儲存庫](https://github.com/seanangle666/WMCX-Demo-Extensions)
- 擴充程式開發手冊：[繁體中文](https://seanangle666.github.io/WMCX-Demo-Extensions/) · [English](https://seanangle666.github.io/WMCX-Demo-Extensions/en/) · [日本語](https://seanangle666.github.io/WMCX-Demo-Extensions/ja/) · [简体中文](https://seanangle666.github.io/WMCX-Demo-Extensions/zh-CN/) · [한국어](https://seanangle666.github.io/WMCX-Demo-Extensions/ko/)
- WERP 安裝索引：[index.json](https://seanangle666.github.io/WMCX-Demo-Extensions/index.json)

## 目錄結構

```text
.
├── index.json
├── Extensions/
│   └── <name>-<version>.zip
└── Source/
    └── <extension-name>/
        ├── manifest.json
        └── index.js
```

- `index.json`：擴充程式索引清單，記錄各擴充的識別碼、名稱、版本、說明、壓縮檔路徑與 SHA-256 雜湊值。
- `Extensions/`：已打包的可安裝 `.zip` 擴充套件。
- `Source/`：各擴充程式的原始碼與資源檔案。

## 安裝與使用

1. 開啟 [Web mai Chart X](https://susuy0725.github.io/web-mai-chart-x/) 編輯器首頁。
2. 點擊頂欄右側的拼圖圖示，展開擴充程式選單。
3. 點選「管理擴充程式」，再點擊右下角「匯入擴充程式」。
4. 選取 `Extensions/` 目錄下的任一 `.zip` 檔案。
5. 確認權限清單後點選「安裝並啟用」即可使用。

## 開發者手冊

手冊首頁與詞條資料位於 `manual/index.html` 和 `manual/docData.mjs`，其他四種語言的譯文位於 `manual/locales/`。在倉庫根目錄執行 `node manual/build.mjs` 以產生並驗證五個版本，再以靜態伺服器預覽 `dist/`。在 GitHub 的 **Settings → Pages → Source** 選擇 **GitHub Actions**；推送至 `main` 後，Pages 工作流程會將手冊、WERP 索引與範例套件一起發布。

## 開發與打包

修改 `Source/` 底下的擴充程式後，可使用 PowerShell 重新打包並計算 SHA-256 雜湊值，再同步更新 `index.json` 中的 `file` 與 `sha256` 欄位：

```powershell
Compress-Archive -Path "Source\<資料夾>\manifest.json", "Source\<資料夾>\index.js" -DestinationPath "Extensions\<名稱>-<版本>.zip" -Force
(Get-FileHash -Path "Extensions\<名稱>-<版本>.zip" -Algorithm SHA256).Hash.ToLowerInvariant()
```

## 授權條款

本專案採用 GNU General Public License v3.0 授權，詳情請參閱 [LICENSE](./LICENSE)。
