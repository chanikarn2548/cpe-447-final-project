import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { parseOcrFindings, extractImageText, terminateOcrWorker } from '../ocr-extract.mjs';
import { verifyLineSignature, buildLineReplyMessages, handleLineWebhookEvents } from '../line-bot.mjs';

test.after(async () => {
  await terminateOcrWorker();
});

test('OCR parser extracts Thai mobile/landline phones, LINE IDs, Thai areas, and poster hints', () => {
  const sample = `
    ประกาศตามหาแมวส้มหาย มีปลอกคอสีแดง
    หายแถว อารีย์ พญาไท มีรางวัลนำจับ
    โทร 081 234 5678 หรือ 02-999-1234
    LINE ID: @pawtal_cat
  `;
  const res = parseOcrFindings(sample);
  assert.deepEqual(res.phones, ['081-234-5678', '02-999-1234']);
  assert.deepEqual(res.lineIds, ['@pawtal_cat']);
  assert.ok(res.areas.some((a) => a.includes('อารีย์')));
  assert.ok(res.hints.some((h) => h.includes('ปลอกคอ')));
  assert.ok(res.hints.some((h) => h.includes('รางวัล')));
  assert.ok(res.summary.includes('081-234-5678'));
});

test('Tesseract OCR engine reads phone number and text from a rendered collar/poster image', async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="40" y="90" font-family="DejaVu Sans, Arial, sans-serif" font-size="44" font-weight="bold" fill="#000000">LOST PET 081-234-5678</text>
    <text x="40" y="155" font-family="DejaVu Sans, Arial, sans-serif" font-size="36" fill="#000000">LINE ID: pawtal99</text>
  </svg>`;
  const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  const ocr = await extractImageText(pngBuf, { lang: 'eng' });
  assert.equal(ocr.engine, 'tesseract.js');
  assert.ok(ocr.phones.includes('081-234-5678'), `Expected 081-234-5678 in OCR output, got text="${ocr.text}"`);
  assert.ok(ocr.lineIds.includes('pawtal99') || /pawtal99/i.test(ocr.text), `Got text="${ocr.text}"`);
});

test('LINE Messaging API signature verification uses HMAC-SHA256 securely', () => {
  const secret = 'test-line-channel-secret-123';
  const body = Buffer.from(JSON.stringify({ events: [] }), 'utf8');
  const validSig = crypto.createHmac('sha256', secret).update(body).digest('base64');

  assert.equal(verifyLineSignature(body, validSig, secret), true);
  assert.equal(verifyLineSignature(Buffer.from('{"events":[1]}'), validSig, secret), false);
  assert.equal(verifyLineSignature(body, validSig, 'wrong-secret'), false);
  assert.equal(verifyLineSignature(body, '', secret), false);
});

test('LINE Bot builds Flex reply card and handles mocked image + text webhook events end-to-end', async () => {
  const flexMsgs = buildLineReplyMessages({
    species: 'cat',
    breed: 'แมวไทย (Thai Cat)',
    coat: { primaryTag: 'ส้ม-ขาว', tags: ['ส้ม-ขาว', 'ลายสลิด / ลายเสือ'] },
    ocr: { summary: '📞 081-234-5678 · 📍 อารีย์' },
    matches: [
      { title: 'พบแมวส้มแถวอารีย์', source: 'FM91', score: 0.91, url: 'https://fm91bkk.com/1', hybridBadge: '📍 พื้นที่เดียวกัน' }
    ]
  }, 'https://pawtal.up.railway.app');

  assert.equal(flexMsgs[0].type, 'flex');
  assert.equal(flexMsgs[0].contents.type, 'bubble');
  assert.ok(JSON.stringify(flexMsgs[0]).includes('ส้ม-ขาว'));
  assert.ok(JSON.stringify(flexMsgs[0]).includes('081-234-5678'));
  assert.ok(JSON.stringify(flexMsgs[0]).includes('https://fm91bkk.com/1'));

  const sentReplies = [];
  const mockFetch = async (url, init = {}) => {
    if (String(url).includes('api-data.line.me/v2/bot/message/img-42/content')) {
      return new Response(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]), { status: 200 });
    }
    if (String(url).includes('api.line.me/v2/bot/message/reply')) {
      sentReplies.push(JSON.parse(init.body));
      return new Response('{}', { status: 200 });
    }
    return new Response('not found', { status: 404 });
  };

  let analyzedBytes = 0;
  const outcome = await handleLineWebhookEvents({
    events: [
      { type: 'message', replyToken: 'rt-img', message: { id: 'img-42', type: 'image' } },
      { type: 'message', replyToken: 'rt-txt', message: { id: 'txt-1', type: 'text', text: 'สวัสดี' } }
    ],
    channelAccessToken: 'mock-token',
    baseUrl: 'https://pawtal.up.railway.app',
    analyzeImage: async (buf) => {
      analyzedBytes = buf.length;
      return { species: 'dog', breed: 'ไทยผสม', coat: { tags: ['สีน้ำตาล'] }, matches: [] };
    },
    fetchFn: mockFetch
  });

  assert.equal(analyzedBytes, 12);
  assert.equal(outcome.processed, 2);
  assert.equal(outcome.replied, 2);
  assert.equal(outcome.errors.length, 0);
  assert.equal(sentReplies[0].replyToken, 'rt-img');
  assert.equal(sentReplies[0].messages[0].type, 'flex');
  assert.equal(sentReplies[1].replyToken, 'rt-txt');
  assert.equal(sentReplies[1].messages[0].type, 'text');
});
