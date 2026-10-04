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

// On Windows, a restarted dev server can briefly see EADDRINUSE because the
// OS hasn't released the previous process's socket yet. Retry instead of crashing.
function startServer(retriesLeft = 5) {
  const server = app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
      console.warn(`Port ${PORT} is still in use, retrying in 1s... (${retriesLeft} attempts left)`);
      setTimeout(() => startServer(retriesLeft - 1), 1000);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

startServer();
