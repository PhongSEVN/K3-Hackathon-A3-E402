# Bảng Phân Công Nhiệm Vụ Thành Viên Nhóm

## 📊 Bảng Danh Sách Thành Viên

| STT | Họ và Tên                  | Mã Sinh Viên | Vai Trò (Role)                      |    Chức Vụ    |
| :-: | ----------------------------- | :-------------: | ------------------------------------ | :--------------: |
|  1  | **Nguyễn Văn Phong**  |   2A202601241   | Frontend Developer (Client) & Leader | **Leader** |
|  2  | **Lê Thị Yến Nhi**   |   2A202601031   | AI/RAG Engineer (Agentic RAG)        |      Member      |
|  3  | **Vũ Huy Hoàng**      |   2A202601057   | AI/Computer Vision Engineer          |      Member      |
|  4  | **Nguyễn Thanh Phúc** |   2A202601345   | Backend Developer (Expert Dashboard) |      Member      |
|  5  | **Phạm Khánh Linh**   |   2A202601507   | Database & Backend Developer         |      Member      |
|  6  | **Phát**               | (Cần bổ sung) | Frontend Developer (Client)          |      Member      |

---

## 📝 Phân Công Công Việc Chi Tiết

### 1. Lê Thị Yến Nhi

- **Vai trò**: AI/RAG Engineer
- **Nhiệm vụ chính**:
  - Xây dựng hệ thống RAG (Retrieval-Augmented Generation) theo cơ chế **Agentic RAG**.
  - Xử lý luồng Chatbot phản hồi các câu hỏi của người dùng (tư vấn, giải pháp, hướng dẫn dùng thuốc bảo vệ thực vật,...).
  - Đảm bảo mọi câu trả lời của AI đều được đối chiếu và có trích dẫn nguồn thông tin chính xác.

### 2. Vũ Huy Hoàng

- **Vai trò**: AI/Computer Vision Engineer
- **Nhiệm vụ chính**:
  - Phát triển và huấn luyện **2 mô hình phân loại ảnh** (kết hợp giữa YOLO và ResNet).
  - Xử lý logic kết hợp (combine) 2 mô hình để tăng độ nhận diện và tự động phát hiện, từ chối các hình ảnh không liên quan (ảnh rác).
  - Quản lý tập dữ liệu ảnh từ Kaggle ([Link Dataset](https://www.kaggle.com/datasets/phongnguyen1337/plant-disease-classification)), phụ trách việc làm sạch (clean data) và lọc bỏ những bức ảnh chất lượng xấu.

### 3. Nguyễn Thanh Phúc

- **Vai trò**: Backend Developer (Expert Dashboard)
- **Nhiệm vụ chính**:
  - Xây dựng luồng **Human-in-the-loop** (Có sự tham gia của con người vào AI).
  - Phát triển "Trang chuyên gia" (Agronomist Dashboard) cho phép các kỹ sư/chuyên gia nông nghiệp xem xét, phản hồi (response) lại những câu hỏi của người dùng.
  - Đảm bảo hệ thống luôn có lớp kiểm duyệt cuối cùng để đưa ra tư vấn chính xác nhất.

### 4. Phạm Khánh Linh

- **Vai trò**: Database & Backend Developer
- **Nhiệm vụ chính**:
  - Thiết kế và quản trị cơ sở dữ liệu hệ thống, sử dụng hệ quản trị **PostgreSQL**.
  - Thiết kế ít nhất 2 bảng (table) cốt lõi bắt buộc phải có: Bảng `Users` (quản lý người dùng) và Bảng `Chats` (lưu trữ lịch sử hội thoại).
  - Phối hợp chặt chẽ cùng Phong và Phát để đấu nối API lấy/lưu dữ liệu chat và user lên giao diện.

### 5. Nguyễn Văn Phong (Leader)

- **Vai trò**: Project Manager, Tech Lead & Frontend Developer
- **Nhiệm vụ chính**:
  - **Quản lý dự án (Project Management):** Điều phối chung tiến độ làm bài của các thành viên, đảm bảo dự án chạy đúng timeline 1 ngày của Hackathon.
  - **Review & Check code:** Kiểm tra (review) và ghép code (merge) của tất cả các thành viên (từ Backend, AI đến UI) đảm bảo hệ thống chạy trơn tru mượt mà ("như kiểu làm hết").
  - **Phát triển Client:** Cùng với Phát xây dựng giao diện người dùng (Client-side), đấu nối API tích hợp AI và Database để hoàn thiện sản phẩm cuối cùng trình diễn.
