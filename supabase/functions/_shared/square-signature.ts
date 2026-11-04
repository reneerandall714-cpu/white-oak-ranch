// Square signs the exact notification URL followed by the exact raw body.
// Compare byte arrays without an early exit.
export async function verifySquareSignature(
  body: string, signature: string, secret: string, notificationUrl: string,
) {
  if (!secret || !notificationUrl || !signature) return false;
  try {
    const bytes = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', bytes.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key,
      bytes.encode(notificationUrl + body)));
    const expected = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    if (expected.length !== digest.length) return false;
    let mismatch = 0;
    for (let i = 0; i < digest.length; i++) mismatch |= digest[i] ^ expected[i];
    return mismatch === 0;
  } catch { return false; }
}
