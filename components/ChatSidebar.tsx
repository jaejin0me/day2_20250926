"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2, Edit3, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChatRoom } from "@/types/chat";

interface ChatSidebarProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onCreateRoom: () => void;
  onSelectRoom: (roomId: string) => void;
  onDeleteRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, newName: string) => void;
}

export function ChatSidebar({
  rooms,
  activeRoomId,
  onCreateRoom,
  onSelectRoom,
  onDeleteRoom,
  onRenameRoom,
}: ChatSidebarProps) {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleStartRename = (room: ChatRoom) => {
    setEditingRoomId(room.id);
    setEditingName(room.name);
  };

  const handleConfirmRename = () => {
    if (editingRoomId && editingName.trim()) {
      onRenameRoom(editingRoomId, editingName.trim());
    }
    setEditingRoomId(null);
    setEditingName("");
  };

  const handleCancelRename = () => {
    setEditingRoomId(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirmRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString();
  };

  const getLastMessage = (room: ChatRoom) => {
    if (room.messages.length === 0) return "새 대화";
    const lastMessage = room.messages[room.messages.length - 1];
    const content = lastMessage.content.slice(0, 30);
    return content + (lastMessage.content.length > 30 ? "..." : "");
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r border-border">
      {/* 헤더 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">채팅방</h2>
          <Button size="sm" onClick={onCreateRoom}>
            <Plus className="w-4 h-4 mr-1" />
            새 채팅
          </Button>
        </div>
        <Badge variant="secondary" className="text-xs">
          {rooms.length}개의 채팅방
        </Badge>
      </div>

      {/* 채팅방 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                채팅방이 없습니다
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                새 채팅을 시작해보세요
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className={cn(
                  "group relative rounded-lg p-3 cursor-pointer transition-colors hover:bg-muted/60",
                  activeRoomId === room.id
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-transparent"
                )}
                onClick={() => onSelectRoom(room.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingRoomId === room.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleConfirmRename}
                        autoFocus
                        className="h-6 px-1 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3
                        className={cn(
                          "font-medium text-sm truncate mb-1",
                          activeRoomId === room.id
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {room.name}
                      </h3>
                    )}
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {getLastMessage(room)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(room.updatedAt)}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(room);
                        }}
                      >
                        <Edit3 className="w-3 h-3 mr-2" />
                        이름 변경
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRoom(room.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {room.messages.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 right-8 text-xs h-5"
                  >
                    {room.messages.length}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
