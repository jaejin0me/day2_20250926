"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Server, 
  Wrench, 
  FileText, 
  MessageSquare, 
  Copy, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { MCPServer } from "@/types/mcp";
import { mcpClientManager, type MCPConnection } from "@/lib/mcp-client";

interface ServerDetailsDialogProps {
  server: MCPServer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServerDetailsDialog({ server, isOpen, onClose }: ServerDetailsDialogProps) {
  const [mcpConnection, setMcpConnection] = useState<MCPConnection | null>(null);

  useEffect(() => {
    if (server && isOpen) {
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
    }
  }, [server, isOpen]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: MCPServer["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "connecting":
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Server className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!server) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(server.status)}
            <span>{server.name}</span>
            <Badge variant={server.status === "connected" ? "default" : "outline"}>
              {server.status === "connected" ? "연결됨" : 
               server.status === "connecting" ? "연결 중..." :
               server.status === "error" ? "오류" : "연결 안됨"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="tools" disabled={!mcpConnection}>
              <Wrench className="w-4 h-4 mr-1" />
              도구 ({mcpConnection?.tools?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="resources" disabled={!mcpConnection}>
              <FileText className="w-4 h-4 mr-1" />
              리소스 ({mcpConnection?.resources?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="prompts" disabled={!mcpConnection}>
              <MessageSquare className="w-4 h-4 mr-1" />
              프롬프트 ({mcpConnection?.prompts?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 기본 정보 */}
              <div className="space-y-3">
                <h3 className="font-medium">기본 정보</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">이름:</span>
                    <div className="font-medium">{server.name}</div>
                  </div>
                  {server.description && (
                    <div>
                      <span className="text-muted-foreground">설명:</span>
                      <div className="font-medium">{server.description}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">전송 방식:</span>
                    <div>
                      <Badge variant="outline">
                        {server.transport === "stdio" ? "프로세스" : "HTTP"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">상태:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(server.status)}
                      <span className="font-medium">
                        {server.status === "connected" ? "연결됨" : 
                         server.status === "connecting" ? "연결 중..." :
                         server.status === "error" ? "오류" : "연결 안됨"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 연결 정보 */}
              <div className="space-y-3">
                <h3 className="font-medium">연결 정보</h3>
                <div className="space-y-2 text-sm">
                  {server.transport === "stdio" ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">명령어:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {server.command}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(server.command || "")}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {server.args && server.args.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">인수:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {server.args.map((arg, index) => (
                              <code key={index} className="bg-muted px-2 py-1 rounded text-xs">
                                {arg}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-muted-foreground">URL:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                            {server.url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(server.url || "")}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(server.url, "_blank")}
                            className="h-6 w-6 p-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* MCP 기능 */}
            {mcpConnection && (
              <div className="space-y-3">
                <h3 className="font-medium">MCP 기능</h3>
                <div className="flex flex-wrap gap-2">
                  {mcpConnection.capabilities?.resources && (
                    <Badge variant="secondary">
                      <FileText className="w-3 h-3 mr-1" />
                      Resources
                    </Badge>
                  )}
                  {mcpConnection.capabilities?.tools && (
                    <Badge variant="secondary">
                      <Wrench className="w-3 h-3 mr-1" />
                      Tools
                    </Badge>
                  )}
                  {mcpConnection.capabilities?.prompts && (
                    <Badge variant="secondary">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Prompts
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* 오류 정보 */}
            {server.status === "error" && server.errorMessage && (
              <div className="space-y-3">
                <h3 className="font-medium text-red-600">오류 정보</h3>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{server.errorMessage}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tools">
            <ScrollArea className="h-96">
              {mcpConnection?.tools && mcpConnection.tools.length > 0 ? (
                <div className="space-y-3">
                  {mcpConnection.tools.map((tool, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4" />
                        <h4 className="font-medium">{tool.name}</h4>
                      </div>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {tool.description}
                        </p>
                      )}
                      {tool.inputSchema && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Input Schema:</span>
                          <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(tool.inputSchema, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>사용 가능한 도구가 없습니다</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="resources">
            <ScrollArea className="h-96">
              {mcpConnection?.resources && mcpConnection.resources.length > 0 ? (
                <div className="space-y-3">
                  {mcpConnection.resources.map((resource, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" />
                        <h4 className="font-medium">{resource.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(resource.uri)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {resource.description}
                        </p>
                      )}
                      <div className="text-xs">
                        <span className="text-muted-foreground">URI:</span>
                        <code className="bg-muted px-2 py-1 rounded ml-1">
                          {resource.uri}
                        </code>
                      </div>
                      {resource.mimeType && (
                        <div className="text-xs mt-1">
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="outline" className="ml-1 text-xs">
                            {resource.mimeType}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>사용 가능한 리소스가 없습니다</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="prompts">
            <ScrollArea className="h-96">
              {mcpConnection?.prompts && mcpConnection.prompts.length > 0 ? (
                <div className="space-y-3">
                  {mcpConnection.prompts.map((prompt, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <h4 className="font-medium">{prompt.name}</h4>
                      </div>
                      {prompt.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {prompt.description}
                        </p>
                      )}
                      {prompt.arguments && prompt.arguments.length > 0 && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Arguments:</span>
                          <div className="mt-1 space-y-1">
                            {prompt.arguments.map((arg, argIndex) => (
                              <div key={argIndex} className="bg-muted p-2 rounded">
                                <div className="font-medium">{arg.name}</div>
                                {arg.description && (
                                  <div className="text-muted-foreground">{arg.description}</div>
                                )}
                                {arg.required && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>사용 가능한 프롬프트가 없습니다</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
