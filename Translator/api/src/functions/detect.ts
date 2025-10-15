import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import axios from 'axios';

interface DetectRequest {
  text: string;
}

export async function detect(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Detect language function triggered');

  try {
    const body = await request.json() as DetectRequest;
    const { text } = body;

    if (!text) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required parameter: text' }
      };
    }

    const translatorKey = process.env.TRANSLATOR_KEY;
    const translatorRegion = process.env.TRANSLATOR_REGION || 'global';

    if (!translatorKey) {
      return {
        status: 500,
        jsonBody: { error: 'Translator API key not configured' }
      };
    }

    // Azure Translator Detect API
    const endpoint = 'https://api.cognitive.microsofttranslator.com/detect';
    const params = new URLSearchParams({
      'api-version': '3.0'
    });

    const response = await axios.post(
      `${endpoint}?${params.toString()}`,
      [{ text }],
      {
        headers: {
          'Ocp-Apim-Subscription-Key': translatorKey,
          'Ocp-Apim-Subscription-Region': translatorRegion,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    const result = response.data[0];

    return {
      status: 200,
      jsonBody: {
        language: result.language,
        score: result.score,
        isTranslationSupported: result.isTranslationSupported,
        isTransliterationSupported: result.isTransliterationSupported
      }
    };

  } catch (error: any) {
    context.error('Detection error:', error);

    if (error.response) {
      return {
        status: error.response.status,
        jsonBody: {
          error: 'Language detection service error',
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

app.http('detect', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: detect
});
