<script>
  import { onMount } from 'svelte';
  import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

  // Elements
  let canvas;
  let ctx;
  let video;

  // Status
  let isCameraActive = false;
  let isModelLoaded = false;
  let statusMessage = "Initializing Model...";

  // Tracking Coordinates (Normalized 0-1)
  let indexPos = { x: 0.5, y: 0.5 };
  let thumbPos = { x: 0.5, y: 0.5 };
  let cursorX = 0; // Screen Pixels
  let cursorY = 0; // Screen Pixels
  let smoothedX = 0;
  let smoothedY = 0;
  const LERP_FACTOR = 0.15;

  // Gesture State
  let isPinching = false;
  let lastPinchTime = 0;
  const PINCH_THRESHOLD = 0.045; // Euclidean Distance
  const PINCH_COOLDOWN = 400; // ms

  // Game/Visual State
  let score = 12450;
  let accuracy = 94;
  let multiplier = 2.5;
  let particles = []; // Array of {x, y, size, color, dx, dy, opacity}
  let backgroundStars = [];
  let targets = [];
  let projectiles = [];
  let lastSpawnTime = 0;
  const STAR_COUNT = 150;

  let showLevelComplete = false;
  let physicsCore = {
    x: 0,
    y: 0,
    size: 25,
    targetSize: 25,
    fedCount: 0,
    maxFed: 10,
    color: '#00d2ff', // Cyan base core
    isTransforming: false,
    hasTransformed: false,
    floatOffset: 0
  };

  // Canvas Dimensions
  let width = 0;
  let height = 0;

  onMount(async () => {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Starfield
    setupStarfield();

    try {
      // Load MediaPipe Model
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      isModelLoaded = true;
      statusMessage = "Model Ready. Enable Camera.";
    } catch (error) {
      console.error("MediaPipe Load Error:", error);
      statusMessage = "Error Loading Model.";
    }

    // Start Rendering Loop
    drawLoop();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      stopCamera();
    };
  });

  let handLandmarker;
  let lastVideoTime = -1;

  function resizeCanvas() {
    if (canvas) {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
  }

  function setupStarfield() {
    backgroundStars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      backgroundStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.5 + 0.3
      });
    }
  }

  async function enableCamera() {
    if (!isModelLoaded) return;
    statusMessage = "Starting Camera...";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      video.srcObject = stream;
      video.play();
      isCameraActive = true;
      statusMessage = "Gesture Active";
    } catch (error) {
      console.error("Camera Error:", error);
      statusMessage = "Camera Access Denied.";
    }
  }

  function stopCamera() {
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    isCameraActive = false;
    statusMessage = "Camera Disabled";
  }

  function calculateDistance(p1, p2) {
    // 3D Euclidean Distance (z is depth provided by MediaPipe)
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function spawnTarget() {
    if (targets.length >= 5) return;
    targets.push({
      x: Math.random() * width,
      y: Math.random() * (height * 0.6),
      size: Math.random() * 20 + 20,
      color: Math.random() > 0.5 ? '#9c27b0' : '#E91E63', // Purple or Pink
      dx: (Math.random() - 0.5) * 3,
      dy: (Math.random() - 0.5) * 3,
      angle: 0,
      rotationSpeed: Math.random() * 0.05
    });
  }

  function createSplitEffect(x, y) {
    for (let i = 0; i < 6; i++) {
        particles.push({
          x: x,
          y: y,
          size: Math.random() * 6 + 4,
          color: Math.random() > 0.5 ? '#fcdc00' : '#ff9d00',
          alpha: 1.0,
          scale: 1.0,
          dx: (Math.random() - 0.5) * 10,
          dy: (Math.random() - 0.5) * 10,
          originalX: x,
          originalY: y
        });
    }
  }

  function triggerPinchEffect(x, y) {
    score += 10;
    const startX = width / 2;
    const startY = height;
    const dx = x - startX;
    const dy = y - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 18;
    const vx = distance > 0 ? (dx / distance) * speed : 0;
    const vy = distance > 0 ? (dy / distance) * speed : -speed;

    projectiles.push({
      x: startX,
      y: startY,
      targetX: x,
      targetY: y,
      vx: vx,
      vy: vy,
      size: 8,
      color: '#00ffff'
    });
  }

  function drawLoop() {
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 2. Render Background Stars (Subtle slow motion)
    for (let star of backgroundStars) {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update & Draw Physics Core
    if (width > 0 && !physicsCore.hasTransformed) {
        if (physicsCore.x === 0) {
            physicsCore.x = width * 0.8;
            physicsCore.y = height * 0.35;
        }

        if (physicsCore.isTransforming) {
            physicsCore.targetSize += 1.8;
            physicsCore.floatOffset = Math.sin(performance.now() * 0.008) * 15; // Jitters
            if (physicsCore.targetSize > 160) {
                physicsCore.isTransforming = false;
                physicsCore.hasTransformed = true;
                showLevelComplete = true;
                for (let k = 0; k < 30; k++) createSplitEffect(physicsCore.x, physicsCore.y);
            }
        } else {
            physicsCore.floatOffset = Math.sin(performance.now() * 0.003) * 20;
            physicsCore.size += (physicsCore.targetSize - physicsCore.size) * 0.08;
        }

        drawCoreObject(physicsCore.x, physicsCore.y + physicsCore.floatOffset, physicsCore.size, physicsCore.color);

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px 'Outfit', sans-serif";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#000000";
        ctx.textAlign = "center";
        ctx.fillText(`${physicsCore.fedCount}/10`, physicsCore.x, physicsCore.y + physicsCore.floatOffset - physicsCore.size - 10);
        ctx.restore();
    }

    // 3. Process MediaPipe Data
    if (isCameraActive && video && video.readyState === 4) {
      let startTimeMs = performance.now();
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]; // First Hand

          // Tip of Index (Landmark 8)
          const indexL = landmarks[8];
          // Tip of Thumb (Landmark 4)
          const thumbL = landmarks[4];

          // Mirror X for Webcam Intuition
          indexPos = { x: 1 - indexL.x, y: indexL.y, z: indexL.z };
          thumbPos = { x: 1 - thumbL.x, y: thumbL.y, z: thumbL.z };

          // Map to Screen Dimensions
          cursorX = indexPos.x * width;
          cursorY = indexPos.y * height;

          // Smooth Cursor via LERP
          smoothedX += (cursorX - smoothedX) * LERP_FACTOR;
          smoothedY += (cursorY - smoothedY) * LERP_FACTOR;

          // Pinch Detection Logic
          const distance = calculateDistance(indexPos, thumbPos);
          if (distance < PINCH_THRESHOLD) {
            const now = performance.now();
            if (now - lastPinchTime > PINCH_COOLDOWN) {
              isPinching = true;
              lastPinchTime = now;
              triggerPinchEffect(smoothedX, smoothedY);
            }
          } else {
            isPinching = false;
          }
        }
      }
    } else {
        // Safe defaults when camera off
        smoothedX += (width/2 - smoothedX) * 0.05;
        smoothedY += (height/2 - smoothedY) * 0.05;
    }

    // 3.5 Spawning & Updating Targets/Projectiles
    const nowTime = performance.now();
    if (nowTime - lastSpawnTime > 2000) {
      spawnTarget();
      lastSpawnTime = nowTime;
    }

    // Update & Render Targets
    for (let i = targets.length - 1; i >= 0; i--) {
      let t = targets[i];
      t.x += t.dx;
      t.y += t.dy;
      t.angle += t.rotationSpeed;

      if (t.x < 0 || t.x > width) t.dx *= -1;
      if (t.y < 0 || t.y > height * 0.7) t.dy *= -1;

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.fillStyle = t.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = t.color;
      ctx.beginPath();
      // Crystal shape (diamond)
      ctx.moveTo(0, -t.size);
      ctx.lineTo(t.size * 0.7, 0);
      ctx.lineTo(0, t.size);
      ctx.lineTo(-t.size * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Update & Render Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      let p = projectiles[i];
      p.x += p.vx;
      p.y += p.vy;

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Collision Check Physics Core
      if (!physicsCore.hasTransformed && !physicsCore.isTransforming && width > 0) {
        const coreDx = p.x - physicsCore.x;
        const coreDy = p.y - (physicsCore.y + physicsCore.floatOffset);
        const coreDist = Math.sqrt(coreDx * coreDx + coreDy * coreDy);

        if (coreDist < p.size + physicsCore.size) {
            physicsCore.fedCount++;
            physicsCore.targetSize += 8; // Grow
            createSplitEffect(p.x, p.y);
            projectiles.splice(i, 1);
            
            if (physicsCore.fedCount >= physicsCore.maxFed) {
                physicsCore.isTransforming = true;
            }
            continue;
        }
      }

      // Collision Check Targets
      for (let j = targets.length - 1; j >= 0; j--) {
        let t = targets[j];
        const dx = p.x - t.x;
        const dy = p.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.size + t.size) {
          score += 500;
          createSplitEffect(p.x, p.y);
          projectiles.splice(i, 1);
          targets.splice(j, 1);
          break;
        }
      }

      if (p.y < 0 || p.x < 0 || p.x > width) {
        if (projectiles[i]) projectiles.splice(i, 1);
      }
    }

    // 4. Update & Render Particle Burst
    for (let i = particles.length - 1; i >= 0; i--) {
      let bit = particles[i];
      
      // Move based on velocity (dispersive burst)
      bit.x += bit.dx;
      bit.y += bit.dy;
      bit.scale *= 0.94;
      bit.alpha -= 0.03;

      if (bit.alpha <= 0 || bit.scale < 0.1) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = bit.color;
      ctx.fillStyle = bit.color;
      ctx.globalAlpha = bit.alpha;
      
      // Draw polygonal star shape if possible, otherwise circle for speed
      ctx.beginPath();
      // Draw standard Circle Star Bit
      ctx.arc(bit.x, bit.y, bit.size * bit.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Draw Custom Visual Cursor (Star Pointer)
    drawCursor(smoothedX, smoothedY);

    requestAnimationFrame(drawLoop);
  }

  function drawCoreObject(x, y, radius, color) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(performance.now() * 0.001); // Subtle rotation
    ctx.shadowBlur = 30;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    ctx.beginPath();
    // Draw a generic geometric shape: Octahedron-like (2D diamond with interior lines)
    const points = 4;
    for (let i = 0; i < points; i++) {
        const angle = (i * Math.PI * 2) / points;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();

    // Inner details for a "tech" look
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius, 0); ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius); ctx.lineTo(0, radius);
    ctx.stroke();

    ctx.restore();
  }

  function drawCursor(x, y) {
    if (!ctx) return;
    
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';

    const R = isPinching ? 22 : 18;
    const r = R * 0.25;

    ctx.beginPath();
    ctx.moveTo(x, y - R);
    
    ctx.quadraticCurveTo(x + r, y - r, x + R, y);
    ctx.quadraticCurveTo(x + r, y + r, x, y + R);
    ctx.quadraticCurveTo(x - r, y + r, x - R, y);
    ctx.quadraticCurveTo(x - r, y - r, x, y - R);
    ctx.closePath();

    let gradient = ctx.createRadialGradient(x, y, 2, x, y, R);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#00e5ff');
    gradient.addColorStop(1, '#00b8d4');

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#e0f7fa';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    if (isPinching) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#fcdc00';
        ctx.fillStyle = '#fcdc00';
        
        ctx.beginPath();
        const sR = 10;
        const sr = 3;
        ctx.moveTo(x, y - sR);
        ctx.quadraticCurveTo(x + sr, y - sr, x + sR, y);
        ctx.quadraticCurveTo(x + sr, y + sr, x, y + sR);
        ctx.quadraticCurveTo(x - sr, y + sr, x - sR, y);
        ctx.quadraticCurveTo(x - sr, y - sr, x, y - sR);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
  }

</script>

<!-- Dynamic 3D Environment Background -->
<div class="physics-bg-container">
<div class="physics-base"></div>
<!-- Procedural Particles Layer -->
<div class="star-layer">
<div class="floating-particle" style="--top: 80%; --left: 10%; --size: 2px; --duration: 15s;"></div>
<div class="floating-particle" style="--top: 60%; --left: 45%; --size: 3px; --duration: 20s;"></div>
<div class="floating-particle" style="--top: 90%; --left: 80%; --size: 1px; --duration: 12s;"></div>
<div class="floating-particle" style="--top: 30%; --left: 20%; --size: 2px; --duration: 18s;"></div>
<div class="floating-particle" style="--top: 70%; --left: 60%; --size: 4px; --duration: 25s;"></div>
<!-- Animated Particles (CSS-driven for background filler) -->
<div class="energy-particle" style="--top: 40%; --left: 50%; --duration: 4s; --tx: 300px; --ty: -200px;"></div>
<div class="energy-particle" style="--top: 60%; --left: 40%; --duration: 5s; --tx: -400px; --ty: 100px;"></div>
</div>
</div>

<!-- Fullscreen Canvas Interface (Foreground Interactive Particle Layer) -->
<canvas 
  bind:this={canvas} 
  class="fixed inset-0 z-10 pointer-events-none"
></canvas>

<!-- Interaction Overlay (For Hits) -->
<div class="fixed inset-0 z-20 pointer-events-none" id="interaction-layer"></div>

<!-- Overlay to slightly darken background for readability -->
<div class="absolute inset-0 bg-black/10 pointer-events-none"></div>

<!-- Top Navigation Shell (TopAppBar) -->

<main class="p-12 h-screen relative flex flex-col justify-center items-center overflow-hidden pointer-events-none">
<!-- Right Panel: Scores -->
<!-- Scores Panel Removed -->
<!-- Bottom Left: Webcam Preview -->
<div class="fixed bottom-12 left-24 z-30 group pointer-events-auto">
<div class="relative w-56 aspect-video rounded-lg overflow-hidden glass-panel border border-primary/30 shadow-[0_0_20px_rgba(0,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
<div class="absolute inset-0 bg-slate-800 flex items-center justify-center">
{#if !isCameraActive}
  <span class="font-headline text-xs text-slate-400 absolute z-10">{statusMessage}</span>
{/if}
<video 
  bind:this={video} 
  class="w-full h-full object-cover grayscale opacity-40 mix-blend-luminosity" 
  playsinline 
  autoplay 
  muted
></video>
</div>
<div class="absolute inset-4 pointer-events-none">
<div class="reticle-corner top-0 left-0 border-t-2 border-l-2"></div>
<div class="reticle-corner top-0 right-0 border-t-2 border-r-2"></div>
<div class="reticle-corner bottom-0 left-0 border-b-2 border-l-2"></div>
<div class="reticle-corner bottom-0 right-0 border-b-2 border-r-2"></div>
</div>
<div class="absolute bottom-2 left-3 flex items-center gap-2">
<div class="w-2 h-2 {isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'} rounded-full"></div>
<span class="text-[9px] font-headline font-bold uppercase tracking-widest text-white/70">
  {isCameraActive ? 'Gesture Active' : 'Offline'}
</span>
</div>
</div>
</div>
<!-- Centered UI -->
{#if !isCameraActive}
  <div class="z-10 flex flex-col items-center text-center max-w-2xl px-4 mb-48">
  <h1 class="font-headline font-black text-6xl text-white uppercase tracking-tighter mb-4 drop-shadow-2xl">
                  Ready to <span class="text-primary italic">Explore?</span>
  </h1>
  <p class="text-white/80 font-medium leading-relaxed max-w-md drop-shadow-lg mb-6">
                  Pinch your thumb and index finger to collect energy particles drifting in the void. Calibrate your sensors for maximum precision.
              </p>
  <button 
    on:click={enableCamera}
    disabled={!isModelLoaded}
    class="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 pointer-events-auto">
      Enable Camera
  </button>
  </div>
{/if}

{#if showLevelComplete}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg animate-fade-in pointer-events-auto">
    <div class="text-center transform flex flex-col items-center">
      <h2 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 glow-title uppercase tracking-widest animate-pulse max-w-xl">
        Experiment Successful!
      </h2>
      <p class="text-xl text-white/80 mt-4 max-w-md">
        The physics core has been stabilized. New experimental regions are now accessible.
      </p>
      <button 
        on:click={() => { showLevelComplete = false; physicsCore.hasTransformed = false; physicsCore.fedCount = 0; physicsCore.targetSize = 25; physicsCore.size=25; createSplitEffect(physicsCore.x, physicsCore.y); }}
        class="mt-8 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(0,210,255,0.4)] hover:scale-105 active:scale-95 transition-all">
        Next Experiment
      </button>
    </div>
  </div>
{/if}
</main>
<!-- Footer Shell -->
<!-- Footer Removed -->

<style>
  .glow-title {
    text-shadow: 0 0 30px rgba(0, 255, 255, 0.4), 0 0 60px rgba(156, 39, 176, 0.4);
  }
  .animate-fade-in {
    animation: fadeIn 0.8s ease-out forwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
