/**
 * API client for communicating with the backend
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface CaptureResponse {
    success: boolean;
    text: string;
    length: number;
    message?: string;
}

export interface TranslateResponse {
    success: boolean;
    original_text: string;
    translated_text: string;
    source_lang: string;
    target_lang: string;
    provider: string;
    message?: string;
}

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.backend.baseUrl,
            timeout: 60000, // 60 seconds for translation API calls
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Send captured text to backend
     */
    async captureText(text: string, source: string = 'clipboard'): Promise<CaptureResponse> {
        try {
            const response = await this.client.post<CaptureResponse>('/api/capture', {
                text,
                source,
            });
            return response.data;
        } catch (error) {
            console.error('Error in captureText:', error);
            throw error;
        }
    }

    /**
     * Request translation
     */
    async translateText(
        text: string,
        sourceLang: string = 'auto',
        targetLang: string = 'zh-CN',
        mode?: string
    ): Promise<TranslateResponse> {
        try {
            const response = await this.client.post<TranslateResponse>('/api/translate', {
                text,
                source_lang: sourceLang,
                target_lang: targetLang,
                mode: mode || 'translate',
            });
            return response.data;
        } catch (error) {
            console.error('Error in translateText:', error);
            throw error;
        }
    }

    /**
     * Check if backend is healthy
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/health');
            return response.data.status === 'healthy';
        } catch (error) {
            return false;
        }
    }
}

export const apiClient = new ApiClient();
