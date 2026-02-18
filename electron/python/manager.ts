import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

type NotificationHandler = (notification: string, params: any) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}

export class PythonManager {
  private process: ChildProcess | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private buffer: string = '';
  private restartCount: number = 0;
  private maxRestarts: number = 3;
  private requestTimeoutMs: number = 60000; // 1 minute for long queries
  private notificationHandler: NotificationHandler | null = null;

  onNotification(handler: NotificationHandler): void {
    this.notificationHandler = handler;
  }

  async start(): Promise<void> {
    const isDev = !!process.env.VITE_DEV_SERVER_URL;

    if (isDev) {
      // Development: run Python source directly
      const serverPath = path.join(__dirname, '..', 'python', 'server.py');
      this.process = spawn('python3', ['-u', serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });
    } else {
      // Production: run PyInstaller-compiled binary
      const binaryName = process.platform === 'win32' ? 'icetop-backend.exe' : 'icetop-backend';
      const binaryPath = path.join(process.resourcesPath, 'backend-dist', binaryName);
      this.process = spawn(binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });
    }

    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('[Python stderr]', data.toString());
    });

    this.process.on('close', (code) => {
      console.log(`[Python] Process exited with code ${code}`);
      this.rejectAll('Python process exited');
      if (this.restartCount < this.maxRestarts) {
        this.restartCount++;
        console.log(`[Python] Restarting (attempt ${this.restartCount}/${this.maxRestarts})…`);
        setTimeout(() => this.start(), 1000);
      }
    });

    // Wait for health check
    try {
      await this.sendRequest('ping', {});
      console.log('[Python] Backend ready');
      this.restartCount = 0;
    } catch {
      console.warn('[Python] Health check failed, backend may need IceFrame installed');
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.rejectAll('Application shutting down');
  }

  async sendRequest(method: string, params: Record<string, any>): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Python backend is not running');
    }

    const id = uuidv4();
    const request = JSON.stringify({ id, method, params }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.requestTimeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.process!.stdin!.write(request);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);

        // Handle notification messages (no id, has notification field)
        if (msg.notification && this.notificationHandler) {
          this.notificationHandler(msg.notification, msg.params || {});
          continue;
        }

        // Handle normal JSON-RPC responses
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(msg.id);
          if (msg.error) {
            pending.reject(new Error(msg.error.message || 'Unknown error'));
          } else {
            pending.resolve(msg.result);
          }
        }
      } catch (err) {
        console.error('[Python] Failed to parse response:', line);
      }
    }
  }

  private rejectAll(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }
}
