# Facebook Ads Manager

Ứng dụng quản lý tài khoản quảng cáo Facebook với giao diện hiện đại và đầy đủ tính năng.

## Tính năng

- 📊 **Dashboard**: Tổng quan về hiệu suất quảng cáo
- 👥 **Quản lý Tài khoản**: Xem và quản lý các tài khoản quảng cáo Facebook
  - ✅ **Đăng nhập Facebook**: Đăng nhập và chọn page để tự động lấy tài khoản quảng cáo
  - 🔑 **Nhập thủ công**: Nhập Account ID và Access Token thủ công
- 📢 **Chiến dịch**: Quản lý các chiến dịch quảng cáo
- 📈 **Quảng cáo**: Xem và quản lý các quảng cáo cụ thể
- 📉 **Phân tích**: Phân tích chi tiết hiệu suất với biểu đồ và thống kê

## Công nghệ sử dụng

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts (cho biểu đồ)
- Lucide React (icons)

### Backend
- Node.js
- Express
- TypeScript
- Facebook Graph API

## Cài đặt

### Yêu cầu
- Node.js 18+ 
- npm hoặc yarn

### Bước 1: Cài đặt dependencies

```bash
npm run install:all
```

Hoặc cài đặt từng phần:

```bash
# Root
npm install

# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### Bước 2: Cấu hình Facebook App

#### Tạo Facebook App

1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo một ứng dụng mới (chọn loại "Business")
3. Thêm sản phẩm "Facebook Login"
4. Cấu hình OAuth Redirect URIs:
   - Thêm `http://localhost:3000` vào "Valid OAuth Redirect URIs"
   - Thêm domain production của bạn (nếu có)

#### Cấu hình Frontend

Tạo file `.env` trong thư mục `frontend`:

```env
VITE_FACEBOOK_APP_ID=your_facebook_app_id
```

#### Cấu hình Backend (Tùy chọn)

Tạo file `.env` trong thư mục `backend`:

```env
PORT=3001
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

**Lưu ý**: 
- Facebook App ID là bắt buộc để sử dụng tính năng đăng nhập Facebook
- Nếu không cấu hình, bạn vẫn có thể sử dụng tính năng "Nhập thủ công"

### Bước 3: Chạy ứng dụng

Chạy cả frontend và backend cùng lúc:

```bash
npm run dev
```

Hoặc chạy riêng biệt:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Ứng dụng sẽ chạy tại:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Cấu trúc dự án

```
facebook-ads-manager/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── ...
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── index.ts
│   └── package.json
└── package.json
```

## API Endpoints

### Accounts
- `GET /api/accounts` - Lấy danh sách tài khoản
- `GET /api/accounts/:id` - Lấy chi tiết tài khoản
- `POST /api/accounts` - Thêm tài khoản mới

### Campaigns
- `GET /api/campaigns` - Lấy danh sách chiến dịch
- `GET /api/campaigns/:id` - Lấy chi tiết chiến dịch
- `POST /api/campaigns` - Tạo chiến dịch mới
- `PUT /api/campaigns/:id` - Cập nhật chiến dịch
- `DELETE /api/campaigns/:id` - Xóa chiến dịch

### Ads
- `GET /api/ads` - Lấy danh sách quảng cáo
- `GET /api/ads/:id` - Lấy chi tiết quảng cáo
- `POST /api/ads` - Tạo quảng cáo mới
- `PUT /api/ads/:id` - Cập nhật quảng cáo
- `DELETE /api/ads/:id` - Xóa quảng cáo

### Insights
- `GET /api/insights` - Lấy thống kê tổng quan
- `GET /api/insights/account/:accountId` - Lấy thống kê theo tài khoản

## Phát triển

### Build cho production

```bash
npm run build
```

### Chạy production

```bash
# Backend
cd backend
npm start

# Frontend (sau khi build)
cd frontend
npm run preview
```

## Cách sử dụng

### Thêm Tài khoản Quảng cáo

#### Cách 1: Đăng nhập Facebook (Khuyến nghị)

1. Click nút "Thêm tài khoản" trên trang Accounts
2. Chọn tab "Đăng nhập Facebook"
3. Click "Đăng nhập với Facebook" và cấp quyền
4. Chọn Page của bạn từ danh sách
5. Chọn Tài khoản Quảng cáo từ Page đã chọn
6. Hệ thống sẽ tự động thêm tài khoản vào

#### Cách 2: Nhập thủ công

1. Click nút "Thêm tài khoản" trên trang Accounts
2. Chọn tab "Nhập thủ công"
3. Nhập Account ID và Access Token
4. (Tùy chọn) Nhập tên tài khoản
5. Click "Thêm tài khoản"

## Lưu ý

- **Facebook App ID**: Cần cấu hình để sử dụng tính năng đăng nhập Facebook
- **Quyền cần thiết**: Khi đăng nhập, ứng dụng sẽ yêu cầu các quyền:
  - `pages_read_engagement`: Đọc thông tin page
  - `pages_show_list`: Xem danh sách pages
  - `ads_read`: Đọc thông tin quảng cáo
  - `ads_management`: Quản lý quảng cáo
  - `business_management`: Quản lý business
- **Mock Data**: Ứng dụng sẽ sử dụng mock data khi không có tài khoản nào được thêm vào
- **Access Token**: Nếu nhập thủ công, đảm bảo Access Token có các quyền cần thiết

## License

MIT

