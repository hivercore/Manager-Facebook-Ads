# Hướng dẫn Deploy lên Render.com

## Bước 1: Tạo Backend Service trên Render

1. Đăng nhập vào [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → Chọn **"Web Service"**
3. Connect GitHub repository của bạn
4. Điền thông tin:
   - **Name**: `facebook-ads-manager-backend`
   - **Environment**: `Node`
   - **Region**: Chọn gần bạn nhất (Singapore hoặc US)
   - **Branch**: `main` (hoặc branch bạn muốn deploy)
   - **Root Directory**: `backend` (quan trọng!)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Chọn **Free**

5. Click **"Advanced"** và thêm Environment Variables:
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```
   (Lưu ý: `FRONTEND_URL` sẽ cập nhật sau khi tạo frontend service)

6. Click **"Create Web Service"**
7. Đợi deploy xong, copy URL backend (ví dụ: `https://facebook-ads-manager-backend.onrender.com`)

---

## Bước 2: Tạo Frontend Service trên Render

1. Trong Render Dashboard, click **"New +"** → Chọn **"Static Site"**
2. Connect cùng GitHub repository
3. Điền thông tin:
   - **Name**: `facebook-ads-manager-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend` (quan trọng!)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist` (quan trọng!)

4. Click **"Advanced"** và thêm Environment Variables:
   ```
   VITE_API_URL=https://facebook-ads-manager-backend.onrender.com
   ```
   (Thay bằng URL backend bạn vừa copy ở bước 1)

5. Click **"Create Static Site"**
6. Đợi deploy xong, copy URL frontend (ví dụ: `https://facebook-ads-manager-frontend.onrender.com`)

---

## Bước 3: Cập nhật CORS trong Backend

1. Quay lại Backend Service trên Render
2. Vào tab **"Environment"**
3. Cập nhật biến `FRONTEND_URL` với URL frontend bạn vừa copy:
   ```
   FRONTEND_URL=https://facebook-ads-manager-frontend.onrender.com
   ```
4. Click **"Save Changes"** → Render sẽ tự động redeploy

---

## Bước 4: Cấu hình Facebook App (Nếu cần)

1. Vào [Facebook Developers](https://developers.facebook.com/apps/)
2. Chọn app của bạn → Settings → Basic
3. Thêm **Valid OAuth Redirect URIs**:
   ```
   https://your-frontend-url.onrender.com
   ```
4. Thêm **App Domains**:
   ```
   your-frontend-url.onrender.com
   ```

---

## Bước 5: Cấu hình Telegram Webhook (Nếu dùng Telegram)

1. Telegram Bot cần URL backend công khai
2. Sử dụng URL backend từ Render: `https://your-backend-url.onrender.com/api/telegram/...`

---

## Lưu ý quan trọng:

### ⚠️ Free Tier Limitations:
- **Backend có thể sleep** sau 15 phút không có request
- Lần đầu truy cập sau khi sleep sẽ mất **~30 giây** để wake up
- Nếu cần 24/7, nên upgrade lên **Starter Plan** ($7/tháng)

### 📁 Data Storage:
- File `accounts.json` sẽ **mất khi restart** trên free tier
- Nên migrate sang database:
  - **MongoDB Atlas** (free tier)
  - **PostgreSQL** (Render có free tier)

### 🔄 Auto Deploy:
- Render tự động deploy khi bạn push code lên GitHub
- Có thể tắt auto-deploy trong Settings nếu muốn

### 🐛 Debugging:
- Xem logs trong tab **"Logs"** của mỗi service
- Backend logs sẽ hiển thị errors và API calls

---

## Kiểm tra sau khi deploy:

1. ✅ Truy cập frontend URL → Xem có load được không
2. ✅ Mở DevTools → Network → Kiểm tra API calls có thành công không
3. ✅ Test đăng nhập Facebook
4. ✅ Test các tính năng chính (Campaigns, Accounts, Reports)

---

## Troubleshooting:

### Backend không start được:
- Kiểm tra logs trong Render Dashboard
- Đảm bảo `package.json` có script `start`: `"start": "node dist/index.js"`
- Kiểm tra build command có chạy thành công không

### Frontend không kết nối được Backend:
- Kiểm tra `VITE_API_URL` trong Environment Variables
- Kiểm tra CORS trong backend có cho phép frontend URL không
- Xem Network tab trong DevTools để xem lỗi cụ thể

### 502 Bad Gateway:
- Backend có thể đang sleep → Đợi ~30 giây
- Kiểm tra backend logs xem có crash không

---

Chúc bạn deploy thành công! 🚀

