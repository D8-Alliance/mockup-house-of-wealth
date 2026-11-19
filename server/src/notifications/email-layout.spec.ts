import { renderEmailHtml } from './email-layout';

describe('renderEmailHtml', () => {
  it('shows the subject as the heading and greets the recipient in their language', () => {
    const html = renderEmailHtml({ title: 'Keuntungan dibayar', message: 'RM 2,625.00 dibayar.', recipientName: 'Amran Zain', language: 'ms' });
    expect(html).toContain('>Keuntungan dibayar</h1>');
    expect(html).toContain('Kepada <strong');
    expect(html).toContain('Sila jangan balas');
  });

  it('leaves out the greeting when there is no name', () => {
    expect(renderEmailHtml({ title: 'Hello', message: 'Body' })).not.toMatch(/Dear|Kepada/);
  });

  it('escapes the text so it cannot add its own HTML', () => {
    const html = renderEmailHtml({ title: '<b>x</b>', message: 'a <script>alert(1)</script> & b' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; b');
  });

  it('hides the web address in the text and opens it from the button, without the full stop after it', () => {
    const html = renderEmailHtml({ title: 'T', message: 'Open https://example.test/m/hibah/abc before 1 Dec.' });
    expect(html).toContain('Open the link below before 1 Dec.');
    expect(html).toContain('<a href="https://example.test/m/hibah/abc" target="_blank"');
    expect(html.match(/https:\/\/example\.test/g)).toHaveLength(1);
  });

  it('adds one button per different web address, and none when there is no address', () => {
    const html = renderEmailHtml({ title: 'T', message: 'Open https://example.test/a or https://example.test/a again.', language: 'ms' });
    expect(html.match(/>Buka pautan</g)).toHaveLength(1);
    expect(html).toContain('<a href="https://example.test/a" target="_blank"');
    expect(renderEmailHtml({ title: 'T', message: 'No address here.' })).not.toContain('Open link');
  });
});
