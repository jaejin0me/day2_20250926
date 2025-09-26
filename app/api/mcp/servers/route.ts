import { NextRequest, NextResponse } from "next/server";
import { mcpServerManager } from "@/lib/mcp-server";
import { MCPServer } from "@/types/mcp";

// MCP 서버 관리 API
export async function POST(request: NextRequest) {
  try {
    const { action, serverId, serverConfig } = await request.json();

    switch (action) {
      case "connect":
        return await handleConnect(serverId, serverConfig);
      
      case "disconnect":
        return await handleDisconnect(serverId);
      
      case "test":
        return await handleTest(serverConfig);
      
      default:
        return NextResponse.json(
          { error: "지원하지 않는 액션입니다." },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("MCP Server API Error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function handleConnect(serverId: string, serverConfig: any) {
  try {
    console.log("Connecting to server with config:", serverConfig); // Debug log
    
    const server: MCPServer = {
      id: serverId,
      name: serverConfig.name,
      transport: serverConfig.transport || "stdio", // Default to stdio
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
      url: serverConfig.url,
      headers: serverConfig.headers,
      description: serverConfig.description,
      status: "disconnected",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("Created server object:", server); // Debug log

    const connection = await mcpServerManager.connectServer(server);

    return NextResponse.json({
      success: true,
      message: "MCP 서버에 성공적으로 연결되었습니다.",
      server: {
        id: serverId,
        status: "connected",
        capabilities: connection.capabilities,
        resources: connection.resources,
        tools: connection.tools,
        prompts: connection.prompts
      }
    });
  } catch (error) {
    console.error("Connection failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "MCP 서버 연결에 실패했습니다."
      },
      { status: 400 }
    );
  }
}

async function handleDisconnect(serverId: string) {
  try {
    await mcpServerManager.disconnectServer(serverId);
    return NextResponse.json({ 
      success: true, 
      message: "서버 연결이 해제되었습니다." 
    });
  } catch (error) {
    console.error("Disconnect failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "연결 해제에 실패했습니다."
      },
      { status: 400 }
    );
  }
}

async function handleTest(serverConfig: any) {
  try {
    console.log("Testing server config:", serverConfig); // Debug log
    
    const isValid = await mcpServerManager.testConnection({
      name: serverConfig.name,
      transport: serverConfig.transport || "stdio", // Default to stdio if not provided
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
      url: serverConfig.url,
      headers: serverConfig.headers,
      description: serverConfig.description
    });

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: "서버 설정이 유효하며 연결 테스트에 성공했습니다.",
        validationResults: {
          command: "실행 가능",
          connection: "연결 성공",
          protocol: "MCP 프로토콜 호환"
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "서버 연결 테스트에 실패했습니다. 설정을 확인해주세요."
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "연결 테스트 중 오류가 발생했습니다."
      },
      { status: 400 }
    );
  }
}

