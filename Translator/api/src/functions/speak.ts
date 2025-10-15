import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';

interface SpeakRequest {
  text: string;
  language: string;
}

export async function speak(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Speak function triggered');

  try {
    const body = await request.json() as SpeakRequest;
    const { text, language } = body;

    if (!text || !language) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required parameters: text and language' }
      };
    }

    const speechKey = process.env.SPEECH_KEY;
    const speechRegion = process.env.SPEECH_REGION || 'eastus2';

    if (!speechKey) {
      return {
        status: 500,
        jsonBody: { error: 'Speech API key not configured' }
      };
    }

    // 映射语言代码到 Azure Speech 语音名称
    const voiceMap: Record<string, string> = {
      'zh-Hans': 'zh-CN-XiaoxiaoNeural',
      'zh-CN': 'zh-CN-XiaoxiaoNeural',
      'en': 'en-US-JennyNeural',
      'en-US': 'en-US-JennyNeural',
      'ja': 'ja-JP-NanamiNeural',
      'ko': 'ko-KR-SunHiNeural',
      'es': 'es-ES-ElviraNeural',
      'fr': 'fr-FR-DeniseNeural',
      'de': 'de-DE-KatjaNeural',
      'ru': 'ru-RU-SvetlanaNeural'
    };

    const voiceName = voiceMap[language] || 'en-US-JennyNeural';

    // 构建 SSML
    const ssml = `
      <speak version='1.0' xml:lang='${language}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='${voiceName}'>
          ${text}
        </voice>
      </speak>
    `.trim();

    // 调用 Azure Speech TTS API
    const endpoint = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const response = await axios.post(
      endpoint,
      ssml,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        },
        responseType: 'arraybuffer',
        timeout: 10000
      }
    );

    // 返回音频数据
    return {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': response.data.length.toString()
      },
      body: Buffer.from(response.data)
    };

  } catch (error: any) {
    context.error('Speech synthesis error:', error);

    if (error.response) {
      return {
        status: error.response.status,
        jsonBody: {
          error: 'Speech service error',
          details: error.response.data?.toString() || 'Unknown error'
        }
      };
    }

    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message
      }
    };
  }
}

app.http('speak', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: speak
});
