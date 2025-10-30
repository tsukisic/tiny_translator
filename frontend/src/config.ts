/**
 * Application configuration
 */

export interface Config {
    app: {
        name: string;
    };
    backend: {
        host: string;
        port: number;
        baseUrl: string;
    };
    api: {
        provider: string;
        key: string;
        url: string;
    };
    translation: {
        targetLanguage: string;
    };
    hotkey: {
        captureHotkey: string;
        toggleWindowHotkey: string;
    };
    ui: {
        alwaysOnTop: boolean;
        startMinimized: boolean;
    };
    popup: {
        displayDuration: number;
        fadeOutDuration: number;
        maxWidth: number;
        maxHeight: number;
    };
}

export const config: Config = {
    app: {
        name: 'Tiny Translator',
    },
    backend: {
        host: '127.0.0.1',
        port: 8765,
        baseUrl: 'http://127.0.0.1:8765',
    },
    api: {
        provider: 'openai',
        key: '',
        url: 'https://api.openai.com/v1',
    },
    translation: {
        targetLanguage: 'zh-CN',
    },
    hotkey: {
        captureHotkey: 'ctrl+f10',
        toggleWindowHotkey: 'ctrl+shift+t',
    },
    ui: {
        alwaysOnTop: true,
        startMinimized: false,
    },
    popup: {
        displayDuration: 3000,
        fadeOutDuration: 500,
        maxWidth: 400,
        maxHeight: 300,
    },
};
