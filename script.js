// script.js
(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const msgEl = document.getElementById("msg");
  const restartBtn = document.getElementById("restartBtn");
  const showHitboxesCheckbox = document.getElementById("showHitboxes");

  // logical canvas size (keeps consistent physics regardless of CSS scaling)
  const W = canvas.width;
  const H = canvas.height;

  // game variables
  let bird, pipes, frame, score, speed, running, started, gravity, flapPower;
  let pipeSpawnInterval = 90; // frames
  let pipeGap = 140; // gap height
  let pipeWidth = 60;

  function reset() {
    bird = {
      x: Math.floor(W * 0.25),
      y: Math.floor(H * 0.5),
      w: 28,
      h: 20,
      vy: 0,
      rot: 0,
    };
    pipes = [];
    frame = 0;
    score = 0;
    speed = 2.2;
    gravity = 0.45;
    flapPower = -8.7;
    running = true;
    started = false;
    scoreEl.textContent = score;
    msgEl.textContent = "Click / Space to start";
  }

  function spawnPipe() {
    const minTop = 40;
    const maxTop = H - pipeGap - 60;
    const top = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

    const pipe = {
      x: W + 10,
      top: top,
      bottom: top + pipeGap,
      w: pipeWidth,
      passed: false,
    };
    pipes.push(pipe);
  }

  function drawBackground() {
    // simple parallax-ish sky and ground
    // sky already provided by CSS canvas background; draw some simple clouds
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    if (frame % 300 < 150) {
      ctx.beginPath();
      ctx.ellipse(80 + (frame % 300) * 0.2, 80, 36, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    // body
    ctx.fillStyle = "#FFAA00";
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // eye
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(6, -3, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#072A40";
    ctx.beginPath();
    ctx.ellipse(7, -2, 1.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // wing
    ctx.fillStyle = "#ff8d00";
    ctx.beginPath();
    ctx.ellipse(-2, 2, 8, 5, Math.PI * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // optional hitbox
    if (showHitboxesCheckbox.checked) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;
      ctx.strokeRect(bird.x - bird.w / 2, bird.y - bird.h / 2, bird.w, bird.h);
    }
  }

  function drawPipes() {
    for (const p of pipes) {
      // top pipe
      ctx.fillStyle = "#3cb371";
      ctx.fillRect(p.x, 0, p.w, p.top);

      // bottom pipe
      ctx.fillRect(p.x, p.bottom, p.w, H - p.bottom);

      // cap to look nicer
      ctx.fillStyle = "#2e8b57";
      ctx.fillRect(p.x - 6, p.top - 12, p.w + 12, 12); // top cap
      ctx.fillRect(p.x - 6, p.bottom, p.w + 12, 12); // bottom cap

      if (showHitboxesCheckbox.checked) {
        ctx.strokeStyle = "red";
        ctx.strokeRect(p.x, 0, p.w, p.top);
        ctx.strokeRect(p.x, p.bottom, p.w, H - p.bottom);
      }
    }
  }

  function update() {
    if (!running) return;

    frame++;

    // start gravity only after first flap (started)
    if (started) {
      bird.vy += gravity;
      bird.y += bird.vy;
      bird.rot = Math.min(0.6, bird.vy * 0.06); // tilt down when falling
    }

    // Move pipes
    for (const p of pipes) {
      p.x -= speed;
      // scoring
      if (!p.passed && p.x + p.w < bird.x - bird.w / 2) {
        p.passed = true;
        score++;
        scoreEl.textContent = score;
      }
    }

    // remove offscreen pipes
    pipes = pipes.filter((p) => p.x + p.w > -20);

    // spawn pipes
    if (frame % pipeSpawnInterval === 0) spawnPipe();

    // increase difficulty gradually
    if (frame % 1200 === 0) {
      if (pipeGap > 110) pipeGap -= 6;
      speed += 0.15;
    }

    // collision: with ground or ceiling
    if (bird.y + bird.h / 2 >= H || bird.y - bird.h / 2 <= 0) {
      die();
    }

    // collision: with pipes (AABB)
    for (const p of pipes) {
      const bx = bird.x - bird.w / 2;
      const by = bird.y - bird.h / 2;
      const birdBox = { x: bx, y: by, w: bird.w, h: bird.h };

      // top pipe box
      const topBox = { x: p.x, y: 0, w: p.w, h: p.top };
      const botBox = { x: p.x, y: p.bottom, w: p.w, h: H - p.bottom };

      if (aabbIntersect(birdBox, topBox) || aabbIntersect(birdBox, botBox)) {
        die();
      }
    }
  }

  function aabbIntersect(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  function die() {
    running = false;
    msgEl.textContent = "Game Over — Click Restart";
    // little shake effect could be added; keep simple
  }

  function render() {
    // clear
    ctx.clearRect(0, 0, W, H);

    drawBackground();
    drawPipes();
    drawBird();

    // ground visual
    ctx.fillStyle = "#d9b48f";
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(0, H - 30, W, 6);

    if (!running) {
      // dark overlay when stopped
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "white";
      ctx.font = "22px system-ui, Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Score: ${score}`, W / 2, H / 2 - 10);
    }
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  function flap() {
    if (!running) return;
    // on first flap we mark started so gravity applies
    started = true;
    bird.vy = flapPower;
    bird.rot = -0.6;
    msgEl.textContent = "";
  }

  // input handlers
  canvas.addEventListener("click", (e) => {
    if (!running) return;
    flap();
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!running) return;
      flap();
    }
  });

  // touch support
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (!running) return;
      flap();
    },
    { passive: false }
  );

  restartBtn.addEventListener("click", () => {
    reset();
  });

  // start everything
  reset();
  loop();

  // small helpers to allow easy editing in future:
  window.__flappy = {
    reset,
    flap,
    getState: () => ({ score, running, frame }),
  };
})();
