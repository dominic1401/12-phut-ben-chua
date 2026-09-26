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

- Bảy bản nhạc Taizé 12 phút nằm trong `public/audio/` và được chọn cố định theo
  từng ngày trong tuần, dựa trên múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
- Nhạc được chọn lúc mở trang và khi bắt đầu một phiên mới; qua nửa đêm trong
  lúc cầu nguyện không đổi bài. Chỉ tải bản của ngày được chọn. Nếu lỗi tải,
  trình phát thử bản dự phòng cũ tại `public/taize-prayer-12-min.mp3` một lần.
- Trên Vercel Preview hoặc bản phát triển, thêm `?audioDay=monday` (hoặc
  `sunday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`) để nghe
  thử từng ngày. Tham số này không thay đổi nhạc trên Production.
- Bản nhạc xuất ở 128 kbps, 44.1 kHz stereo; âm lượng được cân bằng bằng
  gain cố định để giữ độ động. Bảy bản phối dùng đủ 19 bài trong tệp nguồn,
  với ba bài được dùng lại vào ngày khác. Khoảng lặng giữa bài khoảng 1,5–3,6 giây.
- `docs/weekly-audio.json` ghi mốc cắt, thông số và mã kiểm tra của từng bản.
  Để dựng lại: `python3 scripts/build-weekly-audio.py /path/to/taize.mp3`
  (cần FFmpeg). Tệp nguồn đầy đủ không nằm trong repository.
- Kiểm tra chọn ngày: `node --experimental-strip-types --test tests/weekly-audio.test.mjs`
  (Node.js 22.6+). Build: `npm run build`.
- API bài đọc nằm tại `app/api/reading/route.ts`.
- Khi cập nhật mã nguồn trên GitHub, Vercel sẽ tự triển khai lại.
