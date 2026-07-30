import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ChatHistoryContextValue {
  conversations: ChatHistoryItem[];
  getConversation: (id: string | undefined) => ChatHistoryItem | undefined;
}

const STORAGE_KEY = 'hackathon_mini_chat_history';

const sampleConversations: ChatHistoryItem[] = [
  {
    id: 'plant-leaf-disease',
    title: 'Nhận biết bệnh trên lá cây',
    updatedAt: 'Hôm nay',
    messages: [
      { id: '1', role: 'user', content: 'Lá lúa có vết hình thoi, giữa xám tro và viền nâu thì có thể bị gì?' },
      {
        id: '2',
        role: 'assistant',
        content: 'Các dấu hiệu bạn mô tả có thể phù hợp với bệnh đạo ôn lá. Hãy kiểm tra thêm xem vết bệnh có lan nhanh khi thời tiết ẩm hay không và gửi ảnh cận cảnh để được tư vấn chính xác hơn.',
      },
    ],
  },
  {
    id: 'corn-rust',
    title: 'Cách xử lý rỉ sắt trên ngô',
    updatedAt: 'Hôm qua',
    messages: [
      { id: '1', role: 'user', content: 'Lá ngô xuất hiện các chấm nâu cam nhỏ ở cả hai mặt lá.' },
      {
        id: '2',
        role: 'assistant',
        content: 'Đây có thể là triệu chứng bệnh rỉ sắt ngô. Bạn nên theo dõi mức độ lan rộng, vệ sinh tàn dư bệnh và tham khảo cán bộ bảo vệ thực vật địa phương trước khi dùng thuốc.',
      },
    ],
  },
  {
    id: 'coffee-rust',
    title: 'Đốm vàng cam trên cà phê',
    updatedAt: 'Tuần trước',
    messages: [
      { id: '1', role: 'user', content: 'Mặt dưới lá cà phê có nhiều bột màu vàng cam.' },
      {
        id: '2',
        role: 'assistant',
        content: 'Triệu chứng này thường gặp ở bệnh rỉ sắt cà phê. Nên tỉa cành cho vườn thông thoáng, thu gom lá bệnh và xác nhận lại với chuyên gia nếu bệnh lan mạnh.',
      },
    ],
  },
];

const ChatHistoryContext = createContext<ChatHistoryContextValue | undefined>(undefined);

function loadConversations(): ChatHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ChatHistoryItem[]) : sampleConversations;
  } catch {
    return sampleConversations;
  }
}

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [conversations] = useState<ChatHistoryItem[]>(loadConversations);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  const value = useMemo(
    () => ({
      conversations,
      getConversation: (id: string | undefined) => conversations.find((conversation) => conversation.id === id),
    }),
    [conversations],
  );

  return <ChatHistoryContext.Provider value={value}>{children}</ChatHistoryContext.Provider>;
}

export function useChatHistory(): ChatHistoryContextValue {
  const context = useContext(ChatHistoryContext);
  if (!context) throw new Error('useChatHistory must be used within ChatHistoryProvider');
  return context;
}
