# 🍋 Trà Chanh – Website Bán Trà Chanh

## Cài Đặt & Chạy

```bash
# 1. Clone về
git clone https://github.com/CongHoan9/ChanhTea.git
cd ChanhTea

# 2. Copy file cấu trúc Node.js vào (hoặc dùng trực tiếp)
npm install

# 3. Tạo file .env
cp .env.example .env

# 4. Chạy development
npm run dev

# 5. Hoặc chạy production
npm start
```

Mở trình duyệt: **http://localhost:3000**

---

## Cấu Trúc Thư Mục

```
chanh-tea/
├── src/
│   ├── app.js                  # Entry point
│   ├── config/
│   │   └── app.config.js       # Cấu hình chung
│   ├── controllers/
│   │   ├── pageController.js   # Render các trang HTML
│   │   ├── productController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   └── authController.js
│   ├── models/
│   │   ├── Product.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── index.js            # Page routes
│   │   └── api.js              # API routes
│   └── middleware/
│       └── auth.middleware.js
├── views/
│   ├── layouts/
│   │   ├── main.hbs
│   │   └── minimal.hbs
│   ├── partials/
│   │   ├── navbar.hbs
│   │   ├── footer.hbs
│   │   └── cart-drawer.hbs
│   └── pages/
│       ├── home.hbs
│       ├── menu.hbs
│       ├── story.hbs
│       ├── contact.hbs
│       ├── login.hbs
│       └── 404.hbs
├── public/
│   ├── css/main.css
│   ├── js/app.js
│   └── images/
├── data/
│   ├── products.json           # Dữ liệu sản phẩm
│   ├── orders.json             # Đơn hàng
│   └── users.json              # Tài khoản
├── .env
├── .gitignore
└── package.json
```

---

## API Endpoints

### Products
| Method | URL | Mô tả |
|--------|-----|-------|
| GET | `/api/products` | Lấy tất cả sản phẩm |
| GET | `/api/products?category=tra-chanh` | Lọc theo danh mục |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| GET | `/api/categories` | Danh sách danh mục |

### Cart (Session-based)
| Method | URL | Mô tả |
|--------|-----|-------|
| GET | `/api/cart` | Xem giỏ hàng |
| POST | `/api/cart/add` | Thêm vào giỏ |
| PUT | `/api/cart/update` | Cập nhật số lượng |
| DELETE | `/api/cart/remove/:key` | Xóa sản phẩm |
| DELETE | `/api/cart/clear` | Xóa toàn bộ giỏ |

### Orders
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/orders` | Tạo đơn hàng |
| GET | `/api/orders/:id` | Chi tiết đơn hàng |

### Auth
| Method | URL | Mô tả |
|--------|-----|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Thông tin user hiện tại |

---

## Tài Khoản Mặc Định

- **Email:** admin@chanhtea.vn  
- **Password:** admin123

---

## Công Nghệ Sử Dụng

- **Node.js + Express** – Server
- **express-handlebars** – Template engine
- **express-session** – Quản lý session/giỏ hàng
- **bcryptjs** – Mã hóa mật khẩu
- **JSON files** – Lưu trữ dữ liệu (có thể nâng cấp lên MongoDB)
---

## Supabase PostgreSQL & Render

### 1. Tao database tren Supabase

1. Tao project Supabase moi.
2. Vao **SQL Editor**.
3. Chay toan bo noi dung trong file `supabase/schema.sql`.
4. Vao **Project Settings > Database > Connection string** va copy URI PostgreSQL.

### 2. Cau hinh bien moi truong

Tao file `.env` tu `.env.example` khi chay local:

```bash
cp .env.example .env
```

Dat `DATABASE_URL` bang connection string Supabase:

```env
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require
SESSION_SECRET=mot-chuoi-bi-mat-dai
```

### 3. Deploy len Render

1. Push source code len GitHub.
2. Tao **Web Service** tren Render va connect repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Them environment variables tren Render:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<chuoi-bi-mat>`
   - `DATABASE_URL=<Supabase PostgreSQL connection string>`

Repo da co `render.yaml`, nen Render cung co the doc cau hinh tu file nay.
