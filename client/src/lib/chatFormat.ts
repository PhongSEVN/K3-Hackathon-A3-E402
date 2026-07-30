import type { ChatCitation } from './api';

export function formatAssistantContent(
  content: string,
  citations: ChatCitation[] | undefined,
  needsHumanReview: boolean | undefined
): string {
  let footer = '';

  if (citations && citations.length > 0) {
    const lines = citations.map((citation) => {
      const label = citation.source_file || citation.relative_path;
      const url = citation.source_urls[0];
      return url ? `- [${label}](${url})` : `- ${label}`;
    });
    footer += `\n\n**Nguồn tham khảo:**\n${lines.join('\n')}`;
  }

  if (needsHumanReview) {
    footer += '\n\n> ⚠️ Độ tin cậy thấp, câu trả lời này sẽ được chuyên gia nông nghiệp xem xét thêm.';
  }

  return `${content}${footer}`;
}
