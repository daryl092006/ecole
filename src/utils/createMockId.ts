let sequence = 0;

export function createMockId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${sequence.toString(36).toUpperCase()}`;
}
