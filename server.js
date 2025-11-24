// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper: extract YouTube video ID
function extractVideoId(input) {
  if (!input) return null;

  input = input.trim();

  // Kalau user kasih ID langsung
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    // ?v=XXXX
    const vParam = url.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }

    // /embed/ID, /v/ID, /shorts/ID
    const match = url.pathname.match(
      /(?:\/embed\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    if (match && match[1]) {
      return match[1];
    }

    // youtu.be/ID
    if (url.hostname.includes('youtu.be')) {
      const parts = url.pathname.split('/');
      const last = parts[parts.length - 1];
      if (/^[a-zA-Z0-9_-]{11}$/.test(last)) {
        return last;
      }
    }
  } catch (err) {
    return null;
  }

  return null;
}

// Halaman utama (SPA)
app.get('/', (req, res) => {
  res.render('index');
});

// Endpoint AJAX untuk parse URL YouTube
app.post('/api/parse', (req, res) => {
  const youtubeUrl = (req.body.youtubeUrl || '').trim();
  const videoId = extractVideoId(youtubeUrl);

  if (!videoId) {
    return res.json({
      ok: false,
      error: 'URL YouTube tidak valid. Coba cek lagi.',
    });
  }

  res.json({
    ok: true,
    videoId,
    normalizedUrl: youtubeUrl,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
