import { useState, useEffect, useCallback } from 'react';
import {
  fetchConversations,
  fetchConversation,
  createConversation,
  deleteConversation as apiDeleteConversation,
  sendMessage as apiSendMessage,
} from '../services/api.js';
import { AgentStep, Conversation, Message } from '../types/index.js';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSteps, setCurrentSteps] = useState<AgentStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const selectConversation = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentSteps([]);
      const data = await fetchConversation(id);
      setCurrentConversationId(id);
      setMessages(data.messages || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const newConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      const conv = await createConversation('New Research Session');
      setConversations(prev => [conv, ...prev]);
      setCurrentConversationId(conv.id);
      setMessages([]);
      setCurrentSteps([]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteConv = useCallback(async (id: string) => {
    try {
      await apiDeleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [currentConversationId]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setCurrentSteps([]);

    // Optimistically add user message to list
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: currentConversationId || '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const result = await apiSendMessage(text, currentConversationId || undefined, {
        onStep: (step) => {
          setCurrentSteps(prev => [...prev, step]);
        },
      });

      // Update current conversation ID if this was a new conversation
      if (!currentConversationId || currentConversationId !== result.conversationId) {
        setCurrentConversationId(result.conversationId);
      }

      // Add assistant response to messages
      const assistantMsg: Message = {
        id: result.messageId,
        conversationId: result.conversationId,
        role: 'assistant',
        content: result.response,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Refresh conversations list to update title/timestamps
      loadConversations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [currentConversationId, isLoading, loadConversations]);

  return {
    conversations,
    currentConversationId,
    messages,
    currentSteps,
    isLoading,
    error,
    selectConversation,
    newConversation,
    deleteConversation: deleteConv,
    sendMessage: send,
  };
}
