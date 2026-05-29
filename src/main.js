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
    const text = encodeURIComponent("🪷 ඔබට ලැබුණු විශේෂ ඩිජිටල් වෙසක් සුභ පැතුම් පතක්! / A special Digital Wesak Wish for you: " + link);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  });

  emailBtn.addEventListener('click', () => {
    const link = getShareLink();
    const subject = encodeURIComponent("පින්බර වෙසක් මංගල්‍යයක් වේවා! / A Digital Wesak Blessing for You");
    const body = encodeURIComponent("තෙරුවන් සරණින් ඔබට සාමකාමී වෙසක් මංගල්‍යයක් වේවා!\n\nඔබට ලැබුණු විශේෂ ඩිජිටල් වෙසක් ප්‍රාර්ථනා කාඩ්පත නැරඹීමට පහත සබැඳිය ක්ලික් කරන්න:\n\n" + link);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  });
}

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

    if (receivedOverlay && receivedCard && data) {
      receivedTo.textContent = data.r || "Everyone";
      receivedFrom.textContent = data.s || "Digital Wesak Kalapaya";
      receivedMessage.textContent = data.m ? `"${data.m}"` : "";
      
      // Apply theme template class
      receivedCard.className = `wish-card template-${data.t || 1}`;

      // Show received wish overlay and hide standard gate
      receivedOverlay.classList.remove('hidden');
      document.getElementById('intro-gate').classList.add('hidden');

      // Bind guest enter experience click trigger
      if (enterReceivedBtn) {
        enterReceivedBtn.addEventListener('click', async () => {
          await startExperience();
        });
      }
    }
  } catch (e) {
    console.error("Failed to parse incoming wish data:", e);
  }
}
