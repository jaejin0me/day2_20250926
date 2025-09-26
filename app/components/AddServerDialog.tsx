"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MCPServer } from "@/types/mcp";
import { Plus, X, TestTube, CheckCircle, AlertCircle } from "lucide-react";

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddServer: (server: Omit<MCPServer, "id" | "status" | "createdAt" | "updatedAt">) => void;
  editServer?: MCPServer | null;
  onUpdateServer?: (updates: Partial<MCPServer>) => void;
  onClose: () => void;
}

interface FormData {
  name: string;
  transport: "stdio" | "http";
  // Stdio fields
  command: string;
  args: string[];
  env: Record<string, string>;
  // HTTP fields
  url: string;
  headers: Record<string, string>;
  description: string;
}

export function AddServerDialog({ 
  open, 
  onOpenChange, 
  onAddServer, 
  editServer, 
  onUpdateServer, 
  onClose 
}: AddServerDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    transport: "stdio",
    command: "",
    args: [],
    env: {},
    url: "",
    headers: {},
    description: "",
  });
  
  const [argInput, setArgInput] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isEditing = !!editServer;

  // 편집 모드일 때 폼 데이터 초기화
  useEffect(() => {
    if (editServer) {
      setFormData({
        name: editServer.name,
        transport: editServer.transport,
        command: editServer.command || "",
        args: editServer.args || [],
        env: editServer.env || {},
        url: editServer.url || "",
        headers: editServer.headers || {},
        description: editServer.description || "",
      });
    } else {
      setFormData({
        name: "",
        transport: "stdio",
        command: "",
        args: [],
        env: {},
        url: "",
        headers: {},
        description: "",
      });
    }
    setArgInput("");
    setEnvKey("");
    setEnvValue("");
    setHeaderKey("");
    setHeaderValue("");
    setTestResult(null);
  }, [editServer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on transport type
    if (!formData.name.trim()) {
      return;
    }
    
    if (formData.transport === "stdio" && !formData.command.trim()) {
      return;
    }
    
    if (formData.transport === "http" && !formData.url.trim()) {
      return;
    }

    const serverData = {
      name: formData.name.trim(),
      transport: formData.transport,
      // Stdio fields
      command: formData.transport === "stdio" ? formData.command.trim() : undefined,
      args: formData.transport === "stdio" && formData.args.length > 0 ? formData.args : undefined,
      env: formData.transport === "stdio" && Object.keys(formData.env).length > 0 ? formData.env : undefined,
      // HTTP fields
      url: formData.transport === "http" ? formData.url.trim() : undefined,
      headers: formData.transport === "http" && Object.keys(formData.headers).length > 0 ? formData.headers : undefined,
      description: formData.description.trim() || undefined,
    };

    if (isEditing && onUpdateServer) {
      onUpdateServer(serverData);
    } else {
      onAddServer(serverData);
    }
    
    onClose();
  };

  const addArg = () => {
    if (argInput.trim()) {
      setFormData(prev => ({
        ...prev,
        args: [...prev.args, argInput.trim()]
      }));
      setArgInput("");
    }
  };

  const removeArg = (index: number) => {
    setFormData(prev => ({
      ...prev,
      args: prev.args.filter((_, i) => i !== index)
    }));
  };

  const addEnvVar = () => {
    if (envKey.trim() && envValue.trim()) {
      setFormData(prev => ({
        ...prev,
        env: { ...prev.env, [envKey.trim()]: envValue.trim() }
      }));
      setEnvKey("");
      setEnvValue("");
    }
  };

  const removeEnvVar = (key: string) => {
    setFormData(prev => ({
      ...prev,
      env: Object.fromEntries(Object.entries(prev.env).filter(([k]) => k !== key))
    }));
  };

  const addHeader = () => {
    if (headerKey.trim() && headerValue.trim()) {
      setFormData(prev => ({
        ...prev,
        headers: { ...prev.headers, [headerKey.trim()]: headerValue.trim() }
      }));
      setHeaderKey("");
      setHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    setFormData(prev => ({
      ...prev,
      headers: Object.fromEntries(Object.entries(prev.headers).filter(([k]) => k !== key))
    }));
  };

  const testConnection = async () => {
    // Validate required fields based on transport type
    if (!formData.name.trim()) {
      setTestResult({
        success: false,
        message: "서버 이름을 입력해주세요."
      });
      return;
    }
    
    if (formData.transport === "stdio" && !formData.command.trim()) {
      setTestResult({
        success: false,
        message: "명령어를 입력해주세요."
      });
      return;
    }
    
    if (formData.transport === "http" && !formData.url.trim()) {
      setTestResult({
        success: false,
        message: "URL을 입력해주세요."
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "test",
          serverConfig: {
            name: formData.name.trim(),
            transport: formData.transport,
            command: formData.transport === "stdio" ? formData.command.trim() : undefined,
            args: formData.transport === "stdio" ? formData.args : undefined,
            env: formData.transport === "stdio" ? formData.env : undefined,
            url: formData.transport === "http" ? formData.url.trim() : undefined,
            headers: formData.transport === "http" ? formData.headers : undefined,
          }
        }),
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        message: result.message || result.error || "테스트 완료"
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "테스트 중 오류가 발생했습니다."
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "MCP 서버 편집" : "새 MCP 서버 추가"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "MCP 서버 설정을 수정하세요."
              : "새로운 MCP 서버를 설정하여 AI 어시스턴트의 기능을 확장하세요."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">서버 이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="예: File System Server"
                required
              />
            </div>

            <div>
              <Label htmlFor="transport">전송 방식 *</Label>
              <select
                id="transport"
                value={formData.transport}
                onChange={(e) => setFormData(prev => ({ ...prev, transport: e.target.value as "stdio" | "http" }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="stdio">Stdio (명령행 프로세스)</option>
                <option value="http">HTTP (웹 서버)</option>
              </select>
            </div>

            {formData.transport === "stdio" && (
              <div>
                <Label htmlFor="command">실행 명령어 *</Label>
                <Input
                  id="command"
                  value={formData.command}
                  onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="예: python, node, uvx"
                  required
                />
              </div>
            )}

            {formData.transport === "http" && (
              <div>
                <Label htmlFor="url">서버 URL *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="예: http://localhost:3000/mcp"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="이 서버의 기능에 대한 간단한 설명"
                rows={2}
              />
            </div>
          </div>

          {/* Stdio 전용 필드 */}
          {formData.transport === "stdio" && (
            <>
              {/* 명령행 인수 */}
              <div className="space-y-4">
                <div>
                  <Label>명령행 인수</Label>
                  <div className="flex gap-2">
                    <Input
                      value={argInput}
                      onChange={(e) => setArgInput(e.target.value)}
                      placeholder="인수 입력"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addArg();
                        }
                      }}
                    />
                    <Button type="button" onClick={addArg} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {formData.args.length > 0 && (
                  <div className="space-y-2">
                    {formData.args.map((arg, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded">
                        <code className="flex-1 text-sm">{arg}</code>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeArg(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 환경 변수 */}
              <div className="space-y-4">
                <div>
                  <Label>환경 변수</Label>
                  <div className="flex gap-2">
                    <Input
                      value={envKey}
                      onChange={(e) => setEnvKey(e.target.value)}
                      placeholder="변수명"
                    />
                    <Input
                      value={envValue}
                      onChange={(e) => setEnvValue(e.target.value)}
                      placeholder="값"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEnvVar();
                        }
                      }}
                    />
                    <Button type="button" onClick={addEnvVar} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {Object.entries(formData.env).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(formData.env).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 bg-muted p-2 rounded">
                        <code className="flex-1 text-sm">
                          <span className="text-blue-600">{key}</span>=
                          <span className="text-green-600">{value}</span>
                        </code>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeEnvVar(key)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* HTTP 전용 필드 */}
          {formData.transport === "http" && (
            <div className="space-y-4">
              <div>
                <Label>HTTP 헤더</Label>
                <div className="flex gap-2">
                  <Input
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    placeholder="헤더명 (예: Authorization)"
                  />
                  <Input
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder="값 (예: Bearer token)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHeader();
                      }
                    }}
                  />
                  <Button type="button" onClick={addHeader} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {Object.entries(formData.headers).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(formData.headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 bg-muted p-2 rounded">
                      <code className="flex-1 text-sm">
                        <span className="text-blue-600">{key}</span>: 
                        <span className="text-green-600">{value}</span>
                      </code>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeHeader(key)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 연결 테스트 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={testConnection}
                disabled={isTestingConnection || !formData.name.trim() || 
                  (formData.transport === "stdio" && !formData.command.trim()) ||
                  (formData.transport === "http" && !formData.url.trim())}
              >
                {isTestingConnection ? (
                  <>
                    <TestTube className="w-4 h-4 mr-2 animate-spin" />
                    테스트 중...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    연결 테스트
                  </>
                )}
              </Button>
              
              {testResult && (
                <div className={`flex items-center gap-2 text-sm ${
                  testResult.success ? "text-green-600" : "text-red-600"
                }`}>
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* 예시 */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">설정 예시:</h4>
            {formData.transport === "stdio" ? (
              <div className="text-xs font-mono space-y-1">
                <div>명령어: <span className="text-blue-600">uvx</span></div>
                <div>인수: <span className="text-green-600">mcp-server-filesystem</span></div>
                <div>인수: <span className="text-green-600">--allowed-directories</span></div>
                <div>인수: <span className="text-green-600">/home/user/documents</span></div>
              </div>
            ) : (
              <div className="text-xs font-mono space-y-1">
                <div>URL: <span className="text-blue-600">http://localhost:3000/mcp</span></div>
                <div>헤더: <span className="text-green-600">Authorization: Bearer token</span></div>
                <div>헤더: <span className="text-green-600">Content-Type: application/json</span></div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">
              {isEditing ? "수정" : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
