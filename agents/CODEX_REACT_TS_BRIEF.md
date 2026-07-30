# Codex implementation brief: VietCropDoctor React + TypeScript UI

Build a responsive React + TypeScript application that reproduces the attached VietCropDoctor screenshots.

## Visual direction

- Agricultural/medical SaaS dashboard.
- Pale green page background, darker green navigation and primary actions.
- Orange CTA on the user landing page.
- Rounded cards with thin gray-green borders and restrained shadows.
- Desktop-first layout, responsive down to tablet/mobile.
- Vietnamese UI labels.

## Main areas

### 1. User landing page

Left sidebar:
- Brand: `VietCropDoctor`
- User identity with avatar, `user1`, and role `CHUYÊN GIA NÔNG NGHIỆP`
- Primary button: `Cuộc trò chuyện mới`
- Expandable `Khu vực làm việc`
- Nested item: `Trang chuyên gia`
- Navigation items: `Lịch sử chẩn đoán`, `Cài đặt`
- Logout fixed near the bottom

Main content:
- Large drag-and-drop crop-image upload panel
- Welcome headline: `Chào mừng bạn đến với VietCropDoctor.`
- Supporting paragraph
- Orange rounded CTA: `Bắt đầu trò chuyện tạm thời`
- Four quick suggestion cards

### 2. Expert dashboard

Sidebar:
- Brand: `Expert Console`
- Items: `Tổng quan`, `Hàng đợi xử lý`, `Tất cả ảnh`, `Thống kê`, `Chuyên gia`
- Queue item has a red badge count
- User role and return-to-app link at the bottom

Dashboard content:
- Header with refresh and notification buttons
- Six KPI cards
- Three analytics cards:
  - Requests over seven days
  - Disease distribution
  - Top crop types
- Latest requests table

Use a chart library such as Recharts for the three charts.

### 3. Processing queue

Toolbar:
- Search input
- Status filter
- Crop filter
- Sort selector
- Total result count

Table columns:
- Image
- Sender
- Crop type
- AI diagnosis
- Description
- Status
- Priority
- Time

Status pill variants:
- `Chưa xử lý`: amber
- `Đang xử lý`: blue
- `Đã phản hồi`: green
- `Ảnh không liên quan`: red

Clicking a row opens the case-details modal.

### 4. Case-details modal

Two-column desktop layout.

Left:
- Large submitted image
- Button to mark image as irrelevant
- Sender, submitted time, crop type, status, and priority metadata

Right:
- Expert-response history
- Expert comment textarea
- Disease selector/input
- Treatment method input
- Illustration image URLs input
- Checkbox to mark complete and add label to training set
- Submit response button
- Private internal note input and save button

## Suggested React structure

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    layout/
      AppSidebar.tsx
      ExpertSidebar.tsx
      PageHeader.tsx
    common/
      Button.tsx
      Card.tsx
      StatusBadge.tsx
      DataTable.tsx
      Modal.tsx
    dashboard/
      StatCard.tsx
      RequestsLineChart.tsx
      DiseasePieChart.tsx
      CropBarChart.tsx
    diagnosis/
      UploadDropzone.tsx
      QuickSuggestionCard.tsx
      QueueFilters.tsx
      DiagnosisCaseModal.tsx
  pages/
    HomePage.tsx
    ExpertDashboardPage.tsx
    ExpertQueuePage.tsx
  data/
    mockCases.ts
  types/
    diagnosis.ts
  styles/
    globals.css
```

## TypeScript models

```ts
export type DiagnosisStatus =
  | "pending"
  | "processing"
  | "responded"
  | "irrelevant";

export type Priority = "normal" | "high";

export interface DiagnosisCase {
  id: string;
  imageUrl: string;
  senderName: string;
  cropType: string;
  aiDiagnosis: string;
  confidence: number;
  description?: string;
  status: DiagnosisStatus;
  priority: Priority;
  submittedAt: string;
}
```

## Functional requirements

- Use React Router with routes:
  - `/`
  - `/expert/dashboard`
  - `/expert/queue`
- Keep mock data in TypeScript modules.
- Search and filters work locally.
- Table rows are keyboard accessible.
- Modal closes by close button, backdrop click, and Escape.
- Drag-and-drop upload has hover/drag-active state.
- Preserve semantic HTML and accessible labels.
- Avoid hard-coded screen coordinates.
- Use CSS Grid/Flexbox.
- Use Lucide React icons.
- Prefer reusable primitives rather than page-specific duplicated markup.

## Styling tokens

```css
--green-900: #0b5f2a;
--green-800: #087a33;
--green-700: #07923d;
--green-100: #edf8e8;
--green-050: #f7fcf4;
--orange: #ff9428;
--text: #172018;
--muted: #697269;
--line: #d7dfd2;
--danger: #c91e2f;
--warning: #f2a21a;
--info: #2f74d0;
--radius: 12px;
```

## Codex prompt

Create the React + TypeScript implementation from this specification and the reference screenshots. Use Vite, React Router, Recharts, and Lucide React. Produce complete source files, mock data, responsive CSS, and run instructions. Match spacing, hierarchy, green/orange palette, sidebar behavior, filters, status badges, dashboard cards, charts, data table, and diagnosis-details modal. Do not use a component library unless necessary. Keep components reusable, typed, and accessible.
