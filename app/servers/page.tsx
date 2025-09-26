"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowLeft, Server } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MCPServer, MCPServersData } from "@/types/mcp";
import { AddServerDialog } from "@/app/components/AddServerDialog";
import { ServerCard } from "@/app/components/ServerCard";
import { ServerDetailsDialog } from "@/app/components/ServerDetailsDialog";
import { mcpClientManager } from "@/lib/mcp-client";

const STORAGE_KEY = "mcp-servers-data";

export default function ServersPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [detailsServer, setDetailsServer] = useState<MCPServer | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // localStorage에서 서버 데이터 불러오기
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed: MCPServersData = JSON.parse(savedData);
        const serversWithDates = parsed.servers.map((server: MCPServer) => ({
          ...server,
          // Migrate old servers to have transport field
          transport: server.transport || "stdio",
          createdAt: new Date(server.createdAt),
          updatedAt: new Date(server.updatedAt),
          lastConnected: server.lastConnected ? new Date(server.lastConnected) : undefined,
        }));
        setServers(serversWithDates);
      } catch (error) {
        console.error("Failed to load servers data:", error);
      }
    }
  }, []);

  // 서버 데이터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    const dataToSave: MCPServersData = { servers };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [servers]);

  const addServer = (serverData: Omit<MCPServer, "id" | "status" | "createdAt" | "updatedAt">) => {
    const newServer: MCPServer = {
      ...serverData,
      id: Date.now().toString(),
      status: "disconnected",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setServers(prev => [...prev, newServer]);
  };

  const updateServer = (serverId: string, updates: Partial<MCPServer>) => {
    setServers(prev => prev.map(server => 
      server.id === serverId 
        ? { ...server, ...updates, updatedAt: new Date() }
        : server
    ));
  };

  const deleteServer = (serverId: string) => {
    setServers(prev => prev.filter(server => server.id !== serverId));
  };

  const connectServer = async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    // 연결 시도 상태로 변경
    updateServer(serverId, { status: "connecting", errorMessage: undefined });
    
    try {
      const response = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "connect",
          serverId,
          serverConfig: {
            name: server.name,
            transport: server.transport,
            command: server.command,
            args: server.args,
            env: server.env,
            url: server.url,
            headers: server.headers,
            description: server.description,
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        updateServer(serverId, { 
          status: "connected", 
          lastConnected: new Date(),
          errorMessage: undefined
        });
        
        // Update client-side connection info
        if (result.server) {
          mcpClientManager.updateConnection(serverId, result.server);
        }
      } else {
        updateServer(serverId, { 
          status: "error",
          errorMessage: result.error || "연결에 실패했습니다."
        });
      }
    } catch (error) {
      console.error(`Failed to connect to server ${serverId}:`, error);
      updateServer(serverId, { 
        status: "error",
        errorMessage: error instanceof Error ? error.message : "연결에 실패했습니다."
      });
      
      // Remove any stale connection from client manager
      mcpClientManager.removeConnection(serverId);
    }
  };

  const disconnectServer = async (serverId: string) => {
    try {
      const response = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "disconnect",
          serverId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        updateServer(serverId, { status: "disconnected", errorMessage: undefined });
        // Remove from client-side connection manager
        mcpClientManager.removeConnection(serverId);
      } else {
        console.error("Disconnect failed:", result.error);
        // 일단 연결 해제된 것으로 처리
        updateServer(serverId, { status: "disconnected", errorMessage: undefined });
        mcpClientManager.removeConnection(serverId);
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      // 일단 연결 해제된 것으로 처리
      updateServer(serverId, { status: "disconnected", errorMessage: undefined });
      mcpClientManager.removeConnection(serverId);
    }
  };


  return (
    <div className="flex h-screen bg-background">
      <div className="flex flex-col flex-1">
        {/* 헤더 */}
        <header className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                채팅으로 돌아가기
              </Button>
            </Link>
            <div className="h-6 w-px bg-border mx-2" />
            <Server className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">MCP 서버 관리</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              서버 추가
            </Button>
          </div>
        </header>

        {/* 서버 목록 */}
        <ScrollArea className="flex-1 p-4">
          {servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Server className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">MCP 서버가 없습니다</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                첫 번째 MCP 서버를 추가하여 AI 어시스턴트의 기능을 확장해보세요.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                서버 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-w-6xl mx-auto">
              {servers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onConnect={() => connectServer(server.id)}
                  onDisconnect={() => disconnectServer(server.id)}
                  onEdit={() => setSelectedServer(server)}
                  onDetails={() => {
                    setDetailsServer(server);
                    setIsDetailsDialogOpen(true);
                  }}
                  onDelete={() => deleteServer(server.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 하단 경고 */}
        <footer className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs">
                ⚠️ MCP 서버 설정은 로컬에 저장됩니다. 민감한 정보는 환경 변수를 사용하세요.
              </Badge>
            </div>
          </div>
        </footer>
      </div>

      {/* 서버 추가/편집 다이얼로그 */}
      <AddServerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddServer={addServer}
        editServer={selectedServer}
        onUpdateServer={(updates) => {
          if (selectedServer) {
            updateServer(selectedServer.id, updates);
            setSelectedServer(null);
          }
        }}
        onClose={() => {
          setIsAddDialogOpen(false);
          setSelectedServer(null);
        }}
      />

      <ServerDetailsDialog
        server={detailsServer}
        isOpen={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false);
          setDetailsServer(null);
        }}
      />
    </div>
  );
}
