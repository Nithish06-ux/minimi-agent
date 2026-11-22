import React from 'react';
import { useChat } from './hooks/useChat.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatWindow } from './components/ChatWindow.js';

export const App: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    messages,
    currentSteps,
    isLoading,
    selectConversation,
    newConversation,
    deleteConversation,
    sendMessage,
  } = useChat();

  const activeConv = conversations.find(c => c.id === currentConversationId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      <Sidebar
        conversations={conversations}
        activeId={currentConversationId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
      />
      <ChatWindow
        messages={messages}
        steps={currentSteps}
        isLoading={isLoading}
        onSend={sendMessage}
        title={activeConv?.title}
      />
    </div>
  );
};

export default App;
