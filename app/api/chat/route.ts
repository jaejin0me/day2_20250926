import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    // API 키 확인
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다. .env.local 파일에 GEMINI_API_KEY를 설정해주세요.' },
        { status: 500 }
      );
    }

    // 스트리밍 응답을 위한 ReadableStream 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 채팅 세션 생성 (history가 있으면 포함)
          const chat = genAI.chats.create({
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001',
            history: history,
            config: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          });

          // 스트리밍 응답 받기
          const response = await chat.sendMessageStream({ message });

          // 각 청크를 클라이언트로 전송
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              const data = JSON.stringify({ text, done: false });
              controller.enqueue(`data: ${data}\n\n`);
            }
          }

          // 완료 신호 전송
          const doneData = JSON.stringify({ text: '', done: true });
          controller.enqueue(`data: ${doneData}\n\n`);
          
        } catch (error) {
          console.error('Gemini API error:', error);
          
          // 에러 메시지를 스트림으로 전송
          let errorMessage = '죄송합니다. 오류가 발생했습니다.';
          
          if (error instanceof Error) {
            if (error.message.includes('API_KEY_INVALID') || error.message.includes('401')) {
              errorMessage = 'Gemini API 키가 유효하지 않습니다. API 키를 확인해주세요.';
            } else if (error.message.includes('QUOTA_EXCEEDED') || error.message.includes('429')) {
              errorMessage = 'API 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.';
            } else if (error.message.includes('SAFETY')) {
              errorMessage = '안전 정책에 위배되는 내용입니다. 다른 질문을 해주세요.';
            } else {
              errorMessage = `오류: ${error.message}`;
            }
          }

          const errorData = JSON.stringify({ text: errorMessage, done: true, error: true });
          controller.enqueue(`data: ${errorData}\n\n`);
        } finally {
          controller.close();
        }
      },
    });

    // SSE 헤더와 함께 스트림 반환
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
