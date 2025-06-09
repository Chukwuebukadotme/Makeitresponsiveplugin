/*import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import { webcrypto as crypto } from 'crypto';
import { exchangeCodeForTokens } from '../src/auth';

const app = express();
app.use(cors());

// Store auth states
const authStates = new Map();

console.log('Express types:', typeof Request, typeof Response);
console.log('Router type:', typeof Router);

const router = Router();

app.post('/auth/start', (req: Request, res: Response) => {
  const state = crypto.randomUUID();
  authStates.set(state, { status: 'pending' });
  res.json({ state });
});

app.get('/auth/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const authState = authStates.get(state);
  
  if (!authState) {
    return res.status(400).send('Invalid state');
  }

  const tokens = await exchangeCodeForTokens(code as string);
  authState.tokens = tokens;
  authState.status = 'complete';
  
  return res.send('Authentication successful! You can close this window.');
});

router.get('/auth/poll', (req: Request, res: Response) => {
  const { state } = req.query;
  const authState = authStates.get(state);
  
  if (!authState) {
    return res.status(400).send('Invalid state');
  }

  if (authState.status === 'complete') {
    authStates.delete(state);
    return res.json({ tokens: authState.tokens });
  }

  res.status(202).send('Waiting for authentication');
});

app.use(router);

app.listen(3000); */