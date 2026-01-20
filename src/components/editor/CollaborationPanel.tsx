import React, { useEffect, useState, useRef } from 'react';
import { WebrtcProvider } from 'y-webrtc';
import * as Y from 'yjs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User as UserIcon, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: string;
  senderColor: string;
  content: string;
  timestamp: number;
}

interface UserState {
  user: {
    name: string;
    color: string;
  };
}

interface CollaborationPanelProps {
  provider: WebrtcProvider | null;
  ydoc: Y.Doc;
  currentUser: { name: string; id: string };
  isOpen: boolean;
  onClose: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  provider,
  ydoc,
  currentUser,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserState[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync Users
  useEffect(() => {
    if (!provider) return;

    const updateUsers = () => {
      const states = provider.awareness.getStates();
      const userList: UserState[] = [];
      states.forEach((state: any) => {
        if (state.user) {
          userList.push(state as UserState);
        }
      });
      setUsers(userList);
    };

    updateUsers();
    provider.awareness.on('change', updateUsers);

    return () => {
      provider.awareness.off('change', updateUsers);
    };
  }, [provider]);

  // Sync Chat
  useEffect(() => {
    const yChat = ydoc.getArray<ChatMessage>('chat');
    
    const updateMessages = () => {
      setMessages(yChat.toArray());
      // Auto scroll to bottom
      if (scrollRef.current) {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
    };

    updateMessages();
    yChat.observe(updateMessages);

    return () => {
      yChat.unobserve(updateMessages);
    };
  }, [ydoc]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const yChat = ydoc.getArray<ChatMessage>('chat');
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: currentUser.name,
      senderColor: users.find(u => u.user.name === currentUser.name)?.user.color || '#ccc',
      content: inputValue.trim(),
      timestamp: Date.now()
    };

    yChat.push([newMessage]);
    setInputValue('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-background border rounded-lg shadow-xl flex flex-col z-50 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'chat' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('chat')}
            className="h-7 text-xs"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            聊天
          </Button>
          <Button 
            variant={activeTab === 'users' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('users')}
            className="h-7 text-xs"
          >
            <UserIcon className="w-3 h-3 mr-1" />
            在线 ({users.length})
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-background">
        {activeTab === 'chat' ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex flex-col", msg.sender === currentUser.name ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] text-muted-foreground">{msg.sender}</span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div 
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm max-w-[85%] break-words",
                        msg.sender === currentUser.name 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted text-foreground rounded-tl-none"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </div>
            <div className="p-3 border-t bg-muted/10">
              <div className="flex gap-2">
                <Input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="发送消息..."
                  className="h-8 text-sm"
                />
                <Button size="sm" className="h-8 px-3" onClick={handleSendMessage}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full p-2 overflow-y-auto custom-scrollbar">
            <div className="space-y-1">
              {users.map((u, i) => (
                <div key={i} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: u.user.color }}
                  >
                    {u.user.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-medium">{u.user.name}</span>
                     {u.user.name === currentUser.name && (
                       <span className="text-[10px] text-muted-foreground">我</span>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
