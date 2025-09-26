export interface MCPServer {
  id: string;
  name: string;
  transport: "stdio" | "http";
  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // For HTTP transport
  url?: string;
  headers?: Record<string, string>;
  description?: string;
  status: "connected" | "disconnected" | "connecting" | "error";
  lastConnected?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPServersData {
  servers: MCPServer[];
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface MCPServerConnection {
  server: MCPServer;
  resources?: MCPResource[];
  tools?: MCPTool[];
  capabilities?: string[];
}
