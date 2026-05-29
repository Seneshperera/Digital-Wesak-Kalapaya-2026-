/**
 * Wesak Kalapaya - Main Application Orchestrator
 * Integrates Tikal ruins 3D Point Cloud, Web Audio synths, and interactive overlays.
 */

import './style.css';
import { FrameGenerator } from './frameGenerator.js';
import { WesakThree } from './threeScene.js';
import { WesakAudio } from './audio.js';
import { WesakTimeline } from './timeline.js';

// Global variables
let framePlayer = null;
let threeEngine = null;
let audioEngine = null;
let scrollTimeline = null;

let currentSceneIndex = 0;
let normalizedMouse = { x: 0, y: 0 };
let activeExperience = false;

// Exhibit Descriptions (Sinhala & English Translations)
const sceneDescriptions = [
  {
    sinhala: "අනුරාධපුර ඓතිහාසික පුරවරය - ඩිජිටල් වෙසක් කලාපය",
    english: "The sacred ancient city of Anuradhapura, beautifully transformed with glowing Vesak lights and spiritual digital experiences. Click the floating markers to explore each sacred exhibit and Vesak attraction."
  },
  {
    sinhala: "වෙසක් කූඩු මාවත<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>අලංකාර වෙසක් කූඩු වලින් සරසන ලද මෙම මාවත තුළින් ගමන් කරමින් වෙසක් උත්සවයේ සැබෑ අසිරිය විඳින්න.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>සැහැල්ලු සුළඟත් සමඟ සෙමින් දෝලනය වන වෙසක් කූඩු රාත්‍රී අහස ආලෝකමත් කරයි.</span>",
    english: "Wesak Lantern Path<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>Walk through this path decorated with beautiful Wesak lanterns and experience the true splendor of the festival.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>Swaying gently in the soft breeze, Wesak lanterns illuminate the night sky.</span>"
  },
  {
    sinhala: "බුද්ධ චරිත කතා තොරණ<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>බුදුන් වහන්සේගේ ජීවිතයේ වැදගත් සිදුවීම් ආලෝකයෙන් හා කලාත්මක නිර්මාණයෙන් ඉදිරිපත් කරන වෙසක් තොරණ.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>ධර්මයේ ආලෝකයෙන් ලෝකය ප්‍රබෝධමත් කළ බුදුන් වහන්සේට නමස්කාර වේවා.</span>",
    english: "Buddha Biography Thorana<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>A Wesak Thorana presenting key events of Lord Buddha's life through lights and artistic creations.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>Salutations to the Buddha, who enlightened the world with the light of Dharma.</span>"
  },
  {
    sinhala: "ජාතක කතා තොරණ<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>බෝසතාණන් වහන්සේගේ පෙර භවයන් සහ උතුම් ගුණාංග ජාතක කතා මඟින් ආලෝකමත් කරමින් ඉදිරිපත් කරයි.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>දයාව, කරුණාව සහ පරිත්‍යාගය ජීවිතයට එක් කරගමු.</span>",
    english: "Jataka Tales Thorana<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>Illuminating and presenting the previous lives and noble qualities of the Bodhisatta through Jataka stories.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>Let us invite compassion, kindness, and sacrifice into our lives.</span>"
  },
  {
    sinhala: "ථූපාරාමය<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>ශ්‍රී ලංකාවේ ප්‍රථම දාගැබ ලෙස සැලකෙන ථූපාරාමය බෞද්ධ ඉතිහාසයේ අතිශය වැදගත් පූජනීය ස්ථානයකි.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>අපගේ බෞද්ධ උරුමය සහ සංස්කෘතිය ආරක්ෂා කර ගනිමු.</span>",
    english: "Thuparamaya<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>Considered the first stupa in Sri Lanka, Thuparamaya is an extremely important sacred place in Buddhist history.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>Let us protect our Buddhist heritage and culture.</span>"
  },
  {
    sinhala: "ශ්‍රී මහා බෝධිය<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>බුදුන් වහන්සේට බුද්ධත්වය ලැබූ බෝධීන් වහන්සේගේ පරම්පරාවට අයත් ශ්‍රී මහා බෝධිය ශ්‍රද්ධාවෙන් හා ගෞරවයෙන් සිහිපත් කරමු.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>සාමය, සැනසීම සහ සිතේ නිදහස සොයා යන ආධ්‍යාත්මික ස්ථානයක්.</span>",
    english: "Sri Maha Bodhi<br><span style='font-size:0.85em; font-weight:normal; display:block; margin:0.3rem 0;'>We remember with devotion and respect the Sri Maha Bodhi, belonging to the lineage of the Bodhi tree under which Lord Buddha attained Enlightenment.</span><span style='font-size:0.8em; font-weight:normal; opacity:0.8; font-style:italic;'>A spiritual sanctuary to find peace, comfort, and freedom of mind.</span>"
  }
];

// 1. Initialize Three.js immediately on DOM load to start GLB downloading
window.addEventListener('DOMContentLoaded', () => {
  const threeCanvas = document.getElementById('three-canvas');
  threeEngine = new WesakThree(threeCanvas);
  
  // Wire up loaders
  threeEngine.setCallbacks(
    handleLoadProgress,
    handleExhibitLoaded
  );
  
  threeEngine.init();

  // Initialize wishes modal and forms
  initWishesFeature();

  // Check if a wish was received in URL params
  checkReceivedWish();
});

// Updates Loading screen percent text
function handleLoadProgress(percent) {
  const progressBar = document.getElementById('load-progress');
  const percentText = document.getElementById('load-percent');
  
  progressBar.style.width = `${percent}%`;
  percentText.textContent = `${percent}%`;

  if (percent >= 100) {
    setTimeout(() => {
      document.getElementById('loader').classList.add('fade-out');
      document.getElementById('intro-gate').classList.remove('hidden');
    }, 600);
  }
}

// 2. Helper to start experience (gesture triggered)
async function startExperience() {
  if (activeExperience) return;

  // Start spatial audio (gesture triggered)
  audioEngine = new WesakAudio();
  await audioEngine.init();

  // Hide Intro Gate and received wish overlay
  document.getElementById('intro-gate').classList.add('fade-out');
  const receivedOverlay = document.getElementById('received-wish-overlay');
  if (receivedOverlay) receivedOverlay.classList.add('fade-out');
  
  // Fade in HTML labels
  document.getElementById('hotspot-labels').classList.remove('hidden');
  
  activeExperience = true;

  // Initialize Canvas 2D background stars
  const frameCanvas = document.getElementById('frame-canvas');
  framePlayer = new FrameGenerator(frameCanvas);

  // Initialize Scene mapping coordinator
  scrollTimeline = new WesakTimeline(handleNavigationTransition);

  // Setup Event Listeners
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);
  
  // Reset / Back to Map button
  document.getElementById('reset-view-btn').addEventListener('click', () => {
    scrollTimeline.scrollToScene(0);
  });

  // Navigation dots in header
  const dots = document.querySelectorAll('.nav-dot');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetScene = parseInt(dot.getAttribute('data-scene'));
      scrollTimeline.scrollToScene(targetScene);
    });
  });

  // Floating HTML labels click hook
  const labelDivs = document.querySelectorAll('.hotspot-label');
  labelDivs.forEach(label => {
    label.addEventListener('click', () => {
      const targetScene = parseInt(label.getAttribute('data-scene'));
      scrollTimeline.scrollToScene(targetScene);
    });
  });

  // Audio Controllers
  const muteBtn = document.getElementById('mute-btn');
  const volumeSlider = document.getElementById('volume-slider');

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = audioEngine.toggleMute();
      if (isMuted) {
        muteBtn.classList.add('muted');
      } else {
        muteBtn.classList.remove('muted');
      }
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      audioEngine.setVolume(parseFloat(e.target.value));
    });
  }

  handleResize();
  animate();
}

document.getElementById('enter-btn').addEventListener('click', async () => {
  await startExperience();
});

// 3. Coordinate mouse position
function handleMouseMove(e) {
  normalizedMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  normalizedMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
}

// 4. Coordinate resize
function handleResize() {
  if (framePlayer) framePlayer.resize();
}

// 5. Handles navigation transitions (clicks on dots/labels)
function handleNavigationTransition(sceneIndex) {
  if (!threeEngine) return;

  if (sceneIndex === 0) {
    threeEngine.resetToOverview();
  } else {
    // Find the hotspot object corresponding to the sceneIndex and trigger click load
    const hotspot = threeEngine.hotspots.find(h => h.userData.sceneIndex === sceneIndex);
    if (hotspot) {
      threeEngine.triggerLoadExhibit(hotspot);
    }
  }
}

// 6. Callback from Three.js when an exhibit load is completed
function handleExhibitLoaded(sceneIndex) {
  currentSceneIndex = sceneIndex;

  // Update Active Navigation dot class
  const dots = document.querySelectorAll('.nav-dot');
  dots.forEach((dot, idx) => {
    if (idx === sceneIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Toggle layout class for side panel (smaller, bottom-right aligned for Thorana, Stupa and Bodhi exhibits)
  const sceneInfoPanel = document.getElementById('scene-info-panel');
  if (sceneInfoPanel) {
    if (sceneIndex >= 2 && sceneIndex <= 5) {
      sceneInfoPanel.classList.add('side-panel');
    } else {
      sceneInfoPanel.classList.remove('side-panel');
    }
  }

  // Update Audio Mix
  if (audioEngine) {
    audioEngine.updateScene(sceneIndex);
  }

  // Update text panel
  const sceneTextDiv = document.getElementById('scene-text');
  sceneTextDiv.style.opacity = 0;
  
  setTimeout(() => {
    const data = sceneDescriptions[sceneIndex];
    sceneTextDiv.innerHTML = `
      <h3 class="sinhala-desc">${data.sinhala}</h3>
      <p class="english-desc">${data.english}</p>
    `;
    sceneTextDiv.style.opacity = 1;
  }, 400);
}

// 7. Core Render Loop
function animate() {
  if (!activeExperience) return;

  requestAnimationFrame(animate);

  // Render WebGL
  if (threeEngine) {
    threeEngine.animate();
  }

  // Draw 2D Canvas Background Stars (Renders stars and moon backdrops)
  if (framePlayer) {
    framePlayer.render(
      4, // Scene 5 (Floating Lake) contains the starry sky & full moon which serves as background for the ruins
      0.95, // Progress value to lock the full sky rendering
      normalizedMouse.x,
      normalizedMouse.y
    );
  }
}

// 8. Wishes modal creation and sharing features
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let n = 0; n < words.length; n++) {
    let testLine = currentLine + words[n] + ' ';
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(currentLine.trim());
      currentLine = words[n] + ' ';
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine.trim());

  // Center vertical alignment calculation
  let startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + (i * lineHeight));
  }
}

function generateCardImageURL(sender, recipient, message, templateId) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');

  // 1. Setup Gradient, Colors & Styling variables
  let grad;
  let textColor;
  let accentColor;
  let dashedBorderColor;

  if (templateId === 2) { // Serene Lotus Night
    grad = ctx.createRadialGradient(320, 400, 50, 320, 400, 500);
    grad.addColorStop(0, '#0f1d46');
    grad.addColorStop(1, '#030614');
    textColor = '#fdf2f4';
    accentColor = '#ff4d6d';
    dashedBorderColor = 'rgba(255, 77, 109, 0.3)';
  } else if (templateId === 3) { // Lantern Horizon
    grad = ctx.createRadialGradient(320, 400, 50, 320, 400, 500);
    grad.addColorStop(0, '#351306');
    grad.addColorStop(1, '#0e050c');
    textColor = '#fff7f2';
    accentColor = '#fb8500';
    dashedBorderColor = 'rgba(251, 133, 0, 0.3)';
  } else { // Golden Temple Glow (Template 1)
    grad = ctx.createRadialGradient(320, 400, 50, 320, 400, 500);
    grad.addColorStop(0, '#281c06');
    grad.addColorStop(1, '#0a0702');
    textColor = '#fffdec';
    accentColor = '#ffb703';
    dashedBorderColor = 'rgba(255, 210, 0, 0.3)';
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 800);

  // 2. Draw outer border frame (glowing solid)
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 15;
  ctx.strokeRect(20, 20, 600, 760);

  // 3. Draw inner dashed border frame
  ctx.strokeStyle = dashedBorderColor;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0; // disable shadow for clean dashed line
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(36, 36, 568, 728);
  ctx.setLineDash([]); // reset line dash

  // 4. Draw Lotus Emblem
  ctx.fillStyle = accentColor;
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 10;
  ctx.fillText('🪷', 320, 110);
  ctx.shadowBlur = 0; // reset shadow

  // 5. Draw Recipient (To)
  ctx.fillStyle = textColor;
  ctx.font = 'bold 24px "Outfit", sans-serif';
  ctx.fillText(`TO: ${recipient.toUpperCase()}`, 320, 200);

  // 6. Draw Message Body (wrapped & centered)
  ctx.fillStyle = textColor;
  ctx.font = 'italic 28px "Noto Serif Sinhala", serif';
  const msgText = message.startsWith('"') ? message : `"${message}"`;
  wrapCanvasText(ctx, msgText, 320, 400, 480, 45);

  // 7. Draw Sender (From)
  ctx.fillStyle = textColor;
  ctx.font = 'bold 24px "Outfit", sans-serif';
  ctx.fillText(`FROM: ${sender.toUpperCase()}`, 320, 600);

  // 8. Draw Dharmachakra Motif
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.35;
  ctx.font = '36px sans-serif';
  ctx.fillText('☸', 320, 700);
  ctx.globalAlpha = 1.0; // restore alpha

  return canvas.toDataURL('image/png');
}

function triggerCardDownload(sender, recipient, message, templateId) {
  const dataURL = generateCardImageURL(sender, recipient, message, templateId);
  const link = document.createElement('a');
  link.download = `wesak_wish_card_${sender.replace(/\s+/g, '_')}.png`;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function initWishesFeature() {
  const wishesModal = document.getElementById('wishes-modal');
  const createWishBtn = document.getElementById('create-wish-btn');
  const closeWishesBtn = document.getElementById('close-wishes-btn');
  
  const senderInput = document.getElementById('wish-sender');
  const recipientInput = document.getElementById('wish-recipient');
  const messageInput = document.getElementById('wish-message');
  
  const previewCard = document.getElementById('preview-card');
  const previewTo = document.getElementById('preview-to');
  const previewFrom = document.getElementById('preview-from');
  const previewMessage = document.querySelector('#preview-card .card-message-field');
  
  const templateOptions = document.querySelectorAll('.template-option');
  const presetBtns = document.querySelectorAll('.preset-btn');
  
  const downloadBtn = document.getElementById('download-wish-card-btn');
  const copyLinkBtn = document.getElementById('copy-wish-link-btn');
  const whatsappBtn = document.getElementById('whatsapp-wish-btn');
  const emailBtn = document.getElementById('email-wish-btn');
  
  let selectedTemplate = 1;

  if (!wishesModal || !createWishBtn) return;

  // Open modal
  createWishBtn.addEventListener('click', () => {
    wishesModal.classList.remove('hidden');
    updateCardPreview();
  });

  // Close modal
  closeWishesBtn.addEventListener('click', () => {
    wishesModal.classList.add('hidden');
  });
  
  wishesModal.addEventListener('click', (e) => {
    if (e.target === wishesModal) {
      wishesModal.classList.add('hidden');
    }
  });

  // Sync inputs with live preview card
  const updateCardPreview = () => {
    const toName = recipientInput.value.trim();
    previewTo.textContent = toName || "Everyone";
    
    const fromName = senderInput.value.trim();
    previewFrom.textContent = fromName || "Digital Wesak Kalapaya";
    
    const msg = messageInput.value.trim();
    previewMessage.textContent = msg ? `"${msg}"` : `"මෙම වෙසක් මංගල්‍යය ඔබගේ ජීවිතයට සාමය, සතුට සහ නිවන උදාකර දෙන්නක් වේවා!"`;
  };

  senderInput.addEventListener('input', updateCardPreview);
  recipientInput.addEventListener('input', updateCardPreview);
  messageInput.addEventListener('input', updateCardPreview);

  // Template select
  templateOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      templateOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      
      const templateId = parseInt(opt.getAttribute('data-template'));
      selectedTemplate = templateId;
      
      // Update preview card template class
      previewCard.className = `wish-card template-${templateId}`;
    });
  });

  // Preset blessing select
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-wish');
      messageInput.value = text;
      updateCardPreview();
    });
  });

  // Sharing utilities
  const getShareLink = () => {
    const data = {
      s: senderInput.value.trim() || "Digital Wesak Kalapaya",
      r: recipientInput.value.trim() || "Everyone",
      m: messageInput.value.trim() || "මෙම වෙසක් මංගල්‍යය ඔබගේ ජීවිතයට සාමය, සතුට සහ නිවන උදාකර දෙන්නක් වේවා!",
      t: selectedTemplate
    };

    // UTF-8 safe base64 encoding
    const json = JSON.stringify(data);
    const b64 = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));

    return `${window.location.origin}${window.location.pathname}?wish=${b64}`;
  };

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const sender = senderInput.value.trim() || "Digital Wesak Kalapaya";
      const recipient = recipientInput.value.trim() || "Everyone";
      const message = messageInput.value.trim() || "මෙම වෙසක් මංගල්‍යය ඔබගේ ජීවිතයට සාමය, සතුට සහ නිවන උදාකර දෙන්නක් වේවා!";
      triggerCardDownload(sender, recipient, message, selectedTemplate);
    });
  }

  copyLinkBtn.addEventListener('click', () => {
    const link = getShareLink();
    navigator.clipboard.writeText(link).then(() => {
      const originalText = copyLinkBtn.innerHTML;
      copyLinkBtn.innerHTML = `
        <span class="icon">✓</span>
        <span>සාර්ථකව පිටපත් විය!<br><span>LINK COPIED!</span></span>
      `;
      setTimeout(() => {
        copyLinkBtn.innerHTML = originalText;
      }, 2000);
    }).catch(err => {
      console.error("Clipboard copy failed:", err);
      alert("Please copy this link: " + link);
    });
  });

  whatsappBtn.addEventListener('click', () => {
    const link = getShareLink();
    const sender = senderInput.value.trim() || "Digital Wesak Kalapaya";
    const recipient = recipientInput.value.trim() || "Everyone";
    const message = messageInput.value.trim() || "මෙම වෙසක් මංගල්‍යය ඔබගේ ජීවිතයට සාමය, සතුට සහ නිවන උදාකර දෙන්නක් වේවා!";
    
    const textStr = 
`🪷 *ඩිජිටල් වෙසක් ප්‍රාර්ථනා කාඩ්පත* 🪷
----------------------------------------
*To:* ${recipient}

_" ${message} "_

*From:* ${sender}
----------------------------------------
👇 *ප්‍රාර්ථනා පත නැරඹීමට සහ ඩිජිටල් වෙසක් කලාපයට පිවිසීමට සබැඳිය ක්ලික් කරන්න / Click to view interactive 3D card:*
${link}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textStr)}`, "_blank");
  });

  emailBtn.addEventListener('click', () => {
    const link = getShareLink();
    const sender = senderInput.value.trim() || "Digital Wesak Kalapaya";
    const recipient = recipientInput.value.trim() || "Everyone";
    const message = messageInput.value.trim() || "මෙම වෙසක් මංගල්‍යය ඔබගේ ජීවිතයට සාමය, සතුට සහ නිවන උදාකර දෙන්නක් වේවා!";
    
    const subject = encodeURIComponent("පින්බර වෙසක් මංගල්‍යයක් වේවා! / A Digital Wesak Blessing for You");
    const body = encodeURIComponent(
`🪷 ඩිජිටල් වෙසක් ප්‍රාර්ථනා කාඩ්පත 🪷
----------------------------------------
To: ${recipient}

" ${message} "

From: ${sender}
----------------------------------------
ඔබට ලැබුණු විශේෂ ඩිජිටල් වෙසක් ප්‍රාර්ථනා කාඩ්පත නැරඹීමට සහ වෙසක් කලාපයට පිවිසීමට පහත සබැඳිය ක්ලික් කරන්න / Click the link below to view:

${link}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  });
}

let receivedWishData = null;

function checkReceivedWish() {
  const urlParams = new URLSearchParams(window.location.search);
  const wishB64 = urlParams.get('wish');
  if (!wishB64) return;

  try {
    // UTF-8 safe base64 decoding
    const binary = atob(wishB64);
    const json = decodeURIComponent(Array.prototype.map.call(binary, (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const data = JSON.parse(json);

    const receivedOverlay = document.getElementById('received-wish-overlay');
    const receivedCard = document.getElementById('received-card');
    const receivedTo = document.getElementById('received-to');
    const receivedFrom = document.getElementById('received-from');
    const receivedMessage = document.querySelector('#received-card .card-message-field');
    const enterReceivedBtn = document.getElementById('enter-received-kalapaya-btn');
    const downloadReceivedBtn = document.getElementById('download-received-card-btn');
    const receivedWebLink = document.getElementById('received-web-link');

    if (receivedOverlay && receivedCard && data) {
      receivedWishData = data;
      receivedTo.textContent = data.r || "Everyone";
      receivedFrom.textContent = data.s || "Digital Wesak Kalapaya";
      receivedMessage.textContent = data.m ? `"${data.m}"` : "";
      
      // Apply theme template class
      receivedCard.className = `wish-card template-${data.t || 1}`;

      // Update dynamics for home link
      if (receivedWebLink) {
        receivedWebLink.href = window.location.origin;
        receivedWebLink.textContent = window.location.host;
      }

      // Show received wish overlay and hide standard gate
      receivedOverlay.classList.remove('hidden');
      document.getElementById('intro-gate').classList.add('hidden');

      // Bind guest enter experience click trigger
      if (enterReceivedBtn) {
        enterReceivedBtn.addEventListener('click', async () => {
          await startExperience();
        });
      }

      // Bind download button on recipient overlay
      if (downloadReceivedBtn) {
        downloadReceivedBtn.addEventListener('click', () => {
          if (receivedWishData) {
            triggerCardDownload(
              receivedWishData.s || "Digital Wesak Kalapaya",
              receivedWishData.r || "Everyone",
              receivedWishData.m || "මෙම වෙසක් මංගල්‍යය ඔබගේ ජීවිතයට සාමය, සතුට සහ නිවන උදාකර දෙන්නක් වේවා!",
              receivedWishData.t || 1
            );
          }
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse incoming wish data:", e);
  }
}
