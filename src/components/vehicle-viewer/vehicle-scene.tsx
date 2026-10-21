import { useEffect, useMemo, useRef } from 'react';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  Box3,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import { EncryptedModelLoader } from '@/lib/encrypted-model-loader';
import { encryptedModelUrl } from '@/lib/model-assets';
import {
  PAINT_FINISHES,
  type PaintFinishKey,
  type VehicleAssetConfig,
} from '@/lib/vehicle-catalog';

import { GroundReflection } from './ground-reflection';

const WHEEL_ANCHOR = /^Wheel_(?:LF|LR|RL|RF|RR)_Spatial$/;

export type CameraView = 'front' | 'rear' | 'side';
export type CameraViewRequest = { view: CameraView; sequence: number };
export type CameraZoomRequest = { direction: 'in' | 'out'; sequence: number };
export type CoverFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  viewWidth: number;
  viewHeight: number;
};

function visibleMeshBounds(root: Object3D) {
  const bounds = new Box3();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) return;
    bounds.union(geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return bounds;
}

function projectVisibleMeshes(
  root: Object3D,
  camera: PerspectiveCamera,
  viewWidth: number,
  viewHeight: number
): CoverFrame {
  const point = new Vector3();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.getAttribute('position');
    if (!position) return;
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index);
      point.applyMatrix4(object.matrixWorld);
      point.project(camera);
      if (point.z < -1 || point.z > 1) continue;
      const sx = (point.x * 0.5 + 0.5) * viewWidth;
      const sy = (0.5 - point.y * 0.5) * viewHeight;
      minX = Math.min(minX, sx);
      minY = Math.min(minY, sy);
      maxX = Math.max(maxX, sx);
      maxY = Math.max(maxY, sy);
    }
  });
  if (!Number.isFinite(minX)) {
    return {
      x: 0,
      y: 0,
      width: viewWidth,
      height: viewHeight,
      viewWidth,
      viewHeight,
    };
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
    viewWidth,
    viewHeight,
  };
}

function useDracoGltf(path: string) {
  return useLoader(EncryptedModelLoader, encryptedModelUrl(path), (loader) => {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    loader.setDRACOLoader(draco);
  });
}

export function prepareScene(root: Object3D, vehicle: VehicleAssetConfig) {
  root.traverse((object) => {
    if (/^(floor|groundplane|ground_shadow\d*)$/i.test(object.name))
      object.visible = false;
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const nextMaterials = materials.map((source) => {
      const isPaint =
        vehicle.paintMaterialPattern.test(source?.name || '') &&
        !vehicle.paintMeshExclusionPattern.test(object.name || '');
      if (!isPaint) {
        const cloned = source.clone();
        // Keep cabin-side glass and lamp lenses as authored. Reducing opacity
        // on every glass layer also fades the reflection and exposes the cabin.
        if (
          cloned instanceof MeshStandardMaterial &&
          /^Glass(?:[_.]|$)/i.test(source.name) &&
          !/interior|lights/i.test(source.name)
        ) {
          const glass = new MeshPhysicalMaterial();
          MeshStandardMaterial.prototype.copy.call(glass, cloned);
          glass.defines = { STANDARD: '', PHYSICAL: '' };
          cloned.dispose();
          glass.color.set('#9aa2aa');
          glass.metalness = 0;
          glass.roughness = 0.08;
          glass.ior = 1.5;
          glass.transmission = /tinted/i.test(source.name) ? 0.78 : 0.9;
          glass.thickness = 0;
          glass.transparent = false;
          glass.opacity = 1;
          glass.depthWrite = true;
          glass.envMapIntensity = 1.25;
          return glass;
        }
        return cloned;
      }
      const material = new MeshPhysicalMaterial();
      // Retain sidedness, vertex colors, normal/AO maps and UV settings.
      MeshStandardMaterial.prototype.copy.call(material, source);
      material.defines = { STANDARD: '', PHYSICAL: '' };
      material.userData.wrapPaint = true;
      return material;
    });
    object.material = Array.isArray(object.material)
      ? nextMaterials
      : nextMaterials[0];
  });
}

export function updatePaint(
  root: Object3D,
  finish: PaintFinishKey,
  color: string,
  texture?: Texture | null
) {
  const finishValues = PAINT_FINISHES[finish];
  if (texture) {
    texture.colorSpace = SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;
  }
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const source of materials) {
      if (!source.userData.wrapPaint) continue;
      const material = source as MeshPhysicalMaterial;
      material.color.set(texture ? '#ffffff' : color);
      material.metalness = finishValues.metalness;
      material.roughness = finishValues.roughness;
      material.clearcoat = finishValues.clearcoat;
      material.clearcoatRoughness = finishValues.clearcoatRoughness;
      material.sheen = finishValues.sheen;
      material.sheenColor.set('#f4f8fc');
      material.sheenRoughness = 0.42;
      material.iridescence = finishValues.iridescence;
      material.iridescenceIOR = 1.3;
      material.iridescenceThicknessRange = [140, 280];
      material.envMapIntensity = 1.22;
      material.map = texture || null;
      material.needsUpdate = true;
    }
  });
}

export function attachWheels(root: Object3D, wheelRoot: Object3D) {
  root.traverse((object) => {
    if (!WHEEL_ANCHOR.test(object.name)) return;
    const wheel = wheelRoot.clone(true);
    wheel.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const nextMaterials = materials.map((source) => {
        const material = source.clone() as MeshStandardMaterial;
        if (/tire/i.test(material.name || child.name)) {
          material.color.set('#292c30');
          material.metalness = 0;
          material.roughness = 0.78;
          material.envMapIntensity = 0.65;
        } else {
          // Preserve each wheel's original alloy color and texture.
          material.envMapIntensity = 1.15;
        }
        return material;
      });
      child.material = Array.isArray(child.material)
        ? nextMaterials
        : nextMaterials[0];
    });
    object.add(wheel);
  });
}

function CameraFit({
  root,
  vehicle,
  controls,
  resetSignal,
  coverMode,
  coverPadding,
  onCoverFrame,
  previewMode,
  heroMode,
  viewRequest,
  zoomRequest,
}: {
  root: Object3D;
  vehicle: VehicleAssetConfig;
  controls: React.RefObject<OrbitControlsImpl | null>;
  resetSignal: number;
  coverMode: boolean;
  coverPadding?: number;
  onCoverFrame?: (frame: CoverFrame) => void;
  previewMode: boolean;
  heroMode: boolean;
  viewRequest?: CameraViewRequest;
  zoomRequest?: CameraZoomRequest;
}) {
  const { camera, size, invalidate } = useThree();
  const previousFit = useRef<{
    root: Object3D;
    reset: number;
    view?: CameraViewRequest;
    distance: number;
  } | null>(null);
  const resizeDistance = useRef<number | null>(null);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (resizeDistance.current === null || !orbit) return;
    const offset = camera.position.clone().sub(orbit.target);
    const current = offset.length();
    const target = Math.min(
      orbit.maxDistance,
      Math.max(orbit.minDistance, resizeDistance.current)
    );
    const next =
      current +
      (target - current) * (1 - Math.exp(-16 * Math.min(delta, 0.05)));
    camera.position.copy(orbit.target).add(offset.setLength(next));
    orbit.update();
    if (Math.abs(target - next) < 0.001) resizeDistance.current = null;
    invalidate();
  });

  useEffect(() => {
    const previous = previousFit.current;
    const resizing =
      previewMode &&
      !heroMode &&
      !coverMode &&
      previous?.root === root &&
      previous.reset === resetSignal &&
      previous.view === viewRequest;
    // Hidden asset ground planes must not lift the tires above our reflection.
    const getBounds = () => visibleMeshBounds(root);
    const box = getBounds();
    if (box.isEmpty()) return;
    const dimensions = box.getSize(new Vector3());
    const maxGround = Math.max(dimensions.x, dimensions.z);
    const scale = 4.85 / Math.max(maxGround, 0.01);
    // Resize relative to the current scale, including after a viewport change.
    root.scale.multiplyScalar(scale);
    const normalizedBox = getBounds();
    const normalizedSize = normalizedBox.getSize(new Vector3());
    const normalizedCenter = normalizedBox.getCenter(new Vector3());
    root.position.x -= normalizedCenter.x;
    root.position.y -= normalizedBox.min.y;
    root.position.z -= normalizedCenter.z;

    const perspective = camera as PerspectiveCamera;
    const fov = (perspective.fov * Math.PI) / 180;
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.1);
    const normalizedGround = Math.max(normalizedSize.x, normalizedSize.z);
    const tightCover = (coverPadding ?? 0) > 0;
    const horizontalFill = coverMode ? 1.45 : vehicle.camera.horizontalFill;
    const verticalFill = coverMode ? 0.8 : vehicle.camera.verticalFill;
    let distance = tightCover
      ? 0.01
      : Math.max(
          normalizedGround / (2 * Math.tan(fov / 2) * aspect * horizontalFill),
          normalizedSize.y / (2 * Math.tan(fov / 2) * verticalFill),
          normalizedGround * (coverMode ? 0.98 : 1.25)
        );
    const fittedBounds = tightCover ? visibleMeshBounds(root) : null;
    const target = fittedBounds
      ? fittedBounds.getCenter(new Vector3())
      : new Vector3(
          0,
          Math.max(
            normalizedSize.y *
              (coverMode
                ? 0.38
                : previewMode
                  ? 0.5
                  : vehicle.camera.targetHeightRatio),
            0.42
          ),
          0
        );
    const direction = new Vector3(
      ...(tightCover || coverMode
        ? ([-0.84, 0.18, -0.52] as const)
        : previewMode
          ? ([-0.84, 0.16, -0.52] as const)
          : vehicle.camera.positionDirection)
    ).normalize();
    if (resizing && controls.current) {
      direction.copy(camera.position).sub(controls.current.target).normalize();
    }
    if (tightCover && fittedBounds) {
      const right = new Vector3()
        .crossVectors(new Vector3(0, 1, 0), direction)
        .normalize();
      const up = new Vector3().crossVectors(direction, right).normalize();
      const tanHalfFov = Math.tan(fov / 2);
      const padding = coverPadding ?? 0;
      const horizontalFrame = Math.max(
        1 - (padding * 2) / Math.max(size.width, 1),
        0.2
      );
      const verticalFrame = Math.max(
        1 - (padding * 2) / Math.max(size.height, 1),
        0.2
      );
      for (const x of [fittedBounds.min.x, fittedBounds.max.x]) {
        for (const y of [fittedBounds.min.y, fittedBounds.max.y]) {
          for (const z of [fittedBounds.min.z, fittedBounds.max.z]) {
            const offset = new Vector3(x, y, z).sub(target);
            const depth = offset.dot(direction);
            distance = Math.max(
              distance,
              depth +
                Math.abs(offset.dot(right)) /
                  (tanHalfFov * aspect * horizontalFrame),
              depth + Math.abs(offset.dot(up)) / (tanHalfFov * verticalFrame)
            );
          }
        }
      }
    } else if (previewMode) {
      if (viewRequest && !resizing) {
        // GLTF root transforms can differ from the asset's local forward axis.
        // Resolve front from wheel anchors in world space instead.
        const frontWheel = root.getObjectByName('Wheel_RF_Spatial');
        const rearWheel = root.getObjectByName('Wheel_RR_Spatial');
        const forward =
          frontWheel && rearWheel
            ? frontWheel
                .getWorldPosition(new Vector3())
                .sub(rearWheel.getWorldPosition(new Vector3()))
            : new Vector3(0, 0, -1);
        forward.y = 0;
        forward.normalize();
        if (viewRequest.view === 'front') direction.copy(forward);
        else if (viewRequest.view === 'rear') direction.copy(forward).negate();
        else direction.crossVectors(new Vector3(0, 1, 0), forward).normalize();
        direction.y = 0.1;
        direction.normalize();
      }
      // Fit all eight corners in camera space. This fills wide screens and
      // keeps the entire car visible on narrow or short viewports.
      const bounds = getBounds();
      const right = new Vector3()
        .crossVectors(new Vector3(0, 1, 0), direction)
        .normalize();
      const up = new Vector3().crossVectors(direction, right).normalize();
      const tanHalfFov = Math.tan(fov / 2);
      const frameFill = heroMode ? (size.width >= 600 ? 1.06 : 0.94) : 0.84;
      distance = 0;
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const offset = new Vector3(x, y, z).sub(target);
            const depth = offset.dot(direction);
            distance = Math.max(
              distance,
              depth +
                Math.abs(offset.dot(right)) / (tanHalfFov * aspect * frameFill),
              depth + Math.abs(offset.dot(up)) / (tanHalfFov * frameFill)
            );
          }
        }
      }
    }
    const fittedDistance = distance;
    if (resizing && previous && controls.current) {
      // Preserve the user's orbit and zoom while easing toward the new fit.
      const currentDistance = camera.position.distanceTo(
        controls.current.target
      );
      distance *=
        (resizeDistance.current ?? currentDistance) / previous.distance;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        resizeDistance.current = distance;
        distance = currentDistance;
      }
    } else {
      resizeDistance.current = null;
    }
    previousFit.current = {
      root,
      reset: resetSignal,
      view: viewRequest,
      distance: fittedDistance,
    };
    perspective.position.copy(target).addScaledVector(direction, distance);
    perspective.near = Math.max(normalizedGround / 250, 0.015);
    perspective.far = Math.max(normalizedGround * 25, 120);
    perspective.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.copy(target);
      controls.current.minDistance = tightCover
        ? Math.min(distance * 0.5, 1)
        : Math.max(normalizedSize.z * 0.78, 2.7);
      controls.current.maxDistance = Math.max(
        normalizedSize.z * 3.1,
        12,
        distance * 2.5
      );
      // Discard orbit damping left over from a drag before applying a preset.
      const damping = controls.current.enableDamping;
      controls.current.enableDamping = false;
      controls.current.update();
      perspective.position.copy(target).addScaledVector(direction, distance);
      controls.current.update();
      controls.current.enableDamping = damping;
    }
    if (tightCover && onCoverFrame) {
      perspective.updateMatrixWorld();
      onCoverFrame(
        projectVisibleMeshes(root, perspective, size.width, size.height)
      );
    }
    invalidate();
  }, [
    camera,
    controls,
    coverMode,
    coverPadding,
    onCoverFrame,
    previewMode,
    heroMode,
    viewRequest,
    invalidate,
    resetSignal,
    root,
    size,
    vehicle,
  ]);
  useEffect(() => {
    if (!zoomRequest || !controls.current) return;
    resizeDistance.current = null;
    if (zoomRequest.direction === 'in') controls.current.dollyIn(0.85);
    else controls.current.dollyOut(0.85);
    controls.current.update();
    invalidate();
  }, [controls, invalidate, zoomRequest]);
  return null;
}

export function VehicleScene({
  vehicle,
  finish,
  color,
  texture,
  autoRotate,
  enableZoom = true,
  resetSignal,
  coverMode = false,
  coverPadding,
  onCoverFrame,
  previewMode = false,
  heroMode = false,
  viewRequest,
  zoomRequest,
  onOrbitStart,
  onReady,
}: {
  vehicle: VehicleAssetConfig;
  finish: PaintFinishKey;
  color: string;
  texture?: Texture | null;
  autoRotate: boolean;
  enableZoom?: boolean;
  resetSignal: number;
  coverMode?: boolean;
  coverPadding?: number;
  onCoverFrame?: (frame: CoverFrame) => void;
  previewMode?: boolean;
  heroMode?: boolean;
  viewRequest?: CameraViewRequest;
  zoomRequest?: CameraZoomRequest;
  onOrbitStart?: () => void;
  onReady?: () => void;
}) {
  const body = useDracoGltf(vehicle.bodyPath);
  const wheel = useDracoGltf(vehicle.wheelPath);
  const controls = useRef<OrbitControlsImpl>(null);
  const invalidate = useThree((state) => state.invalidate);
  const root = useMemo(() => {
    const next = body.scene.clone(true);
    attachWheels(next, wheel.scene);
    prepareScene(next, vehicle);
    return next;
  }, [body.scene, vehicle, wheel.scene]);

  useEffect(() => {
    updatePaint(root, finish, color, texture);
    invalidate();
  }, [color, finish, invalidate, root, texture]);

  useEffect(() => {
    onReady?.();
  }, [onReady, root]);

  return (
    <>
      <CameraFit
        root={root}
        vehicle={vehicle}
        controls={controls}
        resetSignal={resetSignal}
        coverMode={coverMode}
        coverPadding={coverPadding}
        onCoverFrame={onCoverFrame}
        previewMode={previewMode}
        heroMode={heroMode}
        viewRequest={viewRequest}
        zoomRequest={zoomRequest}
      />
      <primitive object={root} />
      <Environment resolution={256} background={false}>
        <Lightformer
          intensity={3}
          position={[0, 4.6, 0.2]}
          scale={[8, 2.2, 1]}
        />
        <Lightformer
          intensity={1.7}
          position={[0.4, 2.05, 5.1]}
          scale={[6.4, 2.4, 1]}
        />
        <Lightformer
          intensity={2}
          color="#e7eef8"
          position={[-4.5, 1.7, 0.3]}
          scale={[2.5, 3.6, 1]}
        />
        <Lightformer
          intensity={0.85}
          color="#d7e3f3"
          position={[1.4, 2.2, -4.6]}
          scale={[3.2, 1.1, 1]}
        />
      </Environment>
      <hemisphereLight intensity={0.85} color="#f7f9fc" groundColor="#85909e" />
      <directionalLight
        castShadow
        intensity={0.95}
        position={[0.5, 9, 1]}
        shadow-mapSize={coverMode ? [4096, 4096] : [2048, 2048]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.018}
        shadow-radius={6}
      />
      <directionalLight
        intensity={previewMode ? 0.35 : 0.28}
        position={[-5, 3.2, 2.4]}
      />
      <directionalLight
        intensity={previewMode ? 0.28 : 0.22}
        position={[-2.5, 5.5, -5.5]}
      />
      <directionalLight intensity={0.65} position={[-4, 1.8, -3]} />
      <GroundReflection />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableZoom={enableZoom}
        enableDamping
        dampingFactor={0.055}
        zoomSpeed={0.35}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.49}
        autoRotate={autoRotate}
        autoRotateSpeed={0.55}
        onStart={onOrbitStart}
      />
    </>
  );
}
