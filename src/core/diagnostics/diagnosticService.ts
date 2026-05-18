import type { Diagnostic } from '../../shared/types/elements';

export function explainDiagnostic(d: Diagnostic): string {
  const level = d.level === 'error' ? '必须修复' : d.level === 'warning' ? '建议检查' : '信息';
  return `${level}：${d.message}${d.humanAdvice ? `\n处理建议：${d.humanAdvice}` : ''}`;
}

export function sanitizeLogForAi(log: string): string {
  return log
    .replace(/[A-Z]:\\Users\\[^\\\n\r]+/gi, '[USER_PATH]')
    .replace(/\/home\/[^/\n\r]+/g, '/home/[USER]')
    .replace(/sk-[A-Za-z0-9_\-]+/g, '[API_KEY]');
}
