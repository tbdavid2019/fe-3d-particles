import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene, count = 12000) {
    this.scene = scene;
    this.count = count;
    this.color = new THREE.Color('#ff0055');
    
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.targetPositions = new Float32Array(this.count * 3);
    
    // Initialize random positions
    for (let i = 0; i < this.count * 3; i++) {
      this.positions[i] = (Math.random() - 0.5) * 10;
      this.targetPositions[i] = this.positions[i];
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    
    this.material = new THREE.PointsMaterial({
      color: this.color,
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
    
    this.currentShape = 'heart';
    this.baseScale = 1.0;
    this.handScale = 1.0; // Multiplier from hand tracking
    
    this.setShape('heart');
  }

  setColor(hex) {
    this.color.set(hex);
    this.material.color = this.color;
  }

  setHandScale(scale) {
    // Map input (0.1 - 0.4) to (0.5 - 2.0)
    // Let's assume input is roughly 0.0 to 0.5
    const minInput = 0.15;
    const maxInput = 0.4;
    const minOutput = 0.5;
    const maxOutput = 2.5;
    
    let normalized = (scale - minInput) / (maxInput - minInput);
    normalized = Math.max(0, Math.min(1, normalized)); // Clamp
    
    // Smooth transition could be done here, but we'll do it in update loop if needed.
    // For now, direct mapping.
    this.handScale = minOutput + normalized * (maxOutput - minOutput);
  }

  setShape(shapeName) {
    this.currentShape = shapeName;
    const positions = this.generateShape(shapeName);
    // Update target positions
    for (let i = 0; i < this.count * 3; i++) {
      this.targetPositions[i] = positions[i];
    }
  }

  generateShape(type) {
    const arr = new Float32Array(this.count * 3);
    // Sample a point inside an ellipsoid centered at (cx, cy, cz)
    const randomInEllipsoid = (cx, cy, cz, rx, ry, rz, fuzz = 0) => {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(Math.random()); // Uniform density
      const sinPhi = Math.sin(phi);
      return {
        x: cx + rx * r * sinPhi * Math.cos(theta) + (Math.random() - 0.5) * fuzz,
        y: cy + ry * r * Math.cos(phi) + (Math.random() - 0.5) * fuzz,
        z: cz + rz * r * sinPhi * Math.sin(theta) + (Math.random() - 0.5) * fuzz
      };
    };
    
    for (let i = 0; i < this.count; i++) {
      let x, y, z;
      const idx = i * 3;
      
      if (type === 'heart') {
        // 2D heart + random Z
        const u = Math.random() * Math.PI * 2;
        // Spread points inside
        const spread = Math.sqrt(Math.random());
        x = spread * 16 * Math.pow(Math.sin(u), 3);
        y = spread * (13 * Math.cos(u) - 5 * Math.cos(2*u) - 2 * Math.cos(3*u) - Math.cos(4*u));
        z = (Math.random() - 0.5) * 5;
        
        // Scale down
        x *= 0.1; y *= 0.1; z *= 0.1;

      } else if (type === 'flower') {
        // Rose curve: r = cos(k * theta)
        const k = 4; // 4 petals
        const theta = Math.random() * Math.PI * 2;
        const rMax = Math.cos(k * theta);
        const r = Math.random() * Math.abs(rMax); // Fill petals
        
        x = r * Math.cos(theta) * 3;
        y = r * Math.sin(theta) * 3;
        z = (Math.random() - 0.5) * 1;
        
      } else if (type === 'saturn') {
        // Sphere + Ring
        if (Math.random() > 0.4) {
          // Sphere
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 1.2;
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        } else {
          // Ring
          const theta = Math.random() * Math.PI * 2;
          const r = 1.8 + Math.random() * 0.8;
          x = r * Math.cos(theta);
          z = r * Math.sin(theta);
          y = (Math.random() - 0.5) * 0.1;
          
          // Tilt ring
          const tilt = 0.4;
          const yNew = y * Math.cos(tilt) - z * Math.sin(tilt);
          const zNew = y * Math.sin(tilt) + z * Math.cos(tilt);
          y = yNew;
          z = zNew;
        }
        
      } else if (type === 'fireworks') {
        // Sphere expanding
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 3 * Math.cbrt(Math.random()); // Uniform volume
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        
      } else if (type === 'spiral') {
        // Helix
        const t = Math.random() * 20; // Height
        const r = 0.5 + t * 0.1;
        x = r * Math.cos(t * 2);
        z = r * Math.sin(t * 2);
        y = t * 0.3 - 3;
      } else if (type === 'buddha') {
        // Composite volumes to approximate a seated Buddha silhouette.
        const region = Math.random();
        
        if (region < 0.16) {
          // Head
          const p = randomInEllipsoid(0, 1.6, 0, 0.35, 0.45, 0.35, 0.04);
          x = p.x; y = p.y; z = p.z;
        } else if (region < 0.24) {
          // Top bun / halo glow
          const p = randomInEllipsoid(0, 1.95, 0, 0.25, 0.18, 0.25, 0.05);
          x = p.x; y = p.y; z = p.z;
        } else if (region < 0.46) {
          // Shoulders and upper arms
          const side = Math.random() > 0.5 ? 1 : -1;
          const p = randomInEllipsoid(side * 0.55, 1.1, 0, 0.55, 0.28, 0.35, 0.04);
          x = p.x; y = p.y; z = p.z;
        } else if (region < 0.7) {
          // Torso / lap
          const p = randomInEllipsoid(0, 0.6, 0, 0.9, 0.45, 0.6, 0.05);
          x = p.x; y = p.y; z = p.z;
        } else if (region < 0.92) {
          // Folded legs / base cushion
          const p = randomInEllipsoid(0, 0, 0, 1.2, 0.35, 0.9, 0.06);
          x = p.x; y = p.y; z = p.z;
        } else {
          // A few floating sparkles around the halo
          const theta = Math.random() * Math.PI * 2;
          const radius = 1.2 + Math.random() * 0.6;
          x = radius * Math.cos(theta);
          z = radius * Math.sin(theta);
          y = 1.8 + (Math.random() - 0.5) * 0.3;
        }
      } else {
        // Default sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 2;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      }
      
      arr[idx] = x;
      arr[idx+1] = y;
      arr[idx+2] = z;
    }
    
    return arr;
  }

  update() {
    const positions = this.geometry.attributes.position.array;
    const lerpSpeed = 0.08;
    
    // Animate particles
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      
      // Apply scale to target
      const tx = this.targetPositions[idx] * this.handScale;
      const ty = this.targetPositions[idx+1] * this.handScale;
      const tz = this.targetPositions[idx+2] * this.handScale;
      
      // Lerp current to target
      positions[idx] += (tx - positions[idx]) * lerpSpeed;
      positions[idx+1] += (ty - positions[idx+1]) * lerpSpeed;
      positions[idx+2] += (tz - positions[idx+2]) * lerpSpeed;
      
      // Optional: Add some noise/movement
      if (this.currentShape === 'fireworks') {
         // Jitter
         positions[idx] += (Math.random() - 0.5) * 0.05;
         positions[idx+1] += (Math.random() - 0.5) * 0.05;
         positions[idx+2] += (Math.random() - 0.5) * 0.05;
      }
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    
    // Rotate the whole system slowly
    this.points.rotation.y += 0.002;
  }
}
