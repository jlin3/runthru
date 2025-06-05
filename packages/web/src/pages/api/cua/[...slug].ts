import { NextApiRequest, NextApiResponse } from 'next';
import { computerUsingAgent } from '../../../services/computerUsingAgent';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  const action = slug && slug.length > 0 ? slug[0] : null;
  const sessionId = slug && slug.length > 1 ? slug[1] : null;

  if (req.method === 'POST' && action === 'session') {
    try {
      const { targetUrl, testScript } = req.body;
      if (!targetUrl || !testScript) {
        return res.status(400).json({ error: 'targetUrl and testScript are required' });
      }
      
      const newSessionId = uuidv4();
      const result = await computerUsingAgent.startSession(newSessionId, targetUrl, testScript);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to start CUA session' });
    }
  }
  
  if (req.method === 'POST' && action === 'voiceover' && sessionId) {
    try {
      const result = await computerUsingAgent.generateVoiceover(sessionId);
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to generate voiceover' });
    }
  }

  return res.status(404).json({ error: 'Not Found' });
} 