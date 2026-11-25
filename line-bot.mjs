import crypto from 'node:crypto';

const SPECIES_TH = {
  dog: 'สุนัข',
  cat: 'แมว',
  bird: 'นก',
  rabbit: 'กระต่าย',
  hamster: 'แฮมสเตอร์'
};

/**
 * Verify X-Line-Signature header using HMAC-SHA256 + constant-time comparison.
 */
export function verifyLineSignature(rawBody, signatureHeader, channelSecret) {
  const secret = String(channelSecret || '');
  const sig = String(signatureHeader || '').trim();
  if (!secret || !sig) return false;
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Build LINE Messaging API Flex + Text reply messages from Pawtal AI scan results.
 */
export function buildLineReplyMessages(analysis = {}, baseUrl = 'https://pawtal.app') {
  const cleanBase = String(baseUrl || 'https://pawtal.app').replace(/\/$/, '');
  const spLabel = SPECIES_TH[analysis.species] || 'สัตว์เลี้ยง';
  const breedText = analysis.breed || '';
  const coatText = analysis.coat?.tags?.join(' · ') || analysis.coat?.primaryTag || '';
  const ocrText = analysis.ocr?.summary || '';
  const topMatches = Array.isArray(analysis.matches) ? analysis.matches.slice(0, 3) : [];

  const bodyContents = [
    {
      type: 'text',
      text: `🐾 ตรวจพบ: ${spLabel}${breedText ? ` (${breedText})` : ''}`,
      weight: 'bold',
      size: 'md',
      wrap: true,
      color: '#2A1F3D'
    }
  ];

  if (coatText) {
    bodyContents.push({
      type: 'text',
      text: `🎨 สี/ลายขน: ${coatText}`,
      size: 'sm',
      color: '#6D3E91',
      wrap: true,
      margin: 'sm'
    });
  }

  if (ocrText) {
    bodyContents.push({
      type: 'text',
      text: `🔤 ข้อความในภาพ (OCR): ${ocrText}`,
      size: 'xs',
      color: '#4A554C',
      wrap: true,
      margin: 'sm'
    });
  }

  bodyContents.push({ type: 'separator', margin: 'md' });

  if (topMatches.length) {
    bodyContents.push({
      type: 'text',
      text: `พบประกาศที่คล้ายกันจาก 12 เว็บ (${topMatches.length} อันดับแรก):`,
      size: 'xs',
      weight: 'bold',
      color: '#7A688A',
      margin: 'md'
    });
    for (const m of topMatches) {
      const pct = Number.isFinite(Number(m.score)) ? ` · ${(Number(m.score) * 100).toFixed(0)}%` : '';
      const row = {
        type: 'box',
        layout: 'vertical',
        margin: 'sm',
        paddingAll: '8px',
        backgroundColor: '#FFFDF7',
        cornerRadius: '8px',
        contents: [
          {
            type: 'text',
            text: String(m.title || m.name || 'ประกาศสัตว์หาย/พบ').slice(0, 80),
            size: 'xs',
            weight: 'bold',
            wrap: true,
            color: '#2A1F3D'
          },
          {
            type: 'text',
            text: `${m.source || 'แหล่งสาธารณะ'}${pct}${m.hybridBadge ? ` · ${m.hybridBadge}` : ''}`.slice(0, 90),
            size: 'xxs',
            color: '#6E6378',
            wrap: true
          }
        ]
      };
      if (m.url && /^https:\/\//i.test(m.url)) {
        row.action = { type: 'uri', label: 'เปิดประกาศ', uri: m.url };
      }
      bodyContents.push(row);
    }
  } else {
    bodyContents.push({
      type: 'text',
      text: 'ยังไม่พบประกาศที่ตรงกันชัดเจนในขณะนี้ แนะนำให้ลงประกาศและสร้างโปสเตอร์ QR บนเว็บ Pawtal',
      size: 'xs',
      color: '#6E6378',
      wrap: true,
      margin: 'md'
    });
  }

  return [
    {
      type: 'flex',
      altText: `Pawtal AI: พบ${spLabel}${breedText ? ` (${breedText})` : ''} · ค้นประกาศคล้าย ${topMatches.length} รายการ`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFCA32',
          contents: [
            { type: 'text', text: '🐾 PAWTAL AI SCAN', weight: 'bold', size: 'sm', color: '#2A1F3D' },
            { type: 'text', text: 'ผลวิเคราะห์และค้นหาจาก 12 แหล่งประกาศ', size: 'xxs', color: '#5A4923' }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: bodyContents
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#2A1F3D',
              action: {
                type: 'uri',
                label: 'เปิดค้นหาเต็มรูปแบบบน Pawtal',
                uri: `${cleanBase}/?action=lost`
              }
            }
          ]
        }
      }
    }
  ];
}

async function sendLineReply(replyToken, messages, channelAccessToken, fetchFn) {
  const response = await fetchFn('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`
    },
    body: JSON.stringify({ replyToken, messages }),
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`LINE Reply API ${response.status}: ${errText.slice(0, 120)}`);
  }
  return true;
}

/**
 * Process incoming LINE Messaging API webhook events.
 * Downloads pet photos sent in chat, runs Pawtal AI analysis, and replies with a Flex card.
 */
export async function handleLineWebhookEvents({
  events = [],
  channelAccessToken = '',
  baseUrl = 'https://pawtal.app',
  analyzeImage,
  fetchFn = fetch
}) {
  const summary = { processed: 0, replied: 0, errors: [] };
  for (const event of Array.isArray(events) ? events : []) {
    summary.processed++;
    const replyToken = event?.replyToken;
    if (!replyToken || !channelAccessToken) continue;

    try {
      if (event.type === 'message' && event.message?.type === 'image' && event.message?.id) {
        const contentRes = await fetchFn(
          `https://api-data.line.me/v2/bot/message/${encodeURIComponent(event.message.id)}/content`,
          {
            headers: { Authorization: `Bearer ${channelAccessToken}` },
            signal: AbortSignal.timeout(15_000)
          }
        );
        if (!contentRes.ok) throw new Error(`LINE Content API ${contentRes.status}`);
        const imgBuf = Buffer.from(await contentRes.arrayBuffer());
        const analysis = await analyzeImage(imgBuf);
        const messages = buildLineReplyMessages(analysis, baseUrl);
        await sendLineReply(replyToken, messages, channelAccessToken, fetchFn);
        summary.replied++;
      } else if (event.type === 'follow' || (event.type === 'message' && event.message?.type === 'text')) {
        const cleanBase = String(baseUrl || 'https://pawtal.app').replace(/\/$/, '');
        await sendLineReply(
          replyToken,
          [{
            type: 'text',
            text: `🐾 สวัสดีครับ! นี่คือบอท Pawtal (พอลทัล)\n\n📸 ส่ง “รูปน้องหมา แมว นก กระต่าย หรือแฮมสเตอร์” เข้าแชทนี้ได้เลย ระบบ AI จะช่วยระบุชนิด สี/ลายขน อ่านข้อความบนภาพ (OCR) และค้นประกาศที่คล้ายกันจาก 12 เว็บให้ทันที!\n\n🌐 หรือเปิดเว็บเต็มรูปแบบ: ${cleanBase}/`
          }],
          channelAccessToken,
          fetchFn
        );
        summary.replied++;
      }
    } catch (error) {
      summary.errors.push(error.message || 'LINE event error');
    }
  }
  return summary;
}
