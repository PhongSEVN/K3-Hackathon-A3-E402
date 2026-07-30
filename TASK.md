# TASK.md

## Phân công công việc

### Nhi — RAG (Agentic RAG)
- Hệ thống RAG phản hồi câu hỏi nông dân (tư vấn, giải pháp, thuốc,...) kèm trích dẫn nguồn
- Làm dạng Agentic RAG
- RAG Eval dùng RAGAS
- Thư mục làm việc: chỉ `/rag`, không cần đụng thư mục khác   

### Hoàng — Computer Vision
- 2 mô hình phân loại ảnh: YOLO và ResNet, combine để phát hiện ảnh không liên quan
- Data ảnh: https://www.kaggle.com/datasets/phongnguyen1337/plant-disease-classification
- Lưu ý: bộ dữ liệu còn ảnh xấu, cần lọc trước khi train
- Thư mục làm việc chính: `/cv`, train cả 2 mô hình YOLO và ResNet tại đây

### Phúc — Human in the loop
- Trang chuyên gia, giúp response lại câu hỏi nông dân, đưa ra tư vấn đúng nhất
- Thư mục làm việc: linh hoạt ở backend và client (tương tự Linh)

### Linh — Backend & Database
- Phối hợp cùng Phong (client) và Phát
- Database: PostgreSQL, tối thiểu 2 bảng — bảng user, bảng chat
- Thư mục làm việc: linh hoạt ở backend và client
