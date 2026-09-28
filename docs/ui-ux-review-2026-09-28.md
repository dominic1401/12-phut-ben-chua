# Rà soát UI/UX — 28/09/2026

Phạm vi: giao diện hiện hành trên trình duyệt desktop, luồng cầu nguyện, mã responsive, các trạng thái bản văn/phiên cầu nguyện và kiểm tra tương tác bằng DOM mô phỏng. Chưa kiểm tra trực tiếp trên iPhone/Android thật; không coi rà soát mã responsive là kiểm thử thiết bị.

## Các thay đổi trong đợt này

| Hạng mục | Vấn đề xác nhận | Điều chỉnh |
| --- | --- | --- |
| Bước 3 — Suy niệm | Hai thẻ nằm sau lời nguyện, co theo nhãn khi đóng và nở ngang khi mở. Thẻ Tin Mừng đo được khoảng 203 px, trong khi bản văn mở rộng 650 px trên desktop. | Gom thành nhóm “Đọc thêm để suy niệm”, cùng chiều rộng với nội dung, nằm sau hướng dẫn và trước lời nguyện. Cả hai vẫn đóng mặc định. |
| Đọc bài dài | Đồng hồ vẫn chạy khi bản văn mở; chế độ tự động có thể chuyển bước giữa lúc đọc. | Mở một bản văn sẽ tạm dừng phiên và nhạc. Thu gọn không tự chạy lại; người đọc chọn “Tiếp tục cầu nguyện” khi sẵn sàng. |
| Tạm dừng | Chỉ biểu tượng phát thay đổi, thiếu thông báo bằng chữ. | Hiển thị trạng thái và nút tiếp tục trong thanh điều khiển. Khi tiếp tục sau khi đọc, thu gọn bản văn và đưa tiêu điểm về tiêu đề suy niệm. |
| Bản văn dài | Phải cuộn lên đầu để thu gọn. | Thêm nút thu gọn cuối mỗi bản văn; đưa tiêu điểm về đúng mục vừa đóng. Bản văn vẫn cuộn cùng trang. |
| Ý nghĩa đồng hồ | Chế độ tự động và tự chuyển hiển thị hai loại thời gian nhưng thiếu nhãn. | Thêm “Còn lại” / “Gợi ý cho bước này”; thống nhất cỡ số rõ hơn. |
| Bản văn dự phòng | Ở bước 3 chưa nhắc rõ đây là câu Lời Chúa thay thế. | Ghi “Bản văn thay thế” ngay dưới mục đọc lại. Không hiển thị bài suy niệm khi dữ liệu không có. |
| Tùy chỉnh | Trang phía sau hộp thoại vẫn có thể cuộn. Trạng thái nhạc khi tạm dừng ghi “Sẵn sàng phát”. | Khóa cuộn nền khi mở hộp thoại, khôi phục khi đóng; nhãn nhạc phản ánh trạng thái tạm dừng. |

## Những phần đã rà soát và giữ nguyên

- Nhận diện Chi-Rho, màu nền ấm và phông chữ hỗ trợ đầy đủ dấu tiếng Việt.
- Nút bắt đầu nằm trước nội dung Tin Mừng; tùy chỉnh nhạc đóng mặc định.
- Bản văn Tin Mừng và bài suy niệm giữ nguyên nội dung/đoạn/tác giả, không thêm liên kết nguồn trở lại.
- Sáu bước có nút tiến/lùi, tên bước và chỉ báo tiến độ. Thanh điều khiển có vùng chạm tối thiểu 44 px; khoảng cuối nội dung tăng khi xuất hiện thông báo tạm dừng.
- Các mục đọc thêm dùng `details`/`summary` bản địa, hỗ trợ bàn phím và trạng thái mở/đóng; tiêu điểm được trả lại sau khi thu gọn.
- Chữ bản văn có ba cỡ, giao diện sáng/tối và chế độ giảm chuyển động được giữ nguyên.
- Phiên đang dở vẫn giữ ngày, bản văn, nhạc và vị trí; không cộng thời gian đọc thêm khi đã tạm dừng.
- Không khôi phục ô viết quyết tâm đã được yêu cầu bỏ.

## Bằng chứng kiểm tra

- `npm run build`: đạt; TypeScript: đạt.
- `node --experimental-strip-types --test tests/*.test.mjs`: 21/21 đạt, gồm lưu/khôi phục phiên, ngày Việt Nam, bản văn dự phòng, nhạc theo tuần và xử lý offline.
- Kiểm tra tương tác React trong JSDOM: hai mục đóng mặc định; mở một/hai mục; đồng hồ và dữ liệu lưu không chạy thêm sau 600 giây mô phỏng; thu gọn trả tiêu điểm; tiếp tục thu gọn các mục; tạm dừng thủ công vẫn được giữ; khóa/mở cuộn hộp thoại; đi hết sáu bước; dữ liệu lỗi chỉ hiện bản văn thay thế.

## Kiểm tra tiếp trên thiết bị thật

Ưu tiên Safari iPhone và Chrome Android ở màn hình hẹp, chữ lớn, thanh địa chỉ tự thu gọn và vùng an toàn dưới màn hình. Kiểm tra phát nhạc khi khóa màn hình/chuyển ứng dụng, cài PWA và mất mạng trên thiết bị thật trước khi kết luận các tình huống này hoạt động đồng nhất giữa trình duyệt. Đợt này chưa đo Lighthouse hay có dữ liệu sử dụng để kết luận về hiệu năng thực tế.
