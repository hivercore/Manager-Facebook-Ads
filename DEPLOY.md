# Hướng dẫn Deploy lên Render.com

## Bước 1: Đã hoàn thành ✅
Các file cấu hình đã được tạo:
- `render.yaml` - Cấu hình cho Render.com
- Cập nhật `.gitignore` - Bỏ qua file data
- Cập nhật `frontend/vite.config.ts` - Hỗ trợ biến môi trường
- Cập nhật `backend/src/index.ts` - CORS cho phép frontend URL
- Cập nhật `frontend/src/services/api.ts` - Sử dụng API URL từ biến môi trường

## Bước 2: Push code lên GitHub

```bash
# Kiểm tra git status
git status

# Thêm tất cả file
git add .

# Commit
git commit -m "Prepare for deployment to Render.com"

# Tạo repository mới trên GitHub (nếu chưa có)
# Sau đó push:
git remote add origin https://github.com/your-username/facebook-ads-manager.git
git branch -M main
git push -u origin main
```

## Bước 3: Deploy trên Render.com

### 3.1. Đăng ký tài khoản
1. Truy cập: https://render.com
2. Đăng ký bằng GitHub account (miễn phí)

### 3.2. Tạo Backend Service

1. **New → Web Service**
2. **Connect GitHub** và chọn repository của bạn
3. **Cấu hình:**
   - **Name:** `facebook-ads-manager-backend`
   - **Environment:** `Node`
   - **Region:** Chọn gần bạn nhất (ví dụ: Singapore)
   - **Branch:** `main`
   - **Root Directory:** `backend` (quan trọng!)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (512 MB RAM)

4. **Environment Variables:**
   - `PORT` = `3001` (hoặc để Render tự động)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://your-frontend-url.onrender.com` (sẽ cập nhật sau khi tạo frontend)
   - `FACEBOOK_APP_ID` = (nếu có, tùy chọn)
   - `FACEBOOK_APP_SECRET` = (nếu có, tùy chọn)

5. **Click "Create Web Service"**

6. **Lưu lại Backend URL** (ví dụ: `https://facebook-ads-manager-backend.onrender.com`)

### 3.3. Tạo Frontend Service

1. **New → Static Site**
2. **Connect GitHub** và chọn repository của bạn
3. **Cấu hình:**
   - **Name:** `facebook-ads-manager-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `frontend/dist`

4. **Environment Variables:**
   - `VITE_API_URL` = `https://facebook-ads-manager-backend.onrender.com` (URL backend vừa tạo)

5. **Click "Create Static Site"**

6. **Lưu lại Frontend URL** (ví dụ: `https://facebook-ads-manager-frontend.onrender.com`)

### 3.4. Cập nhật CORS trong Backend

1. Vào **Backend Service** trên Render Dashboard
2. Vào tab **Environment**
3. Cập nhật `FRONTEND_URL` = URL frontend vừa tạo
4. **Save Changes** → Render sẽ tự động rebuild

## Bước 4: Kiểm tra

1. Truy cập Frontend URL
2. Kiểm tra Console (F12) xem có lỗi CORS không
3. Thử thêm tài khoản Facebook Ads
4. Kiểm tra Backend Health: `https://your-backend-url.onrender.com/api/health`

## Lưu ý quan trọng

### ⚠️ Backend Free Tier
- Backend sẽ **sleep sau 15 phút** không có request
- Lần đầu truy cập sau khi sleep sẽ mất **~30 giây** để wake up
- Để tránh sleep, có thể dùng:
  - [UptimeRobot](https://uptimerobot.com) - ping backend mỗi 5 phút (miễn phí)
  - Upgrade lên paid plan ($7/tháng)

### 📁 Data Storage
- File `backend/data/accounts.json` sẽ **mất khi restart** trên free tier
- Giải pháp:
  1. Dùng **MongoDB Atlas** (free tier 512MB)
  2. Dùng **Render PostgreSQL** (free tier)
  3. Hoặc chấp nhận mất data khi restart (chỉ dùng cho testing)

### 🔐 Environment Variables
- **KHÔNG** commit file `.env` lên GitHub
- Chỉ thêm biến môi trường trong Render Dashboard
- Backend cần: `FRONTEND_URL`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` (nếu có)
- Frontend cần: `VITE_API_URL`

### 🔗 Telegram Bot
- Telegram webhook cần URL backend công khai
- Dùng Backend URL từ Render: `https://your-backend-url.onrender.com/api/telegram/...`

## Troubleshooting

### Lỗi CORS
- Kiểm tra `FRONTEND_URL` trong Backend Environment Variables
- Đảm bảo URL không có trailing slash: `https://frontend.onrender.com` (không phải `https://frontend.onrender.com/`)

### Backend không start
- Kiểm tra logs trong Render Dashboard
- Đảm bảo `Root Directory` = `backend`
- Kiểm tra `Start Command` = `npm start`

### Frontend không build
- Kiểm tra logs trong Render Dashboard
- Đảm bảo `Root Directory` = `frontend`
- Kiểm tra `Publish Directory` = `frontend/dist`

### API không kết nối được
- Kiểm tra `VITE_API_URL` trong Frontend Environment Variables
- Đảm bảo URL có `/api` ở cuối: `https://backend.onrender.com/api` (không, thực ra không cần vì code đã tự thêm `/api`)
- Kiểm tra Backend đã wake up chưa (có thể mất 30s)

## Next Steps (Tùy chọn)

1. **Setup MongoDB Atlas** để lưu accounts.json
2. **Setup UptimeRobot** để keep backend alive
3. **Custom Domain** (nếu có)
4. **SSL Certificate** (Render tự động cung cấp)

