import type { ChatCitation } from './api';

// Every ingested document is a curated per-disease summary literally named
// "text.txt" (see rag/ingest/ingest.py), so citation.source_file is never a
// useful label. Prefer the source site's domain, then the disease/crop
// folder name from relative_path, before ever falling back to the filename.
function citationLabel(citation: ChatCitation): string {
  const url = citation.source_urls[0];
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      // not a valid absolute URL — fall through to folder name
    }
  }
  const folder = citation.relative_path.split('/').at(-2);
  return folder || citation.source_file || citation.relative_path;
}

export function formatAssistantContent(content: string, citations: ChatCitation[] | undefined): string {
  if (!citations || citations.length === 0) return content;

  const lines = citations.map((citation) => {
    const label = citationLabel(citation);
    const url = citation.source_urls[0];
    return url ? `- [${label}](${url})` : `- ${label}`;
  });

  return `${content}\n\n**Nguồn tham khảo:**\n${lines.join('\n')}`;
}

export function formatExpertReply(answeredByName: string, content: string): string {
  return `**🧑‍🌾 Chuyên gia ${answeredByName} đã phản hồi:**\n\n${content}`;
}
