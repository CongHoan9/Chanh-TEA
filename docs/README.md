# ChanhTea Docs

Tài liệu trong thư mục này được tách theo mục đích đọc:

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md): hạ tầng, stack, database module, deploy, bảo mật.
- [BUSINESS_PROCESSES.md](./BUSINESS_PROCESSES.md): quy trình nghiệp vụ, phân quyền, vòng đời đơn hàng, dashboard cửa hàng/admin.
- [DOM_CONTRACT.md](./DOM_CONTRACT.md): các vùng DOM/hook đã chuẩn bị để nối API và dashboard sau này.

Đọc nhanh theo thứ tự:

1. `INFRASTRUCTURE.md` để biết hệ thống nên xây bằng gì.
2. `BUSINESS_PROCESSES.md` để biết hệ thống vận hành như thế nào.
3. `DOM_CONTRACT.md` để biết frontend hiện có những hook nào.

Nguyên tắc phát triển: mọi tính năng mới phải trả lời được hai câu hỏi:

- Nó thuộc module hạ tầng/dữ liệu nào?
- Nó phục vụ quy trình nghiệp vụ nào?
