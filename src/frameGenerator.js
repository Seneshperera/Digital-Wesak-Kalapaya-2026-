/**
 * Wesak Kalapaya - Procedural Frame Generator
 * Generates and renders beautiful, atmospheric vector scenes on canvas.
 * Simulates a continuous walk by projecting elements in pseudo-3D and animating layers.
 */

export class FrameGenerator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.resize();

    // Sound-reactive & time variables
    this.time = 0;

    // Pre-calculate coordinates and assets for performance and consistency
    this.initSceneData();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  initSceneData() {
    // Generate stars for the background
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.7, // Top 70% of the screen
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Scene 1: Entrance Gate decorations & distant silhouettes
    this.gateDecorations = [];
    for (let i = 0; i < 40; i++) {
      this.gateDecorations.push({
        angle: (i / 40) * Math.PI * 2,
        color: i % 2 === 0 ? '#ffb703' : '#fb8500',
        offset: Math.random() * 5
      });
    }

    // Scene 2: Tunnel 3D Lantern positions (x, y, z)
    // z ranges from 1 (near) to 20 (far)
    this.tunnelLanterns = [];
    const colors = ['#ff4d6d', '#ffb703', '#00f5d4', '#e0aaff', '#ffffff', '#fb8500'];
    for (let i = 0; i < 120; i++) {
      // Positioned in a ring around the center path
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 2.0; // Distance from center
      this.tunnelLanterns.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius - 0.5, // slightly higher
        z: Math.random() * 30 + 2, // Z position
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 0.3 + 0.2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1 + Math.random() * 1.5
      });
    }
    // Sort lanterns by Z descending so we draw back-to-front
    this.tunnelLanterns.sort((a, b) => b.z - a.z);

    // Scene 3: Giant Thorana Panels & Lights
    this.thoranaPanels = [
      { id: 'center-buddha', x: 0, y: -0.2, w: 0.2, h: 0.45, type: 'buddha' },
      { id: 'left-1', x: -0.25, y: -0.1, w: 0.15, h: 0.3, type: 'story' },
      { id: 'right-1', x: 0.25, y: -0.1, w: 0.15, h: 0.3, type: 'story' },
      { id: 'left-2', x: -0.45, y: 0.05, w: 0.15, h: 0.25, type: 'story' },
      { id: 'right-2', x: 0.45, y: 0.05, w: 0.15, h: 0.25, type: 'story' },
      { id: 'top-crown', x: 0, y: -0.55, w: 0.25, h: 0.25, type: 'crown' }
    ];

    this.thoranaBulbs = [];
    // Generate border light bulbs for Thorana
    // Main arch bulbs
    for (let theta = Math.PI; theta <= Math.PI * 2; theta += 0.06) {
      this.thoranaBulbs.push({ x: Math.cos(theta) * 0.65, y: Math.sin(theta) * 0.65 + 0.2, group: 0, phase: theta * 5 });
      this.thoranaBulbs.push({ x: Math.cos(theta) * 0.62, y: Math.sin(theta) * 0.62 + 0.2, group: 1, phase: theta * 5 + Math.PI });
    }
    // Outer spike bulbs
    for (let theta = Math.PI; theta <= Math.PI * 2; theta += 0.12) {
      const px = Math.cos(theta) * 0.72;
      const py = Math.sin(theta) * 0.72 + 0.2;
      this.thoranaBulbs.push({ x: px, y: py, group: 2, phase: theta * 8, type: 'spike' });
    }
    // Panel borders
    this.thoranaPanels.forEach((panel, pIdx) => {
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const factor = i / steps;
        // Top edge
        this.thoranaBulbs.push({ x: panel.x - panel.w / 2 + factor * panel.w, y: panel.y - panel.h / 2, group: 3 + (pIdx % 3), phase: factor * Math.PI * 2 });
        // Bottom edge
        this.thoranaBulbs.push({ x: panel.x - panel.w / 2 + factor * panel.w, y: panel.y + panel.h / 2, group: 3 + (pIdx % 3), phase: factor * Math.PI * 2 });
        // Left edge
        this.thoranaBulbs.push({ x: panel.x - panel.w / 2, y: panel.y - panel.h / 2 + factor * panel.h, group: 4 + (pIdx % 2), phase: factor * Math.PI * 2 });
        // Right edge
        this.thoranaBulbs.push({ x: panel.x + panel.w / 2, y: panel.y - panel.h / 2 + factor * panel.h, group: 4 + (pIdx % 2), phase: factor * Math.PI * 2 });
      }
    });

    // Scene 4: Bodhiya Courtyard Leaves & Oil Lamps
    this.bodhiLeaves = [];
    for (let i = 0; i < 30; i++) {
      this.bodhiLeaves.push({
        x: Math.random(),
        y: Math.random() * -0.5, // Start above
        speedY: 0.5 + Math.random() * 0.8,
        speedX: Math.random() * 0.4 - 0.2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: Math.random() * 0.05 - 0.025,
        size: 8 + Math.random() * 10
      });
    }

    this.oilLamps = [];
    for (let i = 0; i < 18; i++) {
      this.oilLamps.push({
        x: 0.15 + (i / 18) * 0.7, // percentage of screen width
        y: 0.72 + (Math.sin(i * 1.5) * 0.015), // stone altar curvature
        flickerPhase: Math.random() * Math.PI * 2,
        size: 8 + Math.random() * 4
      });
    }

    // Scene 5: Floating Lake Lanterns
    this.lakeLotusLanterns = [];
    for (let i = 0; i < 45; i++) {
      this.lakeLotusLanterns.push({
        x: Math.random(),
        y: 0.65 + Math.random() * 0.33, // Lower third of screen (lake surface)
        size: 15 + Math.random() * 25,
        color: Math.random() > 0.4 ? '#ff7096' : '#ffb703',
        wavePhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.005 + Math.random() * 0.01
      });
    }
    // Sort bottom-to-top to paint back-to-front
    this.lakeLotusLanterns.sort((a, b) => a.y - b.y);

    this.skyLanterns = [];
    for (let i = 0; i < 40; i++) {
      this.skyLanterns.push({
        x: Math.random(),
        y: Math.random() * 0.8 + 0.1, // starts mid-high
        speedY: 0.2 + Math.random() * 0.3,
        size: 5 + Math.random() * 12,
        color: '#fb8500',
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random()
      });
    }
  }

  // Update logic ticks
  update() {
    this.time += 0.016; // approx 60fps
  }

  // Draw background stars
  drawStars(opacity = 1) {
    this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    this.stars.forEach(star => {
      const blink = Math.sin(this.time * 2 + star.phase) * 0.3 + 0.7;
      this.ctx.beginPath();
      this.ctx.arc(star.x * this.width, star.y * this.height, star.r, 0, Math.PI * 2);
      this.ctx.globalAlpha = star.alpha * blink * opacity;
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  // Renders the correct scene based on overall timeline progress (0 to 5)
  render(sceneIndex, progress, mouseX = 0, mouseY = 0) {
    this.update();

    // Clean canvas with deep dark night blue color
    this.ctx.fillStyle = '#050714';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Apply look-around offset (parallax factor)
    const lookX = mouseX * 25;
    const lookY = mouseY * 15;

    // Draw only stars and moon for premium optimized cinematic backdrop
    this.drawStars(0.85);
    
    // Draw moon
    const moonX = this.width * 0.72 + lookX * 0.15;
    const moonY = this.height * 0.28 + lookY * 0.15;
    const moonR = 55;

    this.ctx.save();
    this.ctx.shadowBlur = 35;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    
    const moonGrad = this.ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.8, '#fffae0');
    moonGrad.addColorStop(1, '#f5eeb3');
    
    this.ctx.fillStyle = moonGrad;
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  // ==========================================
  // SCENE 1: ENTRANCE GATE
  // ==========================================
  drawEntranceGate(progress, lookX, lookY) {
    // 1. Draw Starry sky
    this.drawStars(1 - progress * 0.5);

    // Deep atmospheric sky glow
    const skyGlow = this.ctx.createRadialGradient(
      this.width / 2 + lookX * 0.2, this.height / 2 + lookY * 0.2, 50,
      this.width / 2 + lookX * 0.2, this.height / 2 + lookY * 0.2, this.width * 0.6
    );
    skyGlow.addColorStop(0, '#101438');
    skyGlow.addColorStop(1, '#050714');
    this.ctx.fillStyle = skyGlow;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw distant Stupa/Temple silhouette (Parallax background)
    const bgX = this.width / 2 - 120 + lookX * 0.3;
    const bgY = this.height * 0.65 + lookY * 0.3;
    this.ctx.fillStyle = '#0b0d26';
    this.ctx.beginPath();
    // Stupa dome
    this.ctx.arc(bgX + 120, bgY + 100, 90, Math.PI, 0);
    this.ctx.lineTo(bgX + 210, bgY + 110);
    this.ctx.lineTo(bgX + 30, bgY + 110);
    this.ctx.closePath();
    this.ctx.fill();
    // Stupa spire
    this.ctx.fillRect(bgX + 112, bgY - 40, 16, 140);
    this.ctx.beginPath();
    this.ctx.moveTo(bgX + 120, bgY - 110);
    this.ctx.lineTo(bgX + 124, bgY - 40);
    this.ctx.lineTo(bgX + 116, bgY - 40);
    this.ctx.closePath();
    this.ctx.fill();

    // 3. Draw Gate Archway (Main element)
    // Scale up the archway as we scroll forward to simulate camera moving under it
    const startScale = 0.5;
    const endScale = 3.5;
    const currentScale = startScale + (endScale - startScale) * progress;
    const archOpacity = Math.max(0, 1 - Math.pow(progress, 2.5)); // Fades out as we get very close / walk through

    if (archOpacity > 0.01) {
      this.ctx.save();
      this.ctx.globalAlpha = archOpacity;
      // Center the gate with parallax look-around
      const gateX = this.width / 2 + lookX * (1 - progress * 0.8);
      const gateY = this.height * 0.58 + lookY * (1 - progress * 0.8);
      this.ctx.translate(gateX, gateY);
      this.ctx.scale(currentScale, currentScale);

      // Draw Gate Pillars and Arch
      this.ctx.shadowBlur = 25;
      this.ctx.shadowColor = 'rgba(251, 133, 0, 0.6)';

      // Outer gold glowing outline
      this.ctx.strokeStyle = '#ffb703';
      this.ctx.lineWidth = 4;
      this.ctx.fillStyle = '#1c1306';

      // Draw pillars
      this.ctx.beginPath();
      // Left Pillar
      this.ctx.rect(-180, -250, 45, 500);
      // Right Pillar
      this.ctx.rect(135, -250, 45, 500);
      this.ctx.fill();
      this.ctx.stroke();

      // Curved Arch
      this.ctx.beginPath();
      this.ctx.arc(0, -250, 180, Math.PI, 0);
      this.ctx.lineTo(180, -250);
      this.ctx.arc(0, -250, 135, 0, Math.PI, true);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Intricate traditional Wesak decorative crown on top of the arch
      this.ctx.beginPath();
      this.ctx.moveTo(-180, -250);
      this.ctx.quadraticCurveTo(-90, -420, 0, -450);
      this.ctx.quadraticCurveTo(90, -420, 180, -250);
      this.ctx.quadraticCurveTo(0, -320, -180, -250);
      this.ctx.fillStyle = '#ffb703';
      this.ctx.globalAlpha = archOpacity * 0.85;
      this.ctx.fill();
      this.ctx.stroke();

      // Draw glowing buddhist flag patterns / colors on the arch
      const colors = ['#0038a8', '#ffd200', '#d80000', '#ffffff', '#f18e00'];
      const numStripes = 5;
      this.ctx.globalAlpha = archOpacity;
      this.ctx.shadowBlur = 10;
      for (let s = 0; s < numStripes; s++) {
        this.ctx.fillStyle = colors[s];
        // Center panel stripes
        this.ctx.fillRect(-15 + s * 6, -370, 6, 40);
      }

      // Draw animated lights along the archway rim
      this.gateDecorations.forEach((light, index) => {
        const theta = Math.PI + (index / 40) * Math.PI;
        const radius = 158 + Math.sin(this.time * 3 + light.offset) * 2;
        const lx = Math.cos(theta) * radius;
        const ly = -250 + Math.sin(theta) * radius;

        this.ctx.fillStyle = light.color;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = light.color;
        this.ctx.beginPath();
        this.ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
        this.ctx.fill();
      });

      // Sinhala Greeting Text: "සාදරයෙන් පිළිගනිමු" (Welcome)
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#ffd200';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 22px "Outfit", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("සාදරයෙන් පිළිගනිමු", 0, -280);

      this.ctx.restore();
      this.ctx.shadowBlur = 0;
    }

    // 4. Draw Wet street reflection (Foreground)
    const roadY = this.height * 0.78;
    this.ctx.fillStyle = '#060817';
    this.ctx.fillRect(0, roadY, this.width, this.height - roadY);

    // Wet shine overlay
    const roadGrad = this.ctx.createLinearGradient(0, roadY, 0, this.height);
    roadGrad.addColorStop(0, 'rgba(10, 15, 45, 0.4)');
    roadGrad.addColorStop(1, 'rgba(5, 7, 20, 0.9)');
    this.ctx.fillStyle = roadGrad;
    this.ctx.fillRect(0, roadY, this.width, this.height - roadY);

    // Reflection of glowing arch
    if (archOpacity > 0.05) {
      this.ctx.save();
      this.ctx.globalAlpha = archOpacity * 0.28;
      // Blur filter for wet road dispersion
      this.ctx.filter = 'blur(12px)';
      const gateX = this.width / 2 + lookX * (1 - progress * 0.8);
      // Vertically flip and stretch
      this.ctx.translate(gateX, roadY + 80);
      this.ctx.scale(currentScale * 0.9, -currentScale * 0.35);

      // Simplified reflection shape
      this.ctx.fillStyle = '#fb8500';
      this.ctx.beginPath();
      this.ctx.arc(0, -100, 180, Math.PI, 0);
      this.ctx.lineTo(180, 0);
      this.ctx.lineTo(-180, 0);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
      this.ctx.filter = 'none';
    }

    // 5. Draw Crowd Silhouettes
    this.ctx.fillStyle = '#03040b';
    // Draw left crowd
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(0, this.height - 110 + lookY * 0.2);
    this.ctx.quadraticCurveTo(this.width * 0.1, this.height - 80, this.width * 0.22, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw right crowd
    this.ctx.beginPath();
    this.ctx.moveTo(this.width, this.height);
    this.ctx.lineTo(this.width, this.height - 120 + lookY * 0.2);
    this.ctx.quadraticCurveTo(this.width * 0.9, this.height - 90, this.width * 0.78, this.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  // ==========================================
  // SCENE 2: LANTERN TUNNEL
  // ==========================================
  drawLanternTunnel(progress, lookX, lookY) {
    // Distant dark tunnel background
    const bgGrad = this.ctx.createRadialGradient(
      this.width / 2 + lookX, this.height / 2 + lookY, 10,
      this.width / 2 + lookX, this.height / 2 + lookY, this.width * 0.7
    );
    bgGrad.addColorStop(0, '#1a0e2b');
    bgGrad.addColorStop(0.5, '#0a0614');
    bgGrad.addColorStop(1, '#030108');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw stars fading in/out
    this.drawStars(0.3);

    // Calculate viewer camera progress through Z axis (from Z=30 down to Z=0)
    // As progress goes 0 -> 1, cameraZ goes 30 -> 1
    const cameraZ = 32 - progress * 30;

    // Draw 3D projected lanterns
    this.tunnelLanterns.forEach(lantern => {
      // Calculate relative Z coordinate
      let relativeZ = lantern.z - (progress * 30);

      // Loop Z coordinate if it flies past the camera (creates endless tunnel, but standard journey is finite)
      // For a cinematic story, we let them fly past
      if (relativeZ <= 0.05) return; // Behind camera, don't draw

      // 3D projection parameters
      const fov = 400; // perspective factor
      // Parallax shifts based Z depth: further objects shift less
      const depthFactor = 1 / relativeZ;
      const projX = this.width / 2 + (lantern.x * fov * depthFactor) + lookX * (relativeZ * 0.04);
      const projY = this.height / 2 + (lantern.y * fov * depthFactor) + lookY * (relativeZ * 0.04);
      const projSize = lantern.size * fov * depthFactor;

      // Skip if offscreen
      if (projX < -projSize || projX > this.width + projSize || projY < -projSize || projY > this.height + projSize) {
        return;
      }

      // Wind sway animation
      const swayAngle = Math.sin(this.time * lantern.swaySpeed + lantern.swayPhase) * 0.08;

      // Fade out lanterns very close to the camera lens (depth of field simulation)
      let opacity = 1;
      if (relativeZ < 1.5) {
        opacity = (relativeZ - 0.05) / 1.45; // fade to 0
      }
      // Fade out very far lanterns in the background fog
      if (relativeZ > 24) {
        opacity = Math.max(0, 1 - (relativeZ - 24) / 6);
      }

      if (opacity <= 0.01) return;

      // Draw individual Vesak Lantern (traditional octagonal Vesak Kudu with tails)
      this.ctx.save();
      this.ctx.globalAlpha = opacity;
      this.ctx.translate(projX, projY);
      this.ctx.rotate(swayAngle);

      // Apply blur for lanterns extremely close to camera (Depth of field blur)
      if (relativeZ < 1.0) {
        this.ctx.filter = `blur(${Math.min(15, (1.0 - relativeZ) * 20)}px)`;
      } else if (relativeZ > 20) {
        this.ctx.filter = `blur(${Math.min(6, (relativeZ - 20) * 0.8)}px)`;
      }

      // 1. Lantern Outer Glow
      this.ctx.shadowBlur = projSize * 1.5;
      this.ctx.shadowColor = lantern.color;

      // 2. Draw Octagonal Frame (Main Body)
      this.ctx.fillStyle = lantern.color;
      this.ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      this.ctx.lineWidth = Math.max(1, projSize * 0.05);

      this.ctx.beginPath();
      // Octagonal path
      const r = projSize * 0.5;
      for (let side = 0; side < 8; side++) {
        const angle = (side / 8) * Math.PI * 2 + Math.PI / 8;
        const sx = Math.cos(angle) * r;
        const sy = Math.sin(angle) * r;
        if (side === 0) this.ctx.moveTo(sx, sy);
        else this.ctx.lineTo(sx, sy);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Inner structural lines of traditional kudu
      this.ctx.shadowBlur = 0; // turn off shadow for lines
      this.ctx.beginPath();
      this.ctx.moveTo(0, -r);
      this.ctx.lineTo(0, r);
      this.ctx.moveTo(-r, 0);
      this.ctx.lineTo(r, 0);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.stroke();

      // Center bright white-hot core
      const coreGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(1, lantern.color);
      this.ctx.fillStyle = coreGrad;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      this.ctx.fill();

      // 3. Draw Hanging Paper Tassels (Tails)
      // Traditional Vesak kudu has 4 or more long hanging frilled tails at the bottom corners
      this.ctx.fillStyle = lantern.color;
      this.ctx.globalAlpha = opacity * 0.8;
      const tailW = projSize * 0.12;
      const tailH = projSize * 1.1; // Long tails

      // Left tail, center tails, right tail
      const tailXOffsets = [-r * 0.5, 0, r * 0.5];
      tailXOffsets.forEach((tx, idx) => {
        // Tassels sway lag behind main body
        const tasselSway = Math.sin(this.time * lantern.swaySpeed + lantern.swayPhase + idx * 0.5) * 0.08;

        this.ctx.save();
        this.ctx.translate(tx, r * 0.8);
        this.ctx.rotate(tasselSway);

        // Draw long paper tail with crinkled edges
        this.ctx.beginPath();
        this.ctx.moveTo(-tailW / 2, 0);
        this.ctx.lineTo(-tailW / 2, tailH * 0.9);
        // Frilled end
        this.ctx.lineTo(-tailW, tailH);
        this.ctx.lineTo(0, tailH * 0.85);
        this.ctx.lineTo(tailW, tailH);
        this.ctx.lineTo(tailW / 2, tailH * 0.9);
        this.ctx.lineTo(tailW / 2, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
      });

      this.ctx.restore();
    });

    // Draw dark foreground arches representing structures of the tunnel (wooden rafters)
    this.ctx.strokeStyle = '#050409';
    this.ctx.lineWidth = 40;
    const numRafters = 5;
    for (let r = 0; r < numRafters; r++) {
      // Calculate depth position
      const rProgress = (r / numRafters + 1 - (progress % (1 / numRafters))) % 1;
      const scale = 0.5 + rProgress * 3.5;
      const opacity = Math.max(0, 1 - rProgress);

      this.ctx.save();
      this.ctx.globalAlpha = opacity * 0.7;
      this.ctx.translate(this.width / 2 + lookX * (1 - rProgress * 0.8), this.height / 2 + lookY * (1 - rProgress * 0.8));
      this.ctx.scale(scale, scale);

      // Draw wooden arch
      this.ctx.beginPath();
      this.ctx.rect(-300, -300, 600, 600);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  // ==========================================
  // SCENE 3: GIANT THORANA
  // ==========================================
  drawGiantThorana(progress, lookX, lookY) {
    // Dark environment
    this.drawStars(0.4);

    // Deep atmospheric sky glow
    const centerX = this.width / 2 + lookX;
    const centerY = this.height * 0.5 + lookY * 0.8 + (progress * 100);

    const auraGrad = this.ctx.createRadialGradient(
      centerX, centerY - 50, 50,
      centerX, centerY - 50, this.width * 0.4
    );
    auraGrad.addColorStop(0, 'rgba(251, 133, 0, 0.2)');
    auraGrad.addColorStop(0.6, 'rgba(216, 0, 0, 0.05)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = auraGrad;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY - 50, this.width * 0.4, 0, Math.PI * 2);
    this.ctx.fill();

    // Crowd Silhouettes in Foreground (looking up at Thorana)
    this.ctx.fillStyle = '#020206';
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    // Draw an organic crowd silhouette across the bottom
    for (let x = 0; x <= this.width; x += 30) {
      const cy = this.height - 50 - (Math.abs(Math.sin(x * 0.05)) * 25) + (Math.cos(x * 0.01) * 10);
      this.ctx.lineTo(x, cy);
      // Draw individual heads occasionally
      if (x % 90 === 0) {
        this.ctx.arc(x, cy - 8, 10, 0, Math.PI * 2);
        this.ctx.moveTo(x, cy);
      }
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  // ==========================================
  // SCENE 4: BODHIYA COURTYARD
  // ==========================================
  drawBodhiya(progress, lookX, lookY) {
    // 1. Silent, beautiful night background
    const bgGrad = this.ctx.createRadialGradient(
      this.width / 2 + lookX * 0.4, this.height * 0.3 + lookY * 0.4, 20,
      this.width / 2 + lookX * 0.4, this.height * 0.3 + lookY * 0.4, this.width * 0.7
    );
    bgGrad.addColorStop(0, '#0d1330');
    bgGrad.addColorStop(0.6, '#06081d');
    bgGrad.addColorStop(1, '#02030d');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Starry sky
    this.drawStars(0.85);

    // Massive Full Moon in background (centered top-right)
    const moonX = this.width * 0.72 + lookX * 0.15;
    const moonY = this.height * 0.28 + lookY * 0.15;
    const moonR = 65;

    this.ctx.shadowBlur = 40;
    this.ctx.shadowColor = 'rgba(255,255,255,0.4)';
    const moonGrad = this.ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.8, '#fffae0');
    moonGrad.addColorStop(1, '#f5eeb3');
    this.ctx.fillStyle = moonGrad;
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0; // Reset

    // Camera panning motion during progress
    // The camera slowly moves from left to right as we scroll
    const panOffsetX = (progress * 250) - 100;
    const sceneScale = 1.05 - progress * 0.05; // soft zoom back

    this.ctx.save();
    this.ctx.translate(lookX - panOffsetX, lookY);
    this.ctx.scale(sceneScale, sceneScale);

    // 2. Draw Distant Temple Stupa Silhouette
    const stupaX = this.width * 0.3;
    const stupaY = this.height * 0.65;
    this.ctx.fillStyle = '#06081c';
    this.ctx.beginPath();
    this.ctx.arc(stupaX, stupaY + 60, 60, Math.PI, 0);
    this.ctx.lineTo(stupaX + 60, stupaY + 120);
    this.ctx.lineTo(stupaX - 60, stupaY + 120);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.fillRect(stupaX - 8, stupaY - 40, 16, 100);
    this.ctx.beginPath();
    this.ctx.moveTo(stupaX, stupaY - 90);
    this.ctx.lineTo(stupaX + 8, stupaY - 40);
    this.ctx.lineTo(stupaX - 8, stupaY - 40);
    this.ctx.closePath();
    this.ctx.fill();

    // 3. Draw Sacred Bodhi Tree (Center Left)
    const treeX = this.width * 0.45;
    const treeY = this.height * 0.72;
    this.ctx.fillStyle = '#03040c';

    // Draw main trunk
    this.ctx.beginPath();
    this.ctx.moveTo(treeX - 45, treeY + 100);
    this.ctx.quadraticCurveTo(treeX - 40, treeY - 20, treeX - 25, treeY - 80);
    this.ctx.quadraticCurveTo(treeX - 80, treeY - 140, treeX - 110, treeY - 220); // main left branch
    this.ctx.quadraticCurveTo(treeX - 20, treeY - 120, treeX, treeY - 100); // branch split
    this.ctx.quadraticCurveTo(treeX + 60, treeY - 160, treeX + 110, treeY - 260); // main right branch
    this.ctx.quadraticCurveTo(treeX + 25, treeY - 80, treeX + 45, treeY + 100);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw detailed leaves on the Bodhi tree (clumped shapes)
    this.ctx.fillStyle = '#060912';
    // Draw leaf masses
    const leafNodes = [
      { x: treeX - 110, y: treeY - 220, r: 85 },
      { x: treeX + 110, y: treeY - 260, r: 95 },
      { x: treeX - 40, y: treeY - 180, r: 75 },
      { x: treeX + 40, y: treeY - 200, r: 85 },
      { x: treeX, y: treeY - 270, r: 70 }
    ];
    leafNodes.forEach(node => {
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // 4. Draw Stone Altar / Wall (Ran Veta base)
    const altarY = this.height * 0.73;
    this.ctx.fillStyle = '#080a18';
    this.ctx.fillRect(-100, altarY, this.width + 500, this.height - altarY);

    // Altar top border
    this.ctx.fillStyle = '#0a0d24';
    this.ctx.fillRect(-100, altarY, this.width + 500, 18);

    // 5. Draw Clay Oil Lamps (Pahan) Glowing on the Altar
    this.oilLamps.forEach(lamp => {
      const lx = lamp.x * this.width;
      const ly = lamp.y * this.height;

      // Flame flicker calculation
      const flicker = Math.sin(this.time * 15 + lamp.flickerPhase) * 0.15 + 0.85;

      this.ctx.save();
      this.ctx.translate(lx, ly);

      // Lamp bowl
      this.ctx.fillStyle = '#4e2a14'; // Clay brown
      this.ctx.beginPath();
      this.ctx.ellipse(0, 8, lamp.size, lamp.size * 0.45, 0, 0, Math.PI);
      this.ctx.closePath();
      this.ctx.fill();

      // Flame Glow
      this.ctx.shadowBlur = 18 * flicker;
      this.ctx.shadowColor = '#fb8500';
      this.ctx.fillStyle = '#ffe57f'; // Warm yellow fire

      // Draw flame (teardrop)
      this.ctx.beginPath();
      this.ctx.moveTo(0, -lamp.size * 1.3 * flicker);
      this.ctx.quadraticCurveTo(lamp.size * 0.5 * flicker, 0, 0, lamp.size * 0.4);
      this.ctx.quadraticCurveTo(-lamp.size * 0.5 * flicker, 0, 0, -lamp.size * 1.3 * flicker);
      this.ctx.closePath();
      this.ctx.fill();

      // Bright white flame core
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.moveTo(0, -lamp.size * 0.7 * flicker);
      this.ctx.quadraticCurveTo(lamp.size * 0.22, 0, 0, lamp.size * 0.2);
      this.ctx.quadraticCurveTo(-lamp.size * 0.2, 0, 0, -lamp.size * 0.7 * flicker);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    });

    this.ctx.restore(); // Restore pan translation

    // 6. Draw Falling Bodhi Leaves (Foreground)
    // Update leaf coordinates
    this.ctx.fillStyle = 'rgba(26, 43, 20, 0.45)';
    this.ctx.strokeStyle = 'rgba(100, 160, 80, 0.2)';
    this.ctx.lineWidth = 1;

    this.bodhiLeaves.forEach(leaf => {
      // Drift leaf down
      leaf.y += leaf.speedY;
      leaf.x += leaf.speedX + Math.sin(this.time * 2 + leaf.rot) * 0.002;
      leaf.rot += leaf.rotSpeed;

      // Loop leaves if they fall offscreen
      if (leaf.y > 1.2) {
        leaf.y = -0.2;
        leaf.x = Math.random();
      }

      // Draw heart-shaped leaf path
      this.ctx.save();
      this.ctx.translate(leaf.x * this.width, leaf.y * this.height);
      this.ctx.rotate(leaf.rot);

      this.ctx.beginPath();
      const s = leaf.size * 0.5;
      // Heart shaped leaf
      this.ctx.moveTo(0, -s);
      this.ctx.bezierCurveTo(s, -s * 1.6, s * 1.8, -s * 0.4, 0, s);
      this.ctx.bezierCurveTo(-s * 1.8, -s * 0.4, -s, -s * 1.6, 0, -s);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  // ==========================================
  // SCENE 5: FLOATING LANTERN LAKE
  // ==========================================
  drawLake(progress, lookX, lookY) {
    // 1. Celestial background
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#040517');
    skyGrad.addColorStop(0.65, '#0c0f3a');
    skyGrad.addColorStop(1, '#1b143c');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Rich Starry sky with stars
    this.drawStars(1.0);

    // Full Moon (centered high-left)
    const moonX = this.width * 0.28 + lookX * 0.12;
    // Camera tilts upward as scroll progress goes to 1
    // As progress goes 0 -> 1, the camera tilts up, which means objects move down
    const tiltOffset = progress * 190;
    const moonY = this.height * 0.22 + lookY * 0.12 + tiltOffset;
    const moonR = 50;

    this.ctx.shadowBlur = 35;
    this.ctx.shadowColor = 'rgba(255,255,255,0.45)';
    this.ctx.fillStyle = '#fffdf0';
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // 2. Rising Sky Lanterns (floating upwards)
    this.skyLanterns.forEach(lantern => {
      // Drift upwards
      lantern.y -= lantern.speedY * 0.005;
      lantern.x += Math.sin(this.time * lantern.swaySpeed + lantern.swayPhase) * 0.0006;

      // Loop lantern if it rises off the top
      if (lantern.y < -0.1) {
        lantern.y = 1.1;
        lantern.x = Math.random();
      }

      const lx = lantern.x * this.width + lookX * 0.25;
      const ly = lantern.y * this.height + lookY * 0.25 + tiltOffset;

      if (ly < -20 || ly > this.height + 20) return;

      this.ctx.save();
      this.ctx.translate(lx, ly);

      // Light glow
      const size = lantern.size * (1 - lantern.y * 0.35); // slightly larger near the bottom
      this.ctx.shadowBlur = size * 1.8;
      this.ctx.shadowColor = lantern.color;

      // Draw rectangular paper sky lantern
      const grad = this.ctx.createLinearGradient(0, -size, 0, size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ffcc00');
      grad.addColorStop(0.9, '#e65100');
      grad.addColorStop(1, '#211003');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      // Curved cylinder shape
      this.ctx.moveTo(-size * 0.6, -size);
      this.ctx.quadraticCurveTo(0, -size * 1.1, size * 0.6, -size);
      this.ctx.lineTo(size * 0.7, size * 0.85);
      this.ctx.quadraticCurveTo(0, size * 0.95, -size * 0.7, size * 0.85);
      this.ctx.closePath();
      this.ctx.fill();

      // Candle fire glowing point at the base
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(0, size * 0.72, size * 0.18, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });

    // 3. Lake Surface (Lower third of screen)
    // As the camera tilts up, the lake boundary moves down
    const lakeY = this.height * 0.62 + tiltOffset;

    if (lakeY < this.height) {
      // Draw water body
      this.ctx.fillStyle = '#060714';
      this.ctx.fillRect(0, lakeY, this.width, this.height - lakeY);

      // Water reflection overlay
      const waterGrad = this.ctx.createLinearGradient(0, lakeY, 0, this.height);
      waterGrad.addColorStop(0, 'rgba(12, 15, 45, 0.55)');
      waterGrad.addColorStop(1, 'rgba(3, 4, 15, 0.95)');
      this.ctx.fillStyle = waterGrad;
      this.ctx.fillRect(0, lakeY, this.width, this.height - lakeY);

      // Distant moon reflection shimmer
      this.ctx.fillStyle = 'rgba(255, 253, 240, 0.15)';
      this.ctx.filter = 'blur(3px)';
      this.ctx.beginPath();
      this.ctx.ellipse(moonX, lakeY + 30, moonR * 1.8, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.filter = 'none';

      // 4. Floating Lotus Lanterns on the Lake (with reflections)
      this.lakeLotusLanterns.forEach(lotus => {
        // Drift slowly with lake current
        lotus.x += lotus.driftSpeed * 0.001;
        if (lotus.x > 1.1) lotus.x = -0.1;

        const lx = lotus.x * this.width + lookX * 0.35;
        const ly = lakeY + (lotus.y - 0.65) * (this.height - lakeY) / 0.35 + lookY * 0.15;

        // Ensure we only draw on the water
        if (ly < lakeY) return;

        const waveSway = Math.sin(this.time * 2 + lotus.wavePhase) * 1.5;
        const currentSize = lotus.size * (0.45 + (ly - lakeY) / (this.height - lakeY) * 0.65); // perspective scale

        this.ctx.save();
        this.ctx.translate(lx, ly + waveSway);

        // a. Vertically Flipped Water Reflection
        this.ctx.save();
        this.ctx.scale(1, -0.4);
        this.ctx.globalAlpha = 0.28;
        this.ctx.filter = 'blur(4px)';

        // Draw flower
        this.drawLotusFlower(currentSize, lotus.color);
        this.ctx.restore();

        // b. Actual Floating Lotus
        this.ctx.shadowBlur = currentSize * 0.95;
        this.ctx.shadowColor = lotus.color;
        this.drawLotusFlower(currentSize, lotus.color);

        // Glow center candle
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, -currentSize * 0.15, currentSize * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
      });
    }
  }

  // Sub-renderer for lotus shapes
  drawLotusFlower(size, color) {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;

    // Draw layered lotus petals
    const petals = 6;
    for (let layer = 0; layer < 2; layer++) {
      const scale = layer === 0 ? 1 : 0.7;
      const count = layer === 0 ? petals : petals - 1;
      const rotOffset = layer === 0 ? 0 : Math.PI / petals;

      this.ctx.fillStyle = layer === 0 ? color : '#ffffff';

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + rotOffset;
        this.ctx.save();
        this.ctx.rotate(angle);
        this.ctx.scale(scale, scale);

        // Petal shape
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.quadraticCurveTo(-size * 0.35, -size * 0.4, 0, -size * 0.85);
        this.ctx.quadraticCurveTo(size * 0.35, -size * 0.4, 0, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
      }
    }

    // Center circular pistil / candle base
    this.ctx.fillStyle = '#ffcc00';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
