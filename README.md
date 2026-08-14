# 12 Phút Bên Chúa — bản Netlify

Gói này giữ nguyên giao diện cầu nguyện 12 phút, trình phát MP3 trực tiếp và API đồng bộ Tin Mừng hằng ngày.

## Cách triển khai được khuyến nghị

Netlify cần chạy bước build để tạo API đồng bộ bài đọc. Vì vậy, không thả trực tiếp tệp ZIP vào Netlify Drop.

1. Giải nén gói này.
2. Đưa toàn bộ thư mục lên một repository GitHub mới.
3. Trong Netlify, chọn **Add new project → Import an existing project → GitHub**.
4. Chọn repository vừa tạo. Netlify sẽ đọc `netlify.toml` tự động.
5. Xác nhận:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Chọn **Deploy**.

Không cần khai báo biến môi trường.

## Chạy thử trên máy

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Lưu ý

- Tệp nhạc nằm tại `public/taize-prayer-12-min.mp3`.
- API bài đọc nằm tại `app/api/reading/route.ts`.
- Khi cập nhật mã nguồn trên GitHub, Netlify sẽ tự triển khai lại.
