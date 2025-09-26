// Server-side MCP Client Manager (Node.js only)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { MCPServer } from "@/types/mcp";

export interface MCPConnection {
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport;
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

class MCPServerManager {
  private connections = new Map<string, MCPConnection>();

  async connectServer(server: MCPServer): Promise<MCPConnection> {
    try {
      console.log("MCPServerManager connecting to server:", server); // Debug log
      
      // Create client instance
      const client = new Client({
        name: "ai-chat-mcp-host",
        version: "1.0.0"
      });

      // Create transport based on server configuration
      let transport: StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport;
      
      // Default to stdio if transport is not specified
      const transportType = server.transport || "stdio";
      console.log("Using transport type:", transportType); // Debug log
      
      if (transportType === "stdio") {
        if (!server.command) {
          throw new Error("Command is required for stdio transport");
        }
        transport = new StdioClientTransport({
          command: server.command,
          args: server.args || [],
          env: server.env
        });
      } else if (transportType === "http") {
        if (!server.url) {
          throw new Error("URL is required for HTTP transport");
        }
        
        // Try Streamable HTTP first, fallback to SSE
        try {
          transport = new StreamableHTTPClientTransport(new URL(server.url));
          if (server.headers) {
            // Note: StreamableHTTPClientTransport might not support custom headers directly
            // This would need to be handled at the request level
          }
        } catch (error) {
          // Fallback to SSE transport
          transport = new SSEClientTransport(new URL(server.url));
        }
      } else {
        throw new Error(`Unsupported transport type: ${transportType}`);
      }

      // Connect to the server
      await client.connect(transport);

      // Get server capabilities
      const capabilities = await this.getServerCapabilities(client);
      
      // Get available resources, tools, and prompts
      const [resources, tools, prompts] = await Promise.all([
        this.getResources(client, capabilities.resources),
        this.getTools(client, capabilities.tools),
        this.getPrompts(client, capabilities.prompts)
      ]);

      const connection: MCPConnection = {
        client,
        transport,
        server,
        isConnected: true,
        capabilities,
        resources,
        tools,
        prompts
      };

      this.connections.set(server.id, connection);
      return connection;

    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error);
      throw error;
    }
  }

  async disconnectServer(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return;
    }

    try {
      // Close the transport connection
      await connection.transport.close();
      connection.isConnected = false;
      this.connections.delete(serverId);
    } catch (error) {
      console.error(`Error disconnecting from server ${serverId}:`, error);
    }
  }

  private async getServerCapabilities(client: Client) {
    try {
      const capabilities = {
        resources: false,
        tools: false,
        prompts: false
      };

      // Test each capability by attempting to list
      try {
        await client.listResources();
        capabilities.resources = true;
      } catch (error) {
        // Server doesn't support resources
      }

      try {
        await client.listTools();
        capabilities.tools = true;
      } catch (error) {
        // Server doesn't support tools
      }

      try {
        await client.listPrompts();
        capabilities.prompts = true;
      } catch (error) {
        // Server doesn't support prompts
      }

      return capabilities;
    } catch (error) {
      console.error("Error getting server capabilities:", error);
      return {
        resources: false,
        tools: false,
        prompts: false
      };
    }
  }

  private async getResources(client: Client, hasCapability: boolean) {
    if (!hasCapability) return [];
    
    try {
      const response = await client.listResources();
      return response.resources || [];
    } catch (error) {
      console.error("Error getting resources:", error);
      return [];
    }
  }

  private async getTools(client: Client, hasCapability: boolean) {
    if (!hasCapability) return [];
    
    try {
      const response = await client.listTools();
      return response.tools || [];
    } catch (error) {
      console.error("Error getting tools:", error);
      return [];
    }
  }

  private async getPrompts(client: Client, hasCapability: boolean) {
    if (!hasCapability) return [];
    
    try {
      const response = await client.listPrompts();
      return response.prompts || [];
    } catch (error) {
      console.error("Error getting prompts:", error);
      return [];
    }
  }

  getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId);
  }

  getAllConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  async callTool(serverId: string, toolName: string, args: Record<string, any>) {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args
      });
      
      return result;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  async readResource(serverId: string, uri: string) {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const result = await connection.client.readResource({ uri });
      return result;
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw error;
    }
  }

  async getPrompt(serverId: string, promptName: string, args: Record<string, any>) {
    const connection = this.connections.get(serverId);
    if (!connection || !connection.isConnected) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const result = await connection.client.getPrompt({
        name: promptName,
        arguments: args
      });
      
      return result;
    } catch (error) {
      console.error(`Error getting prompt ${promptName}:`, error);
      throw error;
    }
  }

  async testConnection(serverConfig: Omit<MCPServer, "id" | "status" | "createdAt" | "updatedAt">): Promise<boolean> {
    try {
      console.log("Testing connection with config:", serverConfig); // Debug log
      
      const client = new Client({
        name: "ai-chat-mcp-host-test",
        version: "1.0.0"
      });

      let transport: StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport;
      
      // Default to stdio if transport is not specified
      const transportType = serverConfig.transport || "stdio";
      
      if (transportType === "stdio") {
        if (!serverConfig.command) {
          throw new Error("Command is required for stdio transport");
        }
        transport = new StdioClientTransport({
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env
        });
      } else if (transportType === "http") {
        if (!serverConfig.url) {
          throw new Error("URL is required for HTTP transport");
        }
        
        // Try Streamable HTTP first, fallback to SSE
        try {
          transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
        } catch (error) {
          transport = new SSEClientTransport(new URL(serverConfig.url));
        }
      } else {
        throw new Error(`Unsupported transport type: ${transportType}`);
      }

      // Try to connect with a timeout
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection timeout")), 10000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      // Test basic functionality
      try {
        await client.listTools();
      } catch (error) {
        // It's okay if this fails, we just want to test the connection
      }

      await transport.close();
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }
}

// Global instance for server-side use
export const mcpServerManager = new MCPServerManager();
