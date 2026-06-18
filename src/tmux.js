import { execFileSync, execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFileCb);

export function buildCaptureArgs(pane, lines = 200) {
  return ['capture-pane', '-t', pane, '-p', '-S', `-${lines}`];
}

// The message text and Enter must be sent as SEPARATE send-keys calls.
// Current Claude Code TUI (v2.x) does not submit when text and Enter arrive
// in one call — the Enter is absorbed and the text just sits in the prompt.
// `-l` sends the text literally so words like "Enter" in a custom retry
// message aren't interpreted as key names.
export function buildSendTextArgs(pane, text) {
  return ['send-keys', '-t', pane, '-l', text];
}

export function buildSendEnterArgs(pane) {
  return ['send-keys', '-t', pane, 'Enter'];
}

// Delay between typing the text and pressing Enter, giving the TUI time to
// register the input before submission.
export const SEND_KEYS_ENTER_DELAY_MS = 300;

export function buildDisplayArgs(pane, format) {
  return ['display-message', '-t', pane, '-p', format];
}

export function parseTmuxVersion(versionString) {
  const match = versionString.match(/tmux\s+(\d+\.\d+)/);
  return match ? parseFloat(match[1]) : 0;
}

export function getTmuxVersion() {
  try {
    return parseTmuxVersion(execFileSync('tmux', ['-V'], { encoding: 'utf-8' }).trim());
  } catch { return 0; }
}

export async function capturePane(pane, lines = 200) {
  const { stdout } = await execFileAsync('tmux', buildCaptureArgs(pane, lines));
  return stdout;
}

export async function sendKeys(pane, text) {
  // Type the text first, pause so the TUI registers it, then submit with Enter.
  // Sending both in one call does not submit in the current Claude Code TUI.
  await execFileAsync('tmux', buildSendTextArgs(pane, text));
  await new Promise((r) => setTimeout(r, SEND_KEYS_ENTER_DELAY_MS));
  await execFileAsync('tmux', buildSendEnterArgs(pane));
}

export async function getPaneCommand(pane) {
  const { stdout } = await execFileAsync('tmux', buildDisplayArgs(pane, '#{pane_current_command}'));
  return stdout.trim();
}

export async function isProcessForeground(pid) {
  try {
    const { stdout } = await execFileAsync('ps', ['-o', 'stat=', '-p', String(pid)]);
    return stdout.trim().includes('+');
  } catch {
    return null;
  }
}

export function isInsideTmux() { return !!process.env.TMUX; }
export function getCurrentPane() { return process.env.TMUX_PANE || null; }
