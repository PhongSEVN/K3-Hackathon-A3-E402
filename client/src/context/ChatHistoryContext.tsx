import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { sendChatMessage } from '../lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  imageUrl?: string;
  isSample?: boolean;
  messages: ChatMessage[];
}

interface ChatHistoryContextValue {
  conversations: ChatHistoryItem[];
  getConversation: (id: string | undefined) => ChatHistoryItem | undefined;
  addConversation: (item: ChatHistoryItem) => void;
  sendMessage: (conversationId: string | undefined, content: string) => Promise<string>;
  deleteConversation: (id: string) => void;
  clearConversations: () => void;
}

const STORAGE_KEY = 'hackathon_mini_chat_history';
const SAMPLE_IDS = new Set(['plant-leaf-disease', 'corn-rust', 'coffee-rust']);
const sampleConversations: ChatHistoryItem[] = [
  {
    id: 'plant-leaf-disease', title: 'Nhận biết bệnh trên lá cây', updatedAt: 'Mẫu', isSample: true,
    messages: [
      { id: 'sample-1-user', role: 'user', content: 'Lá lúa có vết hình thoi, giữa xám tro và viền nâu thì có thể bị gì?' },
      { id: 'sample-1-ai', role: 'assistant', content: 'Các dấu hiệu bạn mô tả có thể phù hợp với bệnh đạo ôn lá. Hãy kiểm tra thêm xem vết bệnh có lan nhanh khi thời tiết ẩm hay không và gửi ảnh cận cảnh để được tư vấn chính xác hơn.' },
    ],
  },
  {
    id: 'corn-rust', title: 'Cách xử lý rỉ sắt trên ngô', updatedAt: 'Mẫu', isSample: true,
    messages: [
      { id: 'sample-2-user', role: 'user', content: 'Lá ngô xuất hiện các chấm nâu cam nhỏ ở cả hai mặt lá.' },
      { id: 'sample-2-ai', role: 'assistant', content: 'Đây có thể là triệu chứng bệnh rỉ sắt ngô. Bạn nên theo dõi mức độ lan rộng, vệ sinh tàn dư bệnh và tham khảo cán bộ bảo vệ thực vật địa phương trước khi dùng thuốc.' },
    ],
  },
  {
    id: 'coffee-rust', title: 'Đốm vàng cam trên cà phê', updatedAt: 'Mẫu', isSample: true,
    messages: [
      { id: 'sample-3-user', role: 'user', content: 'Mặt dưới lá cà phê có nhiều bột màu vàng cam.' },
      { id: 'sample-3-ai', role: 'assistant', content: 'Triệu chứng này thường gặp ở bệnh rỉ sắt cà phê. Nên tỉa cành cho vườn thông thoáng, thu gom lá bệnh và xác nhận lại với chuyên gia nếu bệnh lan mạnh.' },
    ],
  },
];

const ChatHistoryContext = createContext<ChatHistoryContextValue | undefined>(undefined);

function loadConversations(): ChatHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const saved = stored ? (JSON.parse(stored) as ChatHistoryItem[]) : [];
    const realConversations = saved.filter(
      conversation => !conversation.isSample && !SAMPLE_IDS.has(conversation.id),
    );
    return [...realConversations, ...sampleConversations];
  } catch {
    return sampleConversations;
  }
}

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ChatHistoryItem[]>(loadConversations);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  const value = useMemo(() => {
    const sendMessage = async (conversationId: string | undefined, content: string): Promise<string> => {
      const trimmed = content.trim();
      const id = conversationId ?? crypto.randomUUID();
      const existing = conversations.find((item) => item.id === id);
      const history = existing?.messages ?? [];
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed };

      setConversations((current) => {
        const found = current.find((item) => item.id === id);
        if (found) {
          return current.map((item) =>
            item.id === id
              ? { ...item, updatedAt: 'Vừa xong', messages: [...item.messages, userMessage] }
              : item,
          );
        }
        return [
          {
            id,
            title: trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed,
            updatedAt: 'Vừa xong',
            messages: [userMessage],
          },
          ...current,
        ];
      });

      try {
        const response = await sendChatMessage(
          trimmed,
          history.map(({ role, content: historyContent }) => ({ role, content: historyContent })),
        );
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.answer,
        };
        setConversations((current) =>
          current.map((item) =>
            item.id === id ? { ...item, messages: [...item.messages, assistantMessage] } : item,
          ),
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Không thể kết nối tới mô hình.';
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Không thể trả lời lúc này: ${detail}`,
        };
        setConversations((current) =>
          current.map((item) =>
            item.id === id ? { ...item, messages: [...item.messages, errorMessage] } : item,
          ),
        );
      }
      return id;
    };

    return {
      conversations,
      getConversation: (id: string | undefined) => conversations.find((conversation) => conversation.id === id),
      addConversation: (item: ChatHistoryItem) => {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === item.id);
          if (exists) {
            return prev.map((c) => (c.id === item.id ? item : c));
          }
          return [item, ...prev];
        });
      },
      sendMessage,
      deleteConversation: (id: string) => {
        setConversations((current) => current.filter((conversation) => conversation.id !== id));
      },
      clearConversations: () => setConversations([]),
    };
  }, [conversations]);

  return <ChatHistoryContext.Provider value={value}>{children}</ChatHistoryContext.Provider>;
}

export function useChatHistory(): ChatHistoryContextValue {
  const context = useContext(ChatHistoryContext);
  if (!context) throw new Error('useChatHistory must be used within ChatHistoryProvider');
  return context;
}
