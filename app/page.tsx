"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Send, Bot, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageRenderer } from "@/components/MessageRenderer";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatRoom, ChatRoomsData, Message } from "@/types/chat";

const STORAGE_KEY = "ai-chat-rooms-data";

export default function ChatPage() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 현재 활성 채팅방의 메시지들
  const currentMessages = chatRooms.find(room => room.id === activeRoomId)?.messages || [];

  // localStorage에서 채팅방 데이터 불러오기
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed: ChatRoomsData = JSON.parse(savedData);
        const roomsWithDates = parsed.rooms.map((room: any) => ({
          ...room,
          createdAt: new Date(room.createdAt),
          updatedAt: new Date(room.updatedAt),
          messages: room.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
        setChatRooms(roomsWithDates);
        
        // 마지막 활성 채팅방 복원하거나 첫 번째 채팅방 선택
        if (parsed.activeRoomId && roomsWithDates.find(room => room.id === parsed.activeRoomId)) {
          setActiveRoomId(parsed.activeRoomId);
        } else if (roomsWithDates.length > 0) {
          setActiveRoomId(roomsWithDates[0].id);
        }
      } catch (error) {
        console.error("Failed to load chat rooms data:", error);
      }
    }
  }, []);

  // 채팅방 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (chatRooms.length > 0) {
      const dataToSave: ChatRoomsData = {
        rooms: chatRooms,
        activeRoomId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [chatRooms, activeRoomId]);

  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, streamingMessage]);

  // 채팅방 관리 함수들
  const createNewRoom = () => {
    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      name: `새 채팅 ${chatRooms.length + 1}`,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setChatRooms(prev => [newRoom, ...prev]);
    setActiveRoomId(newRoom.id);
  };

  const selectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setStreamingMessage("");
    setIsLoading(false);
    // 진행 중인 요청이 있다면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const deleteRoom = (roomId: string) => {
    setChatRooms(prev => prev.filter(room => room.id !== roomId));
    
    // 삭제된 방이 현재 활성 방이라면 다른 방으로 이동
    if (activeRoomId === roomId) {
      const remainingRooms = chatRooms.filter(room => room.id !== roomId);
      if (remainingRooms.length > 0) {
        setActiveRoomId(remainingRooms[0].id);
      } else {
        setActiveRoomId(null);
      }
    }
  };

  const renameRoom = (roomId: string, newName: string) => {
    setChatRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, name: newName, updatedAt: new Date() }
        : room
    ));
  };

  const clearCurrentChat = () => {
    if (!activeRoomId) return;
    
    setChatRooms(prev => prev.map(room => 
      room.id === activeRoomId 
        ? { ...room, messages: [], updatedAt: new Date() }
        : room
    ));
    setStreamingMessage("");
  };

  const updateCurrentRoomMessages = (newMessages: Message[]) => {
    if (!activeRoomId) return;
    
    setChatRooms(prev => prev.map(room => 
      room.id === activeRoomId 
        ? { ...room, messages: newMessages, updatedAt: new Date() }
        : room
    ));
  };

  const addMessageToCurrentRoom = (message: Message) => {
    if (!activeRoomId) return;
    
    setChatRooms(prev => prev.map(room => 
      room.id === activeRoomId 
        ? { ...room, messages: [...room.messages, message], updatedAt: new Date() }
        : room
    ));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // 자동 높이 조절
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !activeRoomId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    const currentInput = input.trim();
    addMessageToCurrentRoom(userMessage);
    setInput("");
    setIsLoading(true);
    setStreamingMessage("");

    // 이전 요청이 있다면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController();

    try {
      // 채팅 히스토리를 Gemini API 형식으로 변환
      const history = currentMessages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: currentInput,
          history: history
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "메시지 전송에 실패했습니다.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("스트리밍 응답을 읽을 수 없습니다.");
      }

      let accumulatedText = "";
      
      // 스트림 읽기
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.text);
              }
              
              if (data.text) {
                accumulatedText += data.text;
                setStreamingMessage(accumulatedText);
              }
              
              if (data.done) {
                // 스트리밍 완료 - 최종 메시지 추가
                const aiMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  content: accumulatedText,
                  role: "assistant",
                  timestamp: new Date(),
                };
                addMessageToCurrentRoom(aiMessage);
                setStreamingMessage("");
                return;
              }
            } catch (parseError) {
              console.error("Error parsing stream data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 요청이 취소된 경우
        return;
      }
      
      console.error("Error sending message:", error);
      
      // 오류 메시지를 채팅에 표시
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `죄송합니다. 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        role: "assistant",
        timestamp: new Date(),
      };
      addMessageToCurrentRoom(errorMessage);
      setStreamingMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearAllChats = () => {
    setChatRooms([]);
    setActiveRoomId(null);
    setStreamingMessage("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingMessage("");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 사이드바 */}
      <div className="w-80 flex-shrink-0">
        <ChatSidebar
          rooms={chatRooms}
          activeRoomId={activeRoomId}
          onCreateRoom={createNewRoom}
          onSelectRoom={selectRoom}
          onDeleteRoom={deleteRoom}
          onRenameRoom={renameRoom}
        />
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex flex-col flex-1">
        {/* 헤더 */}
        <header className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">
              {activeRoomId ? chatRooms.find(room => room.id === activeRoomId)?.name || "AI 채팅" : "AI 채팅"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {activeRoomId && (
              <Button 
                variant="outline"
                size="sm"
                onClick={clearCurrentChat}
              >
                대화 초기화
              </Button>
            )}
            <Button 
              variant="outline"
              size="sm"
              onClick={clearAllChats}
            >
              모든 채팅 삭제
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* 채팅 영역 */}
        <ScrollArea className="flex-1 p-4">
          {!activeRoomId ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">채팅방을 선택하세요</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                사이드바에서 기존 채팅방을 선택하거나 새 채팅을 시작해보세요.
              </p>
              <Button onClick={createNewRoom}>
                <Plus className="w-4 h-4 mr-2" />
                새 채팅 시작
              </Button>
            </div>
          ) : currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">AI와 대화를 시작하세요</h2>
            <p className="text-muted-foreground max-w-md">
              아래 입력창에 메시지를 입력하여 AI와 대화할 수 있습니다.
              "/" 를 입력하면 프롬프트 힌트를 확인할 수 있습니다.
            </p>
          </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {currentMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    "px-4 py-2 rounded-lg max-w-[70%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <MessageRenderer 
                    content={message.content} 
                    isUser={message.role === "user"}
                    className={message.role === "user" ? "text-primary-foreground" : ""}
                  />
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">You</span>
                  </div>
                )}
              </div>
            ))}
            {(isLoading || streamingMessage) && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted px-4 py-2 rounded-lg max-w-[70%]">
                  {streamingMessage ? (
                    <>
                      <MessageRenderer content={streamingMessage} isUser={false} />
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.1s" }}></div>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopGeneration}
                          className="h-6 text-xs"
                        >
                          중지
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
        </ScrollArea>

        {/* 입력 영역 */}
        <footer className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder={activeRoomId ? "메시지를 입력하세요... (Shift+Enter: 줄바꿈, /: 프롬프트 힌트)" : "채팅방을 선택해주세요"}
                className="flex-1 min-h-[44px] max-h-32 resize-none"
                rows={1}
                disabled={!activeRoomId}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || !activeRoomId}
                size="icon"
                className="h-[44px] w-[44px]"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex justify-center mt-2">
              <Badge variant="outline" className="text-xs">
                ⚠️ 공용/공유 PC에서는 민감한 정보 저장을 주의하세요.
              </Badge>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
