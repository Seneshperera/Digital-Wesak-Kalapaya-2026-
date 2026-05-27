/**
 * Wesak Kalapaya - Scene Timeline Coordinator
 * Connects header navigation dots and actions to camera transitions.
 */

import { gsap } from 'gsap';

export class WesakTimeline {
  constructor(onSceneChangeCallback) {
    this.onSceneChange = onSceneChangeCallback;
    this.currentSceneIndex = 0;
  }

  // Triggered when a user clicks on a navigation dot or hotspot
  scrollToScene(sceneIndex) {
    if (sceneIndex === this.currentSceneIndex) return;

    this.currentSceneIndex = sceneIndex;

    // Trigger scene change callback (main orchestrator will notify Three.js to fly camera and load assets)
    if (this.onSceneChange) {
      this.onSceneChange(sceneIndex);
    }
  }

  getCurrentScene() {
    return this.currentSceneIndex;
  }

  destroy() {
    // No scroll triggers or DOM elements to clean up anymore
  }
}
