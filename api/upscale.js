export const config = { runtime: 'nodejs20.x' };

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try{
    const { imageUrl } = req.body || {};
    return res.status(200).json({ upscaledUrl: imageUrl });
  }catch(e){
    return res.status(500).send(e?.message || 'Upscale failed');
  }
}
