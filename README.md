# 尋寶活動系統

一套輕量級的網頁應用系統，專為線下實體店面的尋寶活動設計。顧客掃描 QR Code 完成踩點，店員可在後台核對並兌換抽獎資格。

## 功能特色

- 🎯 **顧客端踩點網頁**: 掃描 QR Code，輸入電子郵件完成踩點
- 👨‍💼 **店員管理後台**: 查詢顧客資格並進行核銷管理
- 🔒 **安全防護**: 防止重複領取、基本身份驗證
- 📱 **響應式設計**: 適配手機和桌面裝置
- 🚀 **輕量高效**: 使用 SQLite 資料庫，部署簡單

## 系統需求

- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 初始化資料庫

```bash
npm run init-db
```

執行後將會：
- 創建 SQLite 資料庫檔案
- 建立所需資料表
- 插入預設尋寶地點
- 創建管理員帳號 (admin/admin123)

### 3. 啟動服務

```bash
# 生產環境
npm start

# 開發環境 (使用 nodemon)
npm run dev
```

服務啟動後：
- 主服務: http://localhost:4500
- 管理後台: http://localhost:4500/admin

## 使用說明

### 顧客端使用流程

1. 顧客掃描指定地點的 QR Code
2. 在網頁中輸入電子郵件
3. 點擊「領取我的抽獎資格」
4. 系統確認後顯示成功訊息
5. 顧客憑電子郵件至店內兌換

### 店員端使用流程

1. 訪問 `/admin` 進入管理後台
2. 使用預設帳號密碼登入 (admin/admin123)
3. 輸入顧客手機號碼查詢資格
4. 確認後點擊「核銷」完成兌換

### QR Code 網址格式

每個尋寶地點的 QR Code 應包含對應的地點參數：

```
http://your-domain.com/?spot_id=location_A
http://your-domain.com/?spot_id=location_B
http://your-domain.com/?spot_id=location_C
http://your-domain.com/?spot_id=location_D
http://your-domain.com/?spot_id=location_E
```

## 預設資料

### 尋寶地點

| spot_id | 地點名稱 |
|---------|----------|
| location_A | 神秘地點 A |
| location_B | 神秘地點 B |
| location_C | 神秘地點 C |
| location_D | 神秘地點 D |
| location_E | 神秘地點 E |

### 管理員帳號

- 使用者名稱: `admin`
- 密碼: `admin123`

> ⚠️ **安全提醒**: 部署到生產環境前，請務必修改預設管理員密碼！

## API 接口

### 顧客端 API

#### POST /api/claim-ticket
領取抽獎資格

**請求體:**
```json
{
  "spot_id": "location_A",
  "phone_number": "0912345678"
}
```

### 管理端 API

#### POST /api/admin/login
管理員登入

#### GET /api/admin/tickets/:phone_number
查詢顧客抽獎資格

#### PUT /api/admin/redeem/:ticket_id
核銷抽獎資格

## 資料庫結構

### lottery_tickets (抽獎券)
- `id`: 主鍵
- `serial_number`: 系統序號
- `user_id`: 顧客手機號碼
- `spot_id`: 尋寶地點ID
- `status`: 狀態 (issued/redeemed)
- `created_at`: 領取時間
- `redeemed_at`: 核銷時間

### spots (地點配置)
- `id`: 地點ID
- `name`: 地點名稱
- `description`: 描述
- `is_active`: 是否啟用

### admin_users (管理員)
- `id`: 主鍵
- `username`: 使用者名稱
- `password_hash`: 密碼雜湊
- `created_at`: 創建時間

## 部署建議

### 生產環境設定

1. **環境變數配置**
   ```bash
   export PORT=4500
   export NODE_ENV=production
   ```

2. **使用 PM2 進程管理**
   ```bash
   npm install -g pm2
   pm2 start server/app.js --name "qrcode-treasure-hunt"
   pm2 save
   pm2 startup
   ```

3. **Nginx 反向代理**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:4500;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### 安全考量

- 定期備份 SQLite 資料庫檔案
- 修改預設管理員密碼
- 考慮使用 HTTPS
- 設置適當的防火牆規則
- 定期更新依賴套件

## 故障排除

### 常見問題

1. **資料庫檔案權限錯誤**
   ```bash
   chmod 664 server/database.sqlite
   ```

2. **埠號被占用**
   ```bash
   lsof -ti:4500 | xargs kill -9
   ```

3. **清除資料庫重新初始化**
   ```bash
   rm server/database.sqlite
   npm run init-db
   ```

## 技術架構

- **後端**: Node.js + Express
- **資料庫**: SQLite
- **前端**: 原生 HTML/CSS/JavaScript
- **認證**: Express Session
- **加密**: bcrypt

## 開發團隊

此系統根據 claude.md 需求文件開發，適用於小型零售店面的行銷活動。

## 授權條款

本專案僅供內部使用，未開放外部授權。# stoner-qr
