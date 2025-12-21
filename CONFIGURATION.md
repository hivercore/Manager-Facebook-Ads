# Hướng dẫn Cấu hình Environment Variables

## ✅ Frontend - KHÔNG CẦN CẤU HÌNH

**Frontend tự động phát hiện backend URL** - không cần environment variables!**

Ứng dụng sẽ tự động:
- Phát hiện backend URL từ frontend URL
- Test các URL có thể và chọn URL hoạt động
- Cache URL đã phát hiện để dùng lại

**Người dùng chỉ cần deploy và sử dụng - không cần cấu hình gì!**

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
- Xem log khi ứng dụng khởi động:
  - `🔍 Testing possible backend URLs:` - Danh sách URLs được test
  - `✅ Detected working backend URL:` - URL đã phát hiện
  - `🔧 API Base URL initialized:` - URL đang sử dụng

## Troubleshooting

### Lỗi "Network Error":
1. **Kiểm tra Backend đang chạy:**
   - Truy cập: `https://manager-facebook-ads.onrender.com/api/health`
   - Nếu timeout → Backend có thể đang sleep (Render free tier)
   - Đợi ~30 giây và thử lại

2. **Kiểm tra Auto-detect:**
   - Mở Browser Console (F12)
   - Xem log `🔍 Testing possible backend URLs:`
   - Nếu không có URL nào hoạt động → Backend URL pattern không khớp
   - Thử refresh trang để ứng dụng tự động detect lại

3. **Kiểm tra CORS:**
   - Vào Backend Service → Logs
   - Xem có log `[CORS] GET /api/... from origin: ...`
   - Đảm bảo `FRONTEND_URL` trong backend env đúng với frontend URL

### Backend Sleep (Render Free Tier):
- Render free tier sẽ sleep sau 15 phút không có request
- Lần đầu truy cập sau khi sleep sẽ mất ~30 giây để wake up
- Hệ thống sẽ tự động retry với timeout 30 giây

## Lưu ý quan trọng:

1. **Frontend tự động phát hiện backend:**
   - Không cần cấu hình `VITE_API_URL`
   - Ứng dụng tự động test và chọn backend URL hoạt động
   - URL được cache trong localStorage để dùng lại

2. **Facebook OAuth Redirect URI:**
   - Vào [Facebook Developers](https://developers.facebook.com/apps/)
   - Settings → Basic → Valid OAuth Redirect URIs
   - Thêm: `https://manager-facebook-ads.onrender.com/api/auth/facebook/callback`
   - (Thay bằng backend URL thực tế của bạn)

3. **Backend URL vs Frontend URL:**
   - Backend URL: URL của backend service (tự động phát hiện từ frontend)
   - Frontend URL: URL của static site (dùng cho FRONTEND_URL trong backend)

