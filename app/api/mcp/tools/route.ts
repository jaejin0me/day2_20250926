import { NextRequest, NextResponse } from "next/server";
import { mcpServerManager } from "@/lib/mcp-server";

// MCP 도구 호출 API
export async function POST(request: NextRequest) {
  try {
    const { serverId, toolName, args } = await request.json();

    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: "serverId와 toolName이 필요합니다." },
        { status: 400 }
      );
    }

    const result = await mcpServerManager.callTool(serverId, toolName, args || {});

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("MCP Tool API Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "도구 호출에 실패했습니다." 
      },
      { status: 500 }
    );
  }
}

// MCP 리소스 읽기 API
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const serverId = url.searchParams.get("serverId");
    const uri = url.searchParams.get("uri");

    if (!serverId || !uri) {
      return NextResponse.json(
        { error: "serverId와 uri가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await mcpServerManager.readResource(serverId, uri);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error("MCP Resource API Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "리소스 읽기에 실패했습니다." 
      },
      { status: 500 }
    );
  }
}
