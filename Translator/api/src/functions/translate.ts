import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';

interface TranslateRequest {
  text: string;
  from?: string;
  to: string;
}

export async function translate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Translate function triggered');

  try {
    // 解析请求体
    const body = await request.json() as TranslateRequest;
    const { text, from = 'auto', to } = body;

    if (!text || !to) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required parameters: text and to' }
      };
    }

    // 获取环境变量
    const translatorKey = process.env.TRANSLATOR_KEY;
    const translatorRegion = process.env.TRANSLATOR_REGION || 'global';

    if (!translatorKey) {
      return {
        status: 500,
        jsonBody: { error: 'Translator API key not configured' }
      };
    }

    // 构建 Azure Translator API 请求
    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate';
    const params = new URLSearchParams({
      'api-version': '3.0',
      'to': to
    });

    // 如果指定了源语言（非自动检测）
    if (from && from !== 'auto') {
      params.append('from', from);
    }

    // 调用 Azure Translator API
    const response = await axios.post(
      `${endpoint}?${params.toString()}`,
      [{ text }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': translatorKey,
          'Ocp-Apim-Subscription-Region': translatorRegion,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    // 提取翻译结果
    const result = response.data[0];
    const detectedLanguage = result.detectedLanguage?.language;
    const translation = result.translations[0].text;

    return {
      status: 200,
      jsonBody: {
        translation,
        detectedLanguage,
        originalText: text,
        targetLanguage: to
      }
    };

  } catch (error: any) {
    context.error('Translation error:', error);

    if (error.response) {
      return {
        status: error.response.status,
        jsonBody: {
          error: 'Translation service error',
          details: error.response.data
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

app.http('translate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: translate
});
