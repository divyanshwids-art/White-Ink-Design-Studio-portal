import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ChatMessage, User } from '../types';
import { triggerLocalNotification } from '../utils/pushNotifications';
import {
  MessageSquare,
  Send,
  Hash,
  AtSign,
  Trash2,
  Users,
  Building2,
  Paperclip,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<{ id: string; name: string; type: 'internal' | 'client' }[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;
    api.getChatChannels()
      .then((chs) => {
        if (isMounted) {
          setChannels(chs);
          if (chs.length > 0 && !currentChannel) {
            setCurrentChannel(chs[0].id);
          }
        }
      })
      .catch((err) => console.error('Error fetching chat channels:', err));

    api.getUsers().then(setUsers).catch(() => []);
    return () => { isMounted = false; };
  }, []);

  const loadMessages = async (silent = false) => {
    if (!currentChannel) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.getChatMessages(currentChannel);
      setMessages(res);
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentChannel) return;
    loadMessages();

    // Polling every 4 seconds for chat updates
    const interval = setInterval(() => {
      loadMessages(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      setSending(true);
      const res = await api.postChatMessage({
        channel: currentChannel,
        content: textToSend,
      });

      const newMsg = res.chatMessage || res;
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();

      // If mentions current user, trigger local notification
      if (textToSend.includes('@' + user?.name) || textToSend.includes('@all')) {
        triggerLocalNotification('New Workspace Mention', {
          body: `${user?.name || 'Someone'} mentioned you in #${currentChannel}`,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.deleteChatMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const insertMention = (name: string) => {
    setInputText((prev) => `${prev} @${name} `);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden animate-gold-fade-in">
      {/* Sidebar: Channels & Online Teammates */}
      <div className="w-full md:w-64 border-r border-[#EDE7DD] bg-[#FAF7F2] flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-5 overflow-y-auto">
          <div>
            <div className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider px-2 mb-2">
              Channels
            </div>
            <div className="space-y-1">
              {channels.map((ch) => {
                const Icon = ch.type === 'client' ? Building2 : Hash;
                const isActive = currentChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setCurrentChannel(ch.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left border ${
                      isActive
                        ? 'bg-[#BA954F] border-[#BA954F] text-white shadow-xs'
                        : 'border-transparent text-[#57534E] hover:bg-[#F5EFE6] hover:text-[#1C1917]'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#8C7E72]'}`} />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
              <span>Team ({users.length})</span>
              <Users className="h-3.5 w-3.5 text-[#BA954F]" />
            </div>
            <div className="space-y-1">
              {users.slice(0, 8).map((u) => (
                <div
                  key={u.id}
                  onClick={() => insertMention(u.name)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#57534E] hover:bg-[#F5EFE6] hover:text-[#1C1917] cursor-pointer transition-colors"
                  title="Click to tag in chat"
                >
                  <div className="w-5 h-5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0] flex items-center justify-center text-[10px] font-serif font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate flex-1 font-semibold">{u.name}</span>
                  <span className="text-[10px] text-[#A8A29E] font-mono">@{u.role.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3.5 border-t border-[#EDE7DD] bg-white/70 text-[11px] text-[#78716C] font-normal flex items-center gap-1.5">
          <AtSign className="h-3.5 w-3.5 text-[#BA954F]" />
          <span>Tip: Type @name or @all to notify</span>
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 flex flex-col justify-between bg-white min-w-0">
        {/* Chat Channel Header */}
        {(() => {
          const activeChannel = channels.find((c) => c.id === currentChannel);
          const HeaderIcon = activeChannel?.type === 'client' ? Building2 : Hash;
          return (
            <div className="px-6 py-3.5 border-b border-[#EDE7DD] flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white text-[#BA954F] border border-[#EDE7DD] rounded-xl shadow-2xs">
                  <HeaderIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-serif font-bold text-[#1C1917]">
                    {activeChannel
                      ? activeChannel.name
                      : currentChannel
                      ? `#${currentChannel}`
                      : 'Select a channel'}
                  </h2>
                  <p className="text-[11px] text-[#78716C] font-normal">
                    {activeChannel?.type === 'client'
                      ? 'Client collaboration workspace channel'
                      : 'Internal team & staff channel'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => insertMention('all')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#BA954F] border border-[#DFD5C6] transition-colors cursor-pointer shadow-2xs"
                >
                  Tag @all
                </button>
              </div>
            </div>
          );
        })()}

        {/* Message History */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="p-12 text-center text-[#78716C]">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#BA954F] border-t-transparent mb-2" />
              <p className="text-xs font-semibold">Loading channel messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-[#78716C]">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF4EC] border border-[#EDE3D4] flex items-center justify-center text-[#BA954F] mx-auto mb-3 shadow-2xs">
                <MessageSquare className="h-6 w-6 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                No messages in{' '}
                {channels.find((c) => c.id === currentChannel)?.name ||
                  currentChannel ||
                  'channel'}
              </h3>
              <p className="text-xs mt-1 font-normal">
                Be the first to post a creative update or start a discussion.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderId = msg.senderId || (msg as any).userId;
              const sender = msg.sender || (msg as any).user;
              const content = msg.content || (msg as any).message;
              const isMe = senderId === user?.id;
              const canDelete = isMe || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#FAF4EC] border border-[#EAE0D0] flex items-center justify-center text-[#BA954F] font-serif font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                    {sender?.name
                      ? sender.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'U'}
                  </div>

                  <div className={`space-y-1 max-w-lg ${isMe ? 'items-end text-right' : ''}`}>
                    <div className={`flex items-center gap-2 ${isMe ? 'justify-end' : ''}`}>
                      <span className="text-xs font-bold text-[#1C1917]">
                        {isMe ? 'You' : sender?.name || 'Teammate'}
                      </span>
                      <span className="text-[10px] text-[#A8A29E] font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#A8A29E] hover:text-[#B91C1C] rounded transition-opacity cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div
                      className={`text-xs sm:text-sm leading-relaxed p-3.5 rounded-2xl whitespace-pre-wrap font-normal ${
                        isMe
                          ? 'bg-[#FAF4EC] border border-[#EDE3D4] text-[#1C1917] rounded-tr-xs'
                          : 'bg-[#FAF7F2] border border-[#EDE7DD] text-[#292524] rounded-tl-xs'
                      }`}
                    >
                      {content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[#EDE7DD] bg-[#FAF7F2]/50">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#DFD5C6] focus-within:ring-2 focus-within:ring-[#BA954F]/20 focus-within:border-[#BA954F] shadow-2xs">
            <input
              type="text"
              placeholder={`Message ${
                channels.find((c) => c.id === currentChannel)?.name ||
                currentChannel ||
                'channel'
              }...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3 py-1 text-xs sm:text-sm bg-transparent border-none focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="p-2.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
            >
              <Send className="h-4 w-4 stroke-[2]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
