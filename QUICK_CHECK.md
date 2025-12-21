# ✅ Checklist Kiểm tra Nhanh

## Backend đã sẵn sàng ✅
Từ logs, backend đã deploy thành công tại: **`https://manager-facebook-ads.onrender.com`**

## Frontend - KHÔNG CẦN CẤU HÌNH ✅

**Frontend tự động phát hiện backend URL - không cần environment variables!**

### 1. Test ứng dụng:
1. Mở frontend URL
2. Mở Browser Console (F12)
3. Xem log khi trang load:
   ```
   🔍 Testing possible backend URLs: [...]
   ✅ Detected working backend URL: https://manager-facebook-ads.onrender.com
   🔧 API Base URL initialized: https://manager-facebook-ads.onrender.com
   ```
4. Nếu thấy `✅ Detected working backend URL` → OK ✅
5. Click "Đăng nhập Facebook" và test

### 4. Test Backend trực tiếp:
Mở tab mới và truy cập:
```
https://manager-facebook-ads.onrender.com/api/health
```

Nếu thấy JSON:
```json
{
  "status": "ok",
  "message": "Facebook Ads Manager API is running",
  ...
}
```
→ Backend OK ✅

## Nếu vẫn lỗi:
1. **Kiểm tra Auto-detect:**
   - Xem console log `🔍 Testing possible backend URLs:`
   - Nếu không có URL nào hoạt động → Backend URL pattern không khớp
   - Thử refresh trang để detect lại

2. **Kiểm tra Backend:**
   - Truy cập: `https://manager-facebook-ads.onrender.com/api/health`
   - Nếu timeout → Backend đang sleep, đợi ~30 giây

3. **Kiểm tra CORS:**
   - Vào Backend Service → Logs
   - Tìm log: `[CORS] GET /api/... from origin: ...`
   - Nếu thấy log này → CORS đang hoạt động

## Lưu ý:
- **Frontend không cần cấu hình** - tự động phát hiện backend
- Render free tier: Backend có thể sleep sau 15 phút, lần đầu wake-up mất ~30 giây
- URL được cache trong localStorage, nếu backend URL thay đổi, clear cache và refresh

