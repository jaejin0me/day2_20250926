"use client";

import { useState, useEffect } from "react";
import { Play, Square, Settings, Trash2, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock, PowerOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MCPServer } from "@/types/mcp";
import { cn } from "@/lib/utils";
import { mcpClientManager, MCPConnection } from "@/lib/mcp-client";

interface ServerCardProps {
  server: MCPServer;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDetails?: () => void;
  onDelete: () => void;
}

export function ServerCard({ server, onConnect, onDisconnect, onEdit, onDetails, onDelete }: ServerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mcpConnection, setMcpConnection] = useState<MCPConnection | null>(null);

  useEffect(() => {
    // Get current MCP connection info
    const connection = mcpClientManager.getConnection(server.id);
    setMcpConnection(connection || null);

    // Listen for connection changes
    const handleEvent = (event: { serverId: string }) => {
      if (event.serverId === server.id) {
        const connection = mcpClientManager.getConnection(server.id);
        setMcpConnection(connection || null);
      }
    };

    mcpClientManager.addEventListener(handleEvent);
    return () => mcpClientManager.removeEventListener(handleEvent);
  }, [server.id, server.status]); // server.status 의존성 추가

  const getStatusIcon = (status: MCPServer["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "connecting":
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <PowerOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: MCPServer["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            연결됨
          </Badge>
        );
      case "connecting":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1 animate-spin" />
            연결 중...
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            오류
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <PowerOff className="w-3 h-3 mr-1" />
            연결 안됨
          </Badge>
        );
    }
  };

  const isConnected = server.status === "connected";
  const isConnecting = server.status === "connecting";
  const hasError = server.status === "error";

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-all duration-300",
      isConnected && "border-green-200 bg-green-50/20",
      isConnecting && "border-yellow-200 bg-yellow-50/20 animate-pulse",
      hasError && "border-red-200 bg-red-50/20",
      !isConnected && !isConnecting && !hasError && "border-gray-200",
      "hover:shadow-sm hover:bg-gray-50/50"
    )}>
      {/* 컴팩트 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 상태 아이콘 + 서버 정보 */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getStatusIcon(server.status)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  "font-medium text-base truncate transition-colors",
                  isConnected && "text-green-900",
                  hasError && "text-red-900"
                )}>
                  {server.name}
                </h3>
                {getStatusBadge(server.status)}
                <Badge variant="outline" className="text-xs shrink-0">
                  {server.transport === "stdio" ? "프로세스" : "HTTP"}
                </Badge>
              </div>
              
              {/* 연결 정보 요약 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono truncate">
                  {server.transport === "stdio" 
                    ? `${server.command} ${server.args?.join(" ") || ""}`.trim()
                    : server.url
                  }
                </span>
                {mcpConnection && mcpConnection.capabilities && (
                  <span className="text-green-600 font-medium shrink-0">
                    • {                        Object.entries(mcpConnection.capabilities)
                          .filter(([, enabled]) => enabled)
                          .map(([capability]) => capability.charAt(0).toUpperCase())
                          .join("")}
                  </span>
                )}
              </div>
              
              {/* 오류 메시지 (컴팩트) */}
              {hasError && server.errorMessage && (
                <div className="text-xs text-red-600 mt-1 truncate">
                  ⚠️ {server.errorMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 컴팩트 액션 버튼들 */}
        <div className="flex items-center gap-1 shrink-0">
          {isConnected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
            >
              <Square className="w-3 h-3 mr-1" />
              해제
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onConnect}
              disabled={isConnecting}
              className={cn(
                "transition-all h-8 px-2",
                isConnecting 
                  ? "text-yellow-600 bg-yellow-50" 
                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
              )}
            >
              {isConnecting ? (
                <>
                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                  연결중
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  연결
                </>
              )}
            </Button>
          )}
          
          {onDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDetails}
              className="h-8 w-8 p-0"
              title="서버 상세 정보"
            >
              <Eye className="w-3 h-3" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
            title="서버 편집"
          >
            <Settings className="w-3 h-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* 확장된 정보 (컴팩트) */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* 상태 세부 정보 */}
            <div>
              <span className="text-muted-foreground text-xs">상태:</span>
              <div className="mt-1">{getStatusBadge(server.status)}</div>
            </div>
            
            {server.lastConnected && (
              <div>
                <span className="text-muted-foreground text-xs">마지막 연결:</span>
                <div className="mt-1 text-xs font-medium">
                  {server.lastConnected.toLocaleString()}
                </div>
              </div>
            )}
            
            {/* MCP 기능 표시 */}
            {mcpConnection && mcpConnection.capabilities && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">MCP 기능:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(mcpConnection.capabilities)
                      .filter(([, enabled]) => enabled)
                      .map(([capability]) => (
                        <Badge key={capability} variant="secondary" className="text-xs">
                          {capability}
                        </Badge>
                      ))
                    }
                </div>
              </div>
            )}
          </div>

          {/* 오류 메시지 (확장된 상태에서만) */}
          {hasError && server.errorMessage && (
            <div className="col-span-2 mt-2">
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-xs text-red-800 font-medium">{server.errorMessage}</p>
              </div>
            </div>
          )}

          {/* 설정 정보 간소화 */}
          <div className="col-span-2 space-y-2 text-xs">
            {server.transport === "stdio" && server.command && (
              <div>
                <span className="text-muted-foreground">명령어:</span>
                <code className="bg-muted px-2 py-1 rounded ml-1">
                  {server.command}
                </code>
                {server.args && server.args.length > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    {server.args.join(" ")}
                  </span>
                )}
              </div>
            )}
            
            {server.transport === "http" && server.url && (
              <div>
                <span className="text-muted-foreground">URL:</span>
                <code className="bg-muted px-2 py-1 rounded ml-1 break-all">
                  {server.url}
                </code>
              </div>
            )}
            
            <div className="text-muted-foreground">
              생성: {server.createdAt.toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
