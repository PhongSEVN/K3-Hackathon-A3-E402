import type { ChatMessage } from '../context/ChatHistoryContext';
import type { ChatMessageResponse } from './api';

// One backend row is one Q/A turn; the frontend models question and answer
// as separate bubbles. System-generated entries (a diagnosis summary from
// /predictions, or a chuyên gia reply from the agronomist route) carry an
// empty question — skip the user bubble for those, only the answer shows.
export function chatResponseToEntries(response: ChatMessageResponse): ChatMessage[] {
  const entries: ChatMessage[] = [];
  if (response.question) {
    entries.push({ id: `${response.id}-q`, role: 'user', content: response.question });
  }
  if (response.answer) {
    entries.push({
      id: response.id,
      role: 'assistant',
      content: response.answer,
      citations: response.citations,
      confidence: response.confidence,
      needsHumanReview: response.needs_human_review,
      answeredByName: response.answered_by_name,
    });
  }
  return entries;
}
