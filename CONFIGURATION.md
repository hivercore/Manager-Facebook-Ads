# Hướng dẫn Cấu hình Environment Variables

## ⚠️ QUAN TRỌNG: Backend URL

Backend đang chạy tại: **`https://manager-facebook-ads.onrender.com`**

**KHÔNG PHẢI:** `https://facebook-ads-manager-backend.onrender.com` (URL cũ/sai)

## Cấu hình Frontend trên Render

1. Vào **Render Dashboard** → **Static Site** → `facebook-ads-manager-frontend`
2. Vào tab **Environment**
3. Thêm hoặc cập nhật biến (QUAN TRỌNG - phải đúng URL):
   ```
   VITE_API_URL=https://manager-facebook-ads.onrender.com
   ```
   
   ⚠️ **LƯU Ý:** 
   - URL phải là: `https://manager-facebook-ads.onrender.com`
   - KHÔNG có dấu `/` ở cuối
   - KHÔNG phải: `https://facebook-ads-manager-backend.onrender.com`
4. Click **Save Changes** → Render sẽ tự động rebuild và deploy

## Cấu hình Backend trên Render

1. Vào **Render Dashboard** → **Web Service** → Service của bạn (có thể là `manager-facebook-ads` hoặc tên khác)
2. Vào tab **Environment**
3. Đảm bảo có các biến sau:
   ```
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-url.onrender.com
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   BACKEND_URL=https://manager-facebook-ads.onrender.com
   ```
4. **Quan trọng:** Thay `your-frontend-url.onrender.com` bằng URL frontend thực tế của bạn
5. Click **Save Changes** → Render sẽ tự động redeploy

## Kiểm tra kết nối

### 1. Kiểm tra Backend Health:
Truy cập: `https://manager-facebook-ads.onrender.com/api/health`

**Nếu bạn có backend khác, thay bằng URL backend thực tế của bạn.**

Nếu thấy JSON response:
```json
{
  "status": "ok",
  "message": "Facebook Ads Manager API is running",
  ...
}
```
→ Backend đang chạy tốt ✅

### 2. Kiểm tra Frontend:
- Mở Browser Console (F12)
- Xem log "API Configuration:" khi click đăng nhập Facebook
- Đảm bảo `fullApiUrl` trỏ đến: `https://manager-facebook-ads.onrender.com`

## Troubleshooting

### Lỗi "Network Error":
1. **Kiểm tra VITE_API_URL:**
   - Vào Frontend Service → Environment
   - Đảm bảo `VITE_API_URL=https://manager-facebook-ads.onrender.com`
   - Không có dấu `/` ở cuối

2. **Kiểm tra Backend đang chạy:**
   - Truy cập: `https://manager-facebook-ads.onrender.com/api/health`
   - Nếu timeout → Backend có thể đang sleep (Render free tier)
   - Đợi ~30 giây và thử lại

3. **Kiểm tra CORS:**
   - Vào Backend Service → Logs
   - Xem có log "CORS: Request from origin: ..."
   - Đảm bảo `FRONTEND_URL` trong backend env đúng với frontend URL

### Backend Sleep (Render Free Tier):
- Render free tier sẽ sleep sau 15 phút không có request
- Lần đầu truy cập sau khi sleep sẽ mất ~30 giây để wake up
- Hệ thống sẽ tự động retry với timeout 30 giây

## Lưu ý quan trọng:

1. **Sau khi thay đổi Environment Variables:**
   - Frontend: Render sẽ tự động rebuild
   - Backend: Render sẽ tự động redeploy
   - Đợi deploy xong trước khi test

2. **Facebook OAuth Redirect URI:**
   - Vào [Facebook Developers](https://developers.facebook.com/apps/)
   - Settings → Basic → Valid OAuth Redirect URIs
   - Thêm: `https://manager-facebook-ads.onrender.com/api/auth/facebook/callback`

3. **Backend URL vs Frontend URL:**
   - Backend URL: `https://manager-facebook-ads.onrender.com` (dùng cho VITE_API_URL)
   - Frontend URL: URL của static site (dùng cho FRONTEND_URL trong backend)

