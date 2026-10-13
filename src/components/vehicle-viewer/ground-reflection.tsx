import { useEffect, useMemo } from 'react';
import { PlaneGeometry, ShaderMaterial } from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

// Reflect only the car, leaving the viewer's background visible between pixels.
// A standard mirror material would also paint a large rectangular floor.
const reflectionShader = {
  name: 'SoftVehicleReflection',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 reflectionUv;
    varying vec2 floorPosition;
    void main() {
      reflectionUv = textureMatrix * vec4(position, 1.0);
      floorPosition = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec4 reflectionUv;
    varying vec2 floorPosition;
    void main() {
      vec2 uv = reflectionUv.xy / reflectionUv.w;
      vec4 reflection = vec4(0.0);
      // Blur premultiplied samples so the transparent background adds no fringe.
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          float weight = (x == 0 ? 2.0 : 1.0) * (y == 0 ? 2.0 : 1.0);
          vec4 sampleColor = texture2D(tDiffuse, uv + vec2(float(x), float(y)) * (1.5 / 512.0));
          reflection += vec4(sampleColor.rgb * sampleColor.a, sampleColor.a) * weight;
        }
      }
      reflection /= 16.0;
      float fade = 1.0 - smoothstep(1.6, 3.8, length(floorPosition));
      gl_FragColor = vec4(reflection.rgb / max(reflection.a, 0.0001), reflection.a * fade * 0.18);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

export function GroundReflection() {
  const reflector = useMemo(() => {
    const next = new Reflector(new PlaneGeometry(12, 12), {
      textureWidth: 512,
      textureHeight: 512,
      multisample: 2,
      clipBias: 0.003,
      shader: reflectionShader,
    });
    next.rotation.x = -Math.PI / 2;
    next.position.y = -0.005;
    const material = next.material as ShaderMaterial;
    material.transparent = true;
    material.depthWrite = false;
    return next;
  }, []);

  useEffect(
    () => () => {
      reflector.dispose();
      reflector.geometry.dispose();
    },
    [reflector]
  );

  return <primitive object={reflector} />;
}
