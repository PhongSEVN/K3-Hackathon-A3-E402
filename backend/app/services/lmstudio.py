import asyncio
import json
import urllib.error
import urllib.request

from app.core.config import settings
from app.schemas.chat import ChatMessage


SYSTEM_PROMPT = """Bạn là trợ lý nông nghiệp cho nông dân Việt Nam.
Trả lời ngắn gọn, rõ ràng bằng ngôn ngữ của người dùng.
Không khẳng định chẩn đoán chắc chắn khi thiếu ảnh hoặc triệu chứng.
Không tự đặt liều thuốc bảo vệ thực vật; nhắc người dùng làm theo nhãn và hỏi cán bộ BVTV địa phương."""


class LMStudioError(RuntimeError):
    pass


def _completion_url() -> str:
    return f"{settings.active_llm_base_url}/chat/completions"


def _complete_sync(message: str, history: list[ChatMessage]) -> str:
    provider = settings.llm_provider
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(
        item.model_dump()
        for item in history[-settings.llm_history_messages :]
        if item.role != "system"
    )
    messages.append({"role": "user", "content": message})
    payload = {
        "model": settings.active_llm_model,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": settings.llm_max_tokens,
        "stream": False,
    }
    headers = {"Content-Type": "application/json"}
    if settings.active_llm_api_key:
        headers["Authorization"] = f"Bearer {settings.active_llm_api_key}"

    request = urllib.request.Request(
        _completion_url(),
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=settings.llm_timeout_seconds) as response:
            data = json.loads(response.read().decode("utf-8"))
        answer = data["choices"][0]["message"]["content"].strip()
        if not answer:
            raise LMStudioError(f"{provider} returned an empty response.")
        return answer
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise LMStudioError(f"{provider} returned HTTP {exc.code}: {detail[:500]}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise LMStudioError(
            f"Cannot reach {provider} at {_completion_url()}. "
            "Check the provider configuration and server availability."
        ) from exc
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        raise LMStudioError(f"{provider} returned an unexpected response format.") from exc


async def complete(message: str, history: list[ChatMessage]) -> str:
    return await asyncio.to_thread(_complete_sync, message, history)
