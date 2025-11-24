// public/js/app.js

$(function () {
  const $form = $('#urlForm');
  const $input = $('#youtubeUrl');
  const $error = $('#errorMsg');
  const $historyList = $('#historyList');
  const $historyEmpty = $('#historyEmpty');
  const $btnClearHistory = $('#btnClearHistory');

  let historyData = [];
  let playerWrapper = null;
  let iframeEl = null;
  let isDragging = false;
  let startX, startY, startRight, startBottom;

  // ====== HISTORY (localStorage) ======
  function loadHistory() {
    try {
      const raw = localStorage.getItem('ytHistory');
      historyData = raw ? JSON.parse(raw) : [];
    } catch (e) {
      historyData = [];
    }
    renderHistory();
  }

  function saveHistory() {
    localStorage.setItem('ytHistory', JSON.stringify(historyData));
  }

  function addToHistory(entry) {
    // tambahkan di depan (latest first)
    historyData.unshift(entry);
    // batasi misal 20 item
    if (historyData.length > 20) {
      historyData = historyData.slice(0, 20);
    }
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    $historyList.empty();

    if (!historyData.length) {
      $historyEmpty.show();
      return;
    }

    $historyEmpty.hide();

    historyData.forEach((item, index) => {
      const li = $(`
        <li class="history-item" data-index="${index}">
          <div class="history-thumb">
            <span>▶</span>
          </div>
          <div class="history-meta">
            <div class="history-url" title="${item.url}">
              ${escapeHtml(trimUrl(item.url))}
            </div>
            <div class="history-time">
              ${formatTime(item.timestamp)}
            </div>
          </div>
        </li>
      `);
      $historyList.append(li);
    });
  }

  function clearHistory() {
    historyData = [];
    saveHistory();
    renderHistory();
  }

  // Utility: escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Utility: trimming URL untuk tampilan
  function trimUrl(url) {
    if (url.length <= 60) return url;
    return url.slice(0, 57) + '...';
  }

  // Utility: format waktu
  function formatTime(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(
      d.getDate()
    )}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  // ====== FLOATING PLAYER ======
  function createPlayerWrapper() {
    if (playerWrapper) return; // sudah ada

    const html = `
      <div class="player-wrapper animate-in" id="playerWrapper">
        <div class="player-header">
          <div class="player-title">
            <span class="dot"></span>
            <span>Now Playing</span>
          </div>
          <div class="player-actions">
            <button class="icon-btn" id="btnMini" title="Mini player">
              &#9723;
            </button>
            <button class="icon-btn icon-danger" id="btnClose" title="Close">
              &#10005;
            </button>
          </div>
        </div>
        <div class="player-body">
          <div class="player-inner">
            <iframe
              id="yt-player"
              src=""
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          </div>
        </div>
        <div class="player-footer">
          <span class="badge badge-live">LIVE</span>
          <span class="badge badge-bg">Background Mode Ready</span>
        </div>
      </div>
    `;

    $('body').append(html);

    playerWrapper = document.getElementById('playerWrapper');
    iframeEl = document.getElementById('yt-player');

    // Bind tombol mini & close
    const btnMini = document.getElementById('btnMini');
    const btnClose = document.getElementById('btnClose');
    const header = playerWrapper.querySelector('.player-header');

    btnMini.addEventListener('click', () => {
      playerWrapper.classList.toggle('mini');
    });

    btnClose.addEventListener('click', () => {
      stopVideo();
      // animasi close
      playerWrapper.style.transformOrigin = 'bottom right';
      playerWrapper.style.transition =
        'transform 0.2s ease, opacity 0.2s ease';
      playerWrapper.style.transform = 'translateY(20px) scale(0.85)';
      playerWrapper.style.opacity = '0';

      setTimeout(() => {
        playerWrapper.remove();
        playerWrapper = null;
        iframeEl = null;
      }, 200);
    });

    // Drag saat mini
    header.addEventListener('mousedown', onMouseDown);
  }

  function playVideo(videoId) {
    createPlayerWrapper();
    if (!iframeEl) return;

    const embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
    iframeEl.setAttribute('src', embedSrc);

    // kalau player lagi tidak mini, tetap; kalau mini, tetap mini
    playerWrapper.classList.add('animate-in');
    setTimeout(() => {
      playerWrapper.classList.remove('animate-in');
    }, 300);
  }

  function stopVideo() {
    if (iframeEl && iframeEl.contentWindow) {
      iframeEl.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'stopVideo',
          args: [],
        }),
        '*'
      );
    }
  }

  // Drag handler (mini mode only)
  function onMouseDown(e) {
    if (!playerWrapper || !playerWrapper.classList.contains('mini')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = playerWrapper.getBoundingClientRect();
    startRight = window.innerWidth - rect.right;
    startBottom = window.innerHeight - rect.bottom;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!isDragging || !playerWrapper) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newRight = Math.max(0, startRight - dx);
    const newBottom = Math.max(0, startBottom - dy);

    playerWrapper.style.right = `${newRight}px`;
    playerWrapper.style.bottom = `${newBottom}px`;
    playerWrapper.style.left = 'auto';
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  // ====== FORM SUBMIT (AJAX) ======
  $form.on('submit', function (e) {
    e.preventDefault();
    const url = $input.val().trim();
    if (!url) return;

    setError('');
    $input.prop('disabled', true);

    $.ajax({
      url: '/api/parse',
      method: 'POST',
      data: { youtubeUrl: url },
      success: function (resp) {
        if (!resp || !resp.ok) {
          setError(resp && resp.error ? resp.error : 'Gagal memproses URL.');
          return;
        }

        // mainkan video
        playVideo(resp.videoId);

        // simpan ke history
        addToHistory({
          url: resp.normalizedUrl || url,
          videoId: resp.videoId,
          timestamp: Date.now(),
        });
      },
      error: function () {
        setError('Terjadi kesalahan server. Coba beberapa saat lagi.');
      },
      complete: function () {
        $input.prop('disabled', false);
      },
    });
  });

  function setError(msg) {
    if (!msg) {
      $error.hide().text('');
    } else {
      $error.text(msg).show();
    }
  }

  // ====== CLICK HISTORY (play again) ======
  $historyList.on('click', '.history-item', function () {
    const idx = $(this).data('index');
    const item = historyData[idx];
    if (!item) return;

    playVideo(item.videoId);
  });

  // ====== CLEAR HISTORY ======
  $btnClearHistory.on('click', function () {
    clearHistory();
  });

  // Init
  loadHistory();
});
