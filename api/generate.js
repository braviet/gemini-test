export const config = { runtime: 'nodejs20.x' };

import { GoogleGenAI } from '@google/genai';

function partsFrom({ prompt, sketchBase64, referenceBase64 }){
  const parts = [{ text: String(prompt || '') }];
  const pushImg = (dataUrl) => {
    if(!dataUrl) return;
    const m = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if(!m) return;
    const mimeType = m[1];
    const data = m[2];
    parts.push({ inlineData: { mimeType, data } });
  };
  pushImg(sketchBase64);
  pushImg(referenceBase64);
  return parts;
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if(!apiKey) return res.status(500).send('Missing GEMINI_API_KEY');
    const ai = new GoogleGenAI({ apiKey });

    const { prompt, useBundle, bundlePrompt, sketchBase64, referenceBase64 } = req.body || {};
    const text = useBundle ? (bundlePrompt || prompt) : prompt;
    if(!text) return res.status(400).send('Missing prompt');

    const contents = partsFrom({ prompt: text, sketchBase64, referenceBase64 });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents
    });

    const candidates = response?.candidates || [];
    let base64 = null, mime = 'image/png';
    for(const c of candidates){
      const parts = c?.content?.parts || [];
      for(const p of parts){
        if(p?.inlineData?.data){
          base64 = p.inlineData.data;
          mime = p.inlineData.mimeType || 'image/png';
          break;
        }
      }
      if(base64) break;
    }

    if(!base64){
      const textOut = candidates[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || 'No image part returned';
      return res.status(200).json({ text: textOut });
    }
    return res.status(200).json({ imageUrl: `data:${mime};base64,${base64}` });
  } catch (e){
    return res.status(500).send(e?.message || 'Gemini generate failed');
  }
}
