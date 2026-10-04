import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import playlistRouter from './routes/playlist.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/playlist', playlistRouter);
app.use('/auth', authRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
