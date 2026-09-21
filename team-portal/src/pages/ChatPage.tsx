import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ChatMessage, User, ChatAttachment } from '../types';
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
  Image as ImageIcon,
  FileText,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  File as FileIcon,
  Download,
  Eye,
  X,
  Loader2,
  UploadCloud,
  CheckCircle2,
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
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const fileList = Array.from(files);
      const uploaded: ChatAttachment[] = [];

      for (const file of fileList) {
        // Upload each file
        const res = await api.uploadChatFile(file);
        uploaded.push(res);
      }

      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      console.error('Failed to upload attachment:', err);
      setUploadError(err.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend && pendingAttachments.length === 0) return;
    if (isUploading) return;

    const attachmentsToSend = [...pendingAttachments];
    setInputText('');
    setPendingAttachments([]);
    setUploadError(null);

    try {
      setSending(true);
      const res = await api.postChatMessage({
        channel: currentChannel,
        content: textToSend,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      });

      const newMsg = res.chatMessage || res;
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();

      // If mentions current user, trigger local notification
      if (textToSend && (textToSend.includes('@' + user?.name) || textToSend.includes('@all'))) {
        triggerLocalNotification('New Workspace Mention', {
          body: `${user?.name || 'Someone'} mentioned you in #${currentChannel}`,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      // Restore on failure
      setInputText(textToSend);
      setPendingAttachments(attachmentsToSend);
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

  const parseAttachments = (raw: any): ChatAttachment[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    return [];
  };

  const isImageAttachment = (att: ChatAttachment) => {
    if (att.type && att.type.startsWith('image/')) return true;
    const lower = att.url.toLowerCase();
    return (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.svg')
    );
  };

  const isPdfAttachment = (att: ChatAttachment) => {
    if (att.type && att.type.includes('pdf')) return true;
    return att.url.toLowerCase().endsWith('.pdf');
  };

  const getDocIcon = (att: ChatAttachment) => {
    const lower = (att.name || att.url).toLowerCase();
    if (lower.endsWith('.pdf')) return <FileText className="h-5 w-5 text-[#B91C1C]" />;
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
      return <FileSpreadsheet className="h-5 w-5 text-[#15803D]" />;
    }
    if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) {
      return <FileArchive className="h-5 w-5 text-[#B45309]" />;
    }
    if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.html') || lower.endsWith('.css')) {
      return <FileCode className="h-5 w-5 text-[#2563EB]" />;
    }
    return <FileIcon className="h-5 w-5 text-[#BA954F]" />;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative h-[calc(100vh-8rem)] flex flex-col md:flex-row bg-white rounded-2xl border transition-colors shadow-xs overflow-hidden animate-gold-fade-in ${
        isDraggingOver ? 'border-[#BA954F] ring-2 ring-[#BA954F]/30 bg-[#FAF4EC]/30' : 'border-[#EDE7DD]'
      }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 pointer-events-none bg-[#FAF4EC]/85 backdrop-blur-xs flex flex-col items-center justify-center text-[#BA954F] border-2 border-dashed border-[#BA954F] m-2 rounded-xl">
          <UploadCloud className="h-14 w-14 animate-bounce mb-2" />
          <p className="text-base font-bold text-[#1C1917]">Drop files here to share in chat</p>
          <p className="text-xs text-[#78716C] mt-1 font-medium">Photos, PDFs, and all documents supported</p>
        </div>
      )}

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
                Be the first to post a creative update, document, or photo.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderId = msg.senderId || (msg as any).userId;
              const sender = msg.sender || (msg as any).user;
              const content = msg.content || (msg as any).message;
              const isMe = senderId === user?.id;
              const canDelete = isMe || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
              const attachments = parseAttachments(msg.attachments);

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

                  <div className={`space-y-1.5 max-w-lg ${isMe ? 'items-end text-right' : ''}`}>
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

                    {/* Text Message Content (if any) */}
                    {content && content.trim() && (
                      <div
                        className={`text-xs sm:text-sm leading-relaxed p-3.5 rounded-2xl whitespace-pre-wrap font-normal ${
                          isMe
                            ? 'bg-[#FAF4EC] border border-[#EDE3D4] text-[#1C1917] rounded-tr-xs'
                            : 'bg-[#FAF7F2] border border-[#EDE7DD] text-[#292524] rounded-tl-xs'
                        }`}
                      >
                        {content}
                      </div>
                    )}

                    {/* Attachments Section */}
                    {attachments.length > 0 && (
                      <div className={`space-y-2 mt-1 ${isMe ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                        {attachments.map((att, attIdx) => {
                          const isImg = isImageAttachment(att);
                          const isPdf = isPdfAttachment(att);

                          if (isImg) {
                            return (
                              <div
                                key={attIdx}
                                className="relative rounded-2xl overflow-hidden border border-[#EDE7DD] bg-[#FAF7F2] group/img max-w-xs sm:max-w-sm shadow-2xs hover:shadow-md transition-all"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name || 'Chat image'}
                                  className="w-full max-h-64 object-cover cursor-pointer"
                                  onClick={() => setLightboxImage({ url: att.url, name: att.name || 'Image' })}
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImage({ url: att.url, name: att.name || 'Image' })}
                                    className="p-2 bg-white/90 hover:bg-white text-[#1C1917] rounded-xl cursor-pointer shadow-sm"
                                    title="View full image"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <a
                                    href={att.url}
                                    download={att.name || 'download'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 bg-white/90 hover:bg-white text-[#1C1917] rounded-xl cursor-pointer shadow-sm"
                                    title="Download image"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                </div>
                                <div className="p-2 bg-white/95 border-t border-[#EDE7DD] flex items-center justify-between text-[11px] text-[#78716C]">
                                  <span className="truncate max-w-[180px] font-medium">{att.name}</span>
                                  <span>{formatFileSize(att.size)}</span>
                                </div>
                              </div>
                            );
                          }

                          if (isPdf) {
                            return (
                              <div
                                key={attIdx}
                                className="w-full max-w-xs sm:max-w-sm p-3 rounded-2xl border border-[#F5D0C5] bg-[#FDF0ED]/50 flex items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 bg-[#FDF0ED] border border-[#F5D0C5] rounded-xl text-[#B91C1C] shrink-0">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[#1C1917] truncate">{att.name}</p>
                                    <p className="text-[10px] text-[#78716C]">{formatFileSize(att.size)} · PDF Document</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-white hover:bg-[#FAF7F2] text-[#B91C1C] border border-[#F5D0C5] rounded-lg transition-colors cursor-pointer"
                                    title="Open PDF in new tab"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </a>
                                  <a
                                    href={att.url}
                                    download={att.name || 'document.pdf'}
                                    className="p-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                                    title="Download PDF"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              </div>
                            );
                          }

                          // General Document (Word, Excel, ZIP, etc.)
                          return (
                            <div
                              key={attIdx}
                              className="w-full max-w-xs sm:max-w-sm p-3 rounded-2xl border border-[#EDE7DD] bg-white flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl shrink-0">
                                  {getDocIcon(att)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#1C1917] truncate">{att.name}</p>
                                  <p className="text-[10px] text-[#78716C]">{formatFileSize(att.size)}</p>
                                </div>
                              </div>
                              <a
                                href={att.url}
                                download={att.name || 'attachment'}
                                className="p-1.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
                                title="Download Document"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending Attachments Tray (visible when files are selected or uploaded) */}
        {pendingAttachments.length > 0 && (
          <div className="px-4 py-2 bg-[#FAF4EC]/60 border-t border-[#EDE3D4] flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-[#BA954F] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" /> Attached ({pendingAttachments.length}):
            </span>
            <div className="flex items-center gap-2">
              {pendingAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 py-1 px-2.5 bg-white border border-[#EDE3D4] rounded-xl shadow-2xs text-xs"
                >
                  {isImageAttachment(att) ? (
                    <img src={att.url} alt={att.name} className="w-5 h-5 rounded object-cover" />
                  ) : (
                    getDocIcon(att)
                  )}
                  <span className="font-semibold text-[#1C1917] max-w-[120px] truncate">{att.name}</span>
                  <span className="text-[10px] text-[#A8A29E] font-mono">{formatFileSize(att.size)}</span>
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(idx)}
                    className="p-0.5 text-[#A8A29E] hover:text-[#B91C1C] rounded cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Loading Banner */}
        {isUploading && (
          <div className="px-4 py-1.5 bg-[#FAF7F2] border-t border-[#EDE7DD] flex items-center gap-2 text-xs text-[#BA954F] font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Uploading file(s)... please wait</span>
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="px-4 py-1.5 bg-[#FDF0ED] border-t border-[#F5D0C5] text-xs text-[#B91C1C] font-semibold flex items-center justify-between">
            <span>{uploadError}</span>
            <button type="button" onClick={() => setUploadError(null)} className="cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[#EDE7DD] bg-[#FAF7F2]/50">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#DFD5C6] focus-within:ring-2 focus-within:ring-[#BA954F]/20 focus-within:border-[#BA954F] shadow-2xs">
            {/* Attach File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 text-[#78716C] hover:text-[#BA954F] hover:bg-[#FAF4EC] rounded-xl transition-colors cursor-pointer"
              title="Attach photos, PDFs, or documents"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              placeholder={`Message ${
                channels.find((c) => c.id === currentChannel)?.name ||
                currentChannel ||
                'channel'
              }...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-2 py-1 text-xs sm:text-sm bg-transparent border-none focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]"
            />

            <button
              type="submit"
              disabled={sending || isUploading || (!inputText.trim() && pendingAttachments.length === 0)}
              className="p-2.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
              title="Send message"
            >
              <Send className="h-4 w-4 stroke-[2]" />
            </button>
          </div>
        </form>
      </div>

      {/* Lightbox Modal for Full Image View */}
      {lightboxImage && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-gold-fade-in">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={lightboxImage.url}
                download={lightboxImage.name}
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl cursor-pointer"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <p className="text-white text-xs mt-2 font-medium truncate max-w-md">{lightboxImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};
