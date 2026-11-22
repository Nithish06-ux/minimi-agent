import { AgentStep, ChatResponsePayload, Conversation } from '../types/index.js';

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) throw new Error('Failed to load conversations');
  const data = await res.json();
  return data.data;
}

export async function fetchConversation(id: string) {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) throw new Error('Failed to load conversation');
  const data = await res.json();
  return data.data;
}

export async function createConversation(title?: string): Promise<Conversation> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create conversation');
  const data = await res.json();
  return data.data;
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete conversation');
}

export async function sendMessage(
  message: string,
  conversationId?: string,
  callbacks?: {
    onStep?: (step: AgentStep) => void;
    onComplete?: (result: ChatResponsePayload) => void;
    onError?: (err: Error) => void;
  }
): Promise<ChatResponsePayload> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationId,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.error || `Request failed with status ${response.status}`);
    callbacks?.onError?.(err);
    throw err;
  }

  // Parse Server-Sent Events stream
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: ChatResponsePayload | null = null;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const eventMatch = line.match(/^event: (.*)$/m);
        const dataMatch = line.match(/^data: (.*)$/m);

        if (eventMatch && dataMatch) {
          const eventType = eventMatch[1].trim();
          const eventData = JSON.parse(dataMatch[1]);

          if (eventType === 'step') {
            callbacks?.onStep?.(eventData);
          } else if (eventType === 'response') {
            finalResult = eventData as ChatResponsePayload;
            callbacks?.onComplete?.(finalResult);
          } else if (eventType === 'error') {
            const err = new Error(eventData.message || 'Streaming error');
            callbacks?.onError?.(err);
            throw err;
          }
        }
      }
    }
  }

  if (!finalResult) {
    throw new Error('Completed without final response payload');
  }

  return finalResult;
}
