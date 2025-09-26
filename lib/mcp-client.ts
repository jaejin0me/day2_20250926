"use client";

import { MCPServer } from "@/types/mcp";

export interface MCPConnection {
  server: MCPServer;
  isConnected: boolean;
  capabilities?: {
    resources?: boolean;
    tools?: boolean;
    prompts?: boolean;
  };
  resources?: Array<{
    uri: string;
    name: string;
    mimeType?: string;
    description?: string;
  }>;
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: any;
  }>;
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: Array<{
      name: string;
      description?: string;
      required?: boolean;
    }>;
  }>;
}

export class MCPClientManager {
  private connections = new Map<string, MCPConnection>();
  private eventListeners = new Set<(event: MCPClientEvent) => void>();

  // 연결 상태 변화 이벤트
  addEventListener(callback: (event: MCPClientEvent) => void) {
    this.eventListeners.add(callback);
  }

  removeEventListener(callback: (event: MCPClientEvent) => void) {
    this.eventListeners.delete(callback);
  }

  private emit(event: MCPClientEvent) {
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in MCP event listener:", error);
      }
    });
  }

  // Update connection info from server response
  updateConnection(serverId: string, connectionInfo: any) {
    if (connectionInfo) {
      const connection: MCPConnection = {
        server: { id: serverId } as MCPServer,
        isConnected: true,
        capabilities: connectionInfo.capabilities,
        resources: connectionInfo.resources,
        tools: connectionInfo.tools,
        prompts: connectionInfo.prompts
      };
      
      this.connections.set(serverId, connection);
      
      this.emit({
        type: "connection_established",
        serverId,
        connection
      });
    }
  }

  removeConnection(serverId: string) {
    this.connections.delete(serverId);
    this.emit({
      type: "connection_closed",
      serverId
    });
  }

  // Public API methods
  getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId);
  }

  getAllConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectedServers(): MCPConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.isConnected);
  }

  async callTool(serverId: string, toolName: string, args: Record<string, any>) {
    try {
      const response = await fetch("/api/mcp/tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId,
          toolName,
          args
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Tool call failed");
      }
      
      this.emit({
        type: "tool_called",
        serverId,
        toolName,
        args,
        result: result.result
      });
      
      return result.result;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  async readResource(serverId: string, uri: string) {
    try {
      const response = await fetch(`/api/mcp/tools?serverId=${encodeURIComponent(serverId)}&uri=${encodeURIComponent(uri)}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Resource read failed");
      }
      
      this.emit({
        type: "resource_read",
        serverId,
        uri,
        result: result.result
      });
      
      return result.result;
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  }
}

export type MCPClientEvent = 
  | {
      type: "connection_status_changed";
      serverId: string;
      status: "connecting" | "connected" | "disconnected" | "error";
      error?: string;
    }
  | {
      type: "connection_established";
      serverId: string;
      connection: MCPConnection;
    }
  | {
      type: "connection_closed";
      serverId: string;
    }
  | {
      type: "tool_called";
      serverId: string;
      toolName: string;
      args: Record<string, any>;
      result: any;
    }
  | {
      type: "resource_read";
      serverId: string;
      uri: string;
      result: any;
    }
  | {
      type: "prompt_retrieved";
      serverId: string;
      promptName: string;
      args: Record<string, any>;
      result: any;
    };

// Global instance
export const mcpClientManager = new MCPClientManager();
