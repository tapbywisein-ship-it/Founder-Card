// tests/setup.ts mocks the whole email module (to block real sends); we're
// unit-testing the real sanitizers, so pull the actual implementation.
const { plainTextToEmailHtml, escapeHtml } =
  jest.requireActual<typeof import('../../src/utils/email')>('../../src/utils/email');

describe('plainTextToEmailHtml', () => {
  it('escapes HTML so typed markup cannot inject into blast emails', () => {
    const out = plainTextToEmailHtml('<img src=x onerror=alert(1)>Hi {{name}}');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('converts newlines to <br> and wraps in a paragraph', () => {
    expect(plainTextToEmailHtml('line one\nline two\r\nline three')).toBe(
      '<p>line one<br>line two<br>line three</p>'
    );
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;'
    );
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
