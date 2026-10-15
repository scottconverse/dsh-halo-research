> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../../../../../README.md).

===== FILE: halo-notify.mjs =====
/**
 * halo-notify.mjs
 *
 * Provides Windows toast notifications via PowerShell/WinRT with a console
 * beep fallback, retry logic with exponential backoff, JSONL logging, and
 * heartbeat persistence.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Fallback notification method when toast fails.
 * Writes a bell character to stderr.
 * @returns {{ok: boolean, method: string}} Result object indicating failure and console method.
 */
function _beepFallback() {
  process.stderr.write('\u0007'); // Bell character
  return { ok: false, method: 'console' };
}

/**
 * Executes a PowerShell script in a child process.
 * @param {string} script - The PowerShell command string to execute.
 * @returns {Promise<void>} Resolves if exit code is 0, rejects otherwise.
 */
function _runPowerShell(script) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        const error = new Error(`PowerShell exited with code ${code}: ${stderr || stdout}`);
        error.code = code;
        reject(error);
      }
    });
  });
}

/**
 * Builds the PowerShell script string for sending a toast notification.
 * @param {string} title - The title of the toast notification.
 * @param {string} message - The body message of the toast notification.
 * @returns {string} The PowerShell script content.
 */
function _buildToastScript(title, message) {
  // Escape single quotes for PowerShell string interpolation safety if needed, 
  // but since we are passing via -Command, we construct a safe script block.
  const escapedTitle = title.replace(/'/g, "''");
  const escapedMessage = message.replace(/'/g, "''");

  return `
try {
    $toastXml = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">${escapedTitle}</text>
            <text id="2">${escapedMessage}</text>
        </binding>
    </visual>
</toast>
"@;

    $xml = [Xml]$toastXml;
    $templateContent = [Windows.UI.Notifications.ToastTemplateType]::ToastText02;
    $toast = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('') | 
             New-Object Windows.UI.Notifications.ToastNotification($xml);
    
    # Alternative approach using WinRT directly as specified in plan:
    # The plan specifies: [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('') and Show() via WinRT
    
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('');
    $toastXmlString = @"
<toast>
  <visual>
    <binding template="ToastText02">
      <text id="1">${escapedTitle}</text>
      <text id="2">${escapedMessage}</text>
    </binding>
  </visual>
</toast>
"@;
    
    $xmlDoc = [Xml]$toastXmlString;
    $toastNotification = New-Object Windows.UI.Notifications.ToastNotification($xmlDoc);
    $notifier.Show($toastNotification);
    
    Write-Output "OK"
} catch {
    throw $_
}
`;
}

/**
 * Sends a toast notification on Windows. Falls back to console beep if it fails.
 * @param {string} title - The title of the notification.
 * @param {string} message - The body of the notification.
 * @param {object} [opts] - Optional configuration (reserved for future use).
 * @returns {Promise<{ok: boolean, method: string}>} Result object indicating success/failure and method used.
 */
export async function notify(title, message, opts = {}) {
  const script = _buildToastScript(title, message);
  
  try {
    await _runPowerShell(script);
    return { ok: true, method: 'toast' };
  } catch (err) {
    // Fallback to console beep
    return _beepFallback();
  }
}
/**
 * Internal helper that returns a promise resolving after the given number of milliseconds.
 * @param {number} ms - The duration to sleep in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the timeout expires.
 */
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an asynchronous function with exponential backoff retry logic.
 * 
 * The function will be retried up to `attempts` times if it throws an error.
 * Between retries, a delay is calculated using the formula:
 * `baseMs * (factor ^ (attempt - 1))`. If `jitter` is enabled, a random value
 * between 0 and 25% of the calculated delay is added to prevent thundering herd issues.
 * 
 * @param {Function} fn - The asynchronous function to execute. It should return a Promise.
 * @param {object} [opts] - Configuration options for the retry behavior.
 * @param {number} [opts.attempts=3] - Maximum number of attempts (including the first one).
 * @param {number} [opts.baseMs=500] - Base delay in milliseconds for the first retry.
 * @param {number} [opts.factor=2] - Multiplier applied to the base delay for each subsequent attempt.
 * @param {boolean} [opts.jitter=true] - Whether to add random jitter to the calculated delay.
 * @param {Function} [opts.onRetry] - Optional callback invoked before a retry with (error, attemptNumber).
 * @returns {Promise<*>} The result of the successful function execution.
 * @throws {*} Rethrows the last error if all attempts fail.
 */
export async function withRetry(fn, opts = {}) {
  const {
    attempts = 3,
    baseMs = 500,
    factor = 2,
    jitter = true,
    onRetry = null
  } = opts;

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // If this was the final attempt, do not sleep or call onRetry before rethrowing
      if (attempt >= attempts) {
        break;
      }

      // Invoke optional callback for observability/logging
      if (typeof onRetry === 'function') {
        try {
          onRetry(err, attempt);
        } catch (callbackErr) {
          // Ignore errors in the onRetry callback to prevent breaking the retry loop
          console.error('Error in withRetry onRetry callback:', callbackErr);
        }
      }

      // Calculate exponential backoff delay
      let delay = baseMs * Math.pow(factor, attempt - 1);

      // Apply jitter if enabled (0-25% of the calculated delay)
      if (jitter) {
        const jitterAmount = delay * (Math.random() * 0.25);
        delay += jitterAmount;
      }

      await _sleep(delay);
    }
  }

  // If we exit the loop without returning, all attempts failed
  throw lastError;
}
/**
 * A logger that appends JSON objects as newline-delimited records (JSONL).
 */
export class JsonlLogger {
  /**
   * Creates a new JsonlLogger instance.
   * @param {string} path - The file path where logs will be appended.
   */
  constructor(path) {
    this.path = path;
    
    // Ensure the parent directory exists
    const parentDir = path.dirname(this.path);
    try {
      fs.mkdirSync(parentDir, { recursive: true });
    } catch (err) {
      console.error(`Warning: Could not create directory for log file ${this.path}:`, err.message);
    }
  }

  /**
   * Logs a single object to the JSONL file.
   * @param {object} obj - The data object to serialize and append.
   * @returns {boolean} True if the write was successful, false otherwise.
   */
  log(obj) {
    const record = { ...obj, ts: new Date().toISOString() };
    let line;
    
    try {
      line = JSON.stringify(record);
      // Ensure trailing newline is present for valid JSONL format
      if (!line.endsWith('\n')) {
        line += '\n';
      }
      
      fs.appendFile(this.path, line, (err) => {
        if (err) {
          console.error(`Error appending to log file ${this.path}:`, err.message);
        }
      });
      
      // Note: appendFile is async. For strict synchronous return value semantics 
      // as requested by the plan ("returns false on failure, true on success"), 
      // we would ideally use sync operations or track state. However, standard 
      // Node.js fs.appendFile is callback-based. To strictly adhere to the 
      // "returns boolean" contract in a synchronous context without blocking,
      // this implementation assumes immediate dispatch success unless an error 
      // occurs during serialization or path validation. 
      // For robustness in the heartbeat use case which checks return value,
      // we should probably use fs.appendFileSync to guarantee the return value 
      // reflects the actual write status synchronously. Let's switch to sync 
      // for correctness of the return value contract.
      
    } catch (err) {
      console.error(`Error serializing log entry:`, err.message);
      return false;
    }

    // Re-implementing with Sync to ensure boolean return reflects write status
    try {
      const line = JSON.stringify(record) + '\n';
      fs.appendFileSync(this.path, line);
      return true;
    } catch (err) {
      console.error(`Error appending to log file ${this.path}:`, err.message);
      return false;
    }
  }

  /**
   * Retrieves the last n records from the JSONL file.
   * @param {number} n - The number of lines to retrieve from the end of the file.
   * @returns {Array<object>} An array of parsed JSON objects representing the last n valid lines.
   */
  tail(n) {
    if (n <= 0) return [];

    let stats;
    try {
      stats = fs.statSync(this.path);
    } catch (err) {
      // File does not exist or is inaccessible
      return [];
    }

    const THRESHOLD = 1 * 1024 * 1024; // 1MB
    
    let content;
    
    if (stats.size < THRESHOLD) {
      try {
        content = fs.readFileSync(this.path, 'utf8');
      } catch (err) {
        console.error(`Error reading log file ${this.path}:`, err.message);
        return [];
      }
    } else {
      // For large files, read from the end to avoid loading the entire file into memory.
      // This is a simplified approach: we read chunks backwards until we have enough data 
      // or reach the start of the file.
      try {
        const fd = fs.openSync(this.path, 'r');
        let bytesRead = 0;
        let buffer = Buffer.alloc(64 * 1024); // 64KB chunks
        let offset = stats.size;
        let dataChunks = [];
        
        while (offset > 0 && bytesRead < THRESHOLD) {
          const readSize = Math.min(buffer.length, offset);
          offset -= readSize;
          
          fs.readSync(fd, buffer, 0, readSize, offset);
          dataChunks.unshift(Buffer.from(buffer.slice(0, readSize)));
          bytesRead += readSize;
        }
        
        fs.closeSync(fd);
        content = Buffer.concat(dataChunks).toString('utf8');
      } catch (err) {
        console.error(`Error reading tail of log file ${this.path}:`, err.message);
        return [];
      }
    }

    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    // Take the last n lines
    const lastLines = lines.slice(-n);
    
    const records = [];
    for (const line of lastLines) {
      try {
        records.push(JSON.parse(line));
      } catch (err) {
        // Skip malformed JSON lines
        continue;
      }
    }

    return records;
  }
}
/**
 * Starts a heartbeat logger that periodically writes process metadata to a JSONL file.
 * 
 * @param {string} path - The file path where heartbeats will be logged.
 * @param {number} intervalMs - The interval in milliseconds between log entries.
 * @returns {function(): void} A function to stop the heartbeat timer.
 */
export function heartbeat(path, intervalMs) {
  const logger = new JsonlLogger(path);
  let failureCount = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  const timer = setInterval(() => {
    const success = logger.log({ pid: process.pid });
    
    if (success) {
      failureCount = 0;
    } else {
      failureCount++;
      
      if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
        clearInterval(timer);
        console.error(`Warning: Heartbeats are not being persisted to ${path} after ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`);
      }
    }
  }, intervalMs);

  return function stop() {
    clearInterval(timer);
  };
}