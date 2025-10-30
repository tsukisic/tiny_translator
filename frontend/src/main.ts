/**
 * Tiny Translator - Electron Main Process
 *
 * Handles:
 * - Backend process spawning
 * - Tray icon management
 * - Global hotkey registration
 * - Window management
 */

import { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, nativeImage } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { config } from './config';
import { apiClient } from './api/client';

let tray: Tray | null = null;
let floatWindows: BrowserWindow[] = [];  // 多个浮窗
let settingsWindow: BrowserWindow | null = null;  // 设置窗口
let backendProcess: ChildProcess | null = null;

/**
 * Start the Python backend server
 */
function startBackend(): void {
    const isDev = process.argv.includes('--dev');

    console.log('🐍 Starting Python backend...');

    // In production, this would be a bundled Python executable
    // For now, assume Python is in PATH
    const pythonCmd = isDev ? 'python' : 'python';
    const backendDir = path.join(__dirname, '../../backend');
    const serverPath = path.join(backendDir, 'server.py');

    backendProcess = spawn(pythonCmd, [serverPath], {
        stdio: 'pipe',
        cwd: backendDir,  // Run from backend directory so it can find the module
        env: {
            ...process.env,
            PYTHONPATH: path.join(__dirname, '../..'),  // Add parent dir to Python path
        },
    });

    backendProcess.stdout?.on('data', (data) => {
        console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });

    // Wait for backend to be ready
    setTimeout(() => {
        console.log('✅ Backend should be ready');
    }, 2000);
}

/**
 * Create the float window for displaying captured text
 */
function createFloatWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 650,
        height: 550,
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile(path.join(__dirname, '../views/float.html'));

    // Position at mouse cursor with smart offset
    const { screen } = require('electron');
    const mousePos = screen.getCursorScreenPoint();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Calculate offset based on existing windows to avoid overlap
    const offset = floatWindows.length * 30;  // 每个新窗口偏移30像素
    
    // Calculate position near mouse, but ensure it stays on screen
    let x = mousePos.x + 20 + offset;
    let y = mousePos.y + 20 + offset;
    
    // Keep window within screen bounds
    if (x + 400 > screenWidth) {
        x = screenWidth - 400 - 10;
    }
    if (y + 350 > screenHeight) {
        y = screenHeight - 350 - 10;
    }
    
    win.setPosition(x, y);

    // Send initial pin status after window loads
    win.webContents.once('did-finish-load', () => {
        // 窗口创建时默认是 alwaysOnTop: true
        win.webContents.send('pin-status-changed', true);
    });

    // Handle window closed
    win.on('closed', () => {
        const index = floatWindows.indexOf(win);
        if (index > -1) {
            floatWindows.splice(index, 1);
        }
    });

    floatWindows.push(win);
    return win;
}

/**
 * Create the settings window
 */
function createSettingsWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 650,
        height: 700,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile(path.join(__dirname, '../views/settings.html'));

    // Handle window closed
    win.on('closed', () => {
        settingsWindow = null;
    });

    return win;
}

/**
 * Create system tray icon and menu
 */
function createTray(): void {
    // Create a simple icon (in production, use a proper icon file)
    const icon = nativeImage.createEmpty();

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Tiny Translator',
            enabled: false,
        },
        { type: 'separator' },
        {
            label: 'Show Window',
            click: () => {
                // Always create a new window
                const win = createFloatWindow();
                win.show();
            },
        },
        {
            label: 'Test Capture',
            click: () => {
                // Simulate text capture for testing
                const testText = 'Hello, this is a test message!\n\nThis demonstrates the floating window functionality.';
                showFloatWindow(testText);
            },
        },
        {
            label: 'Settings',
            click: () => {
                if (!settingsWindow) {
                    settingsWindow = createSettingsWindow();
                }
                settingsWindow.show();
            },
        },
        { type: 'separator' },
        {
            label: 'Exit',
            click: () => {
                app.quit();
            },
        },
    ]);

    tray.setToolTip('Tiny Translator');
    tray.setContextMenu(contextMenu);

    console.log('✅ Tray icon created');
}

/**
 * Handle text capture via hotkey
 */
async function handleCapture(): Promise<void> {
    try {
        console.log('📋 Hotkey pressed, capturing text...');

        // Step 1: Call Python backend to simulate Ctrl+C and get clipboard
        const { spawn: spawnProcess } = require('child_process');
        
        // Use Windows PowerShell to simulate Ctrl+C and get clipboard
        const getClipboard = (): Promise<string> => {
            return new Promise((resolve) => {
                const ps = spawnProcess('powershell.exe', [
                    '-Command',
                    '[Console]::Out.Flush(); Add-Type -AssemblyName System.Windows.Forms; $tb = New-Object System.Windows.Forms.TextBox; $tb.Multiline = $true; [System.Windows.Forms.SendKeys]::SendWait("^c"); Start-Sleep -Milliseconds 200; [System.Windows.Forms.Clipboard]::GetText()',
                ]);

                let result = '';
                ps.stdout?.on('data', (data: any) => {
                    result += data.toString();
                });

                ps.on('close', () => {
                    resolve(result.trim());
                });
            });
        };

        // Simulate Ctrl+C using Windows API call
        const { exec } = require('child_process');
        exec('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^c")', 
             { shell: 'powershell.exe' });

        // Wait for clipboard to update
        await new Promise(resolve => setTimeout(resolve, 300));

        // Step 2: Read the clipboard
        const text = clipboard.readText();

        if (!text || text.trim().length === 0) {
            console.log('No text in clipboard after Ctrl+C');
            return;
        }

        console.log(`✅ Captured text: ${text.substring(0, 50)}...`);

        // Step 3: Send to backend
        const response = await apiClient.captureText(text);

        if (response.success) {
            // Step 4: Show float window with the text
            showFloatWindow(text);
        }
    } catch (error) {
        console.error('Error in handleCapture:', error);
    }
}

/**
 * Show float window with captured text
 * Always creates a new window if current one is visible
 */
function showFloatWindow(text: string): void {
    // Create a new window
    const win = createFloatWindow();

    // Wait for content to fully load before showing
    const initializeAndShow = () => {
        if (win && !win.isDestroyed()) {
            console.log(`Sending text to float window: ${text.substring(0, 50)}...`);
            
            // Send text first
            win.webContents.send('show-text', text);
            
            // 立即显示，不延迟
            win.show();
            win.focus();
        }
    };

    // Always wait for the page to fully load
    if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', initializeAndShow);
    } else {
        // Content already loaded (cached)
        initializeAndShow();
    }
}

/**
 * Register IPC handlers for renderer process communication
 */
function registerIpcHandlers(): void {
    const { ipcMain } = require('electron');

    // Copy to clipboard
    ipcMain.handle('copy-to-clipboard', (_event: any, text: string) => {
        clipboard.writeText(text);
        console.log('Text copied to clipboard');
        return true;
    });

    // Translate text
    ipcMain.handle('translate', async (_event: any, text: string, targetLang?: string, mode?: string) => {
        try {
            const result = await apiClient.translateText(text, 'auto', targetLang || 'zh-CN', mode);
            return result;
        } catch (error) {
            console.error('Translation error:', error);
            throw error;
        }
    });

    // Open settings window
    ipcMain.on('open-settings', () => {
        if (!settingsWindow) {
            settingsWindow = createSettingsWindow();
        }
        settingsWindow.show();
        settingsWindow.focus();
    });

    // Toggle pin status
    ipcMain.on('toggle-pin', (event: any) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            const isAlwaysOnTop = win.isAlwaysOnTop();
            win.setAlwaysOnTop(!isAlwaysOnTop);
            win.webContents.send('pin-status-changed', !isAlwaysOnTop);
        }
    });

    // Close float window
    ipcMain.on('close-float', (event: any) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.close();
        }
    });

    // Restart app
    ipcMain.on('restart-app', () => {
        app.relaunch();
        app.exit(0);
    });

    // Get settings
    ipcMain.handle('get-settings', async () => {
        return {
            apiProvider: config.api.provider,
            apiKey: config.api.key,
            apiUrl: config.api.url,
            targetLanguage: config.translation.targetLanguage,
            captureHotkey: config.hotkey.captureHotkey,
            toggleWindowHotkey: config.hotkey.toggleWindowHotkey,
            alwaysOnTop: config.ui.alwaysOnTop,
            startMinimized: config.ui.startMinimized
        };
    });

    // Save settings
    ipcMain.handle('save-settings', async (_event: any, settings: any) => {
        try {
            // Update config
            config.api.provider = settings.apiProvider;
            config.api.key = settings.apiKey;
            config.api.url = settings.apiUrl;
            config.translation.targetLanguage = settings.targetLanguage;
            config.ui.alwaysOnTop = settings.alwaysOnTop;
            config.ui.startMinimized = settings.startMinimized;

            // Re-register hotkeys if changed
            if (settings.captureHotkey !== config.hotkey.captureHotkey ||
                settings.toggleWindowHotkey !== config.hotkey.toggleWindowHotkey) {
                globalShortcut.unregisterAll();
                config.hotkey.captureHotkey = settings.captureHotkey;
                config.hotkey.toggleWindowHotkey = settings.toggleWindowHotkey;
                registerHotkeys();
            }

            return { success: true };
        } catch (error: any) {
            console.error('Save settings error:', error);
            return { success: false, error: error.message };
        }
    });
}

/**
 * Register global hotkeys
 */
function registerHotkeys(): void {
    // Capture hotkey (Ctrl+F10)
    const captureHotkey = config.hotkey.captureHotkey.replace('ctrl', 'CommandOrControl');

    const registered = globalShortcut.register(captureHotkey, handleCapture);

    if (registered) {
        console.log(`✅ Hotkey registered: ${config.hotkey.captureHotkey}`);
    } else {
        console.error('❌ Failed to register hotkey');
    }

    // Toggle window hotkey (Ctrl+Shift+T)
    const toggleHotkey = config.hotkey.toggleWindowHotkey
        .replace('ctrl', 'CommandOrControl')
        .replace('shift', 'Shift');

    globalShortcut.register(toggleHotkey, () => {
        // Toggle visibility of all windows
        if (floatWindows.length > 0) {
            const allHidden = floatWindows.every(w => !w.isVisible());
            floatWindows.forEach(w => {
                if (allHidden) {
                    w.show();
                } else {
                    w.hide();
                }
            });
        } else {
            // Create new window if none exists
            const win = createFloatWindow();
            win.show();
        }
    });
}

/**
 * App ready handler
 */
/**
 * App ready handler
 */
app.whenReady().then(() => {
    console.log('🚀 Tiny Translator starting...');

    // Start backend server
    startBackend();

    // Create tray icon
    createTray();

    // Don't create window initially, wait for hotkey

    // Register global hotkeys
    registerHotkeys();

    // Register IPC handlers
    registerIpcHandlers();

    console.log('✅ Application ready');
    console.log(`   Hotkey: ${config.hotkey.captureHotkey} - Capture text`);
    console.log(`   Hotkey: ${config.hotkey.toggleWindowHotkey} - Toggle window`);
});

/**
 * Cleanup on quit
 */
app.on('will-quit', () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();

    // Kill backend process
    if (backendProcess) {
        backendProcess.kill();
    }
});

/**
 * Prevent app from quitting when all windows are closed (runs in background)
 */
app.on('window-all-closed', () => {
    // Don't quit app when all windows are closed - keep running in tray
});
