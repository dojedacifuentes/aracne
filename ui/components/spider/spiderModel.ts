import {
  Box3,
  DoubleSide,
  Group,
  MeshStandardMaterial,
  Vector3,
  type Material,
  type Mesh,
  type Object3D,
  type Texture,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { MODEL_ORIENTATION, SPIDER_MODEL_URL } from './spiderConfig';

/**
 * Carga perezosa y compartida del modelo. El GLB se pide la primera vez que
 * una araña lo necesita, se normaliza una sola vez (centro en el origen, lado
 * mayor = 1) y queda como plantilla. Cada araña es un clon que comparte
 * geometría, materiales y textura; cuando se suelta el último, se libera todo.
 *
 * El clonado pasa por SkeletonUtils, como en vr-spiders: la huntsman no tiene
 * esqueleto, pero así un modelo con huesos también se clonaría bien.
 */

let template: Object3D | null = null;
let loading: Promise<Object3D> | null = null;
let holders = 0;

type TexturedMaterial = Material & { map?: Texture | null };

/**
 * El GLB viene con `KHR_materials_unlit`: luz horneada en la textura. Sobre el
 * negro del fondo eso la hace parecer recortada. Con un material estándar
 * recibe la luz de la escena y se asienta en ella.
 */
function standardize(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const previous = mesh.material as TexturedMaterial;
    mesh.material = new MeshStandardMaterial({
      map: previous.map ?? null,
      roughness: 0.62,
      metalness: 0,
      side: DoubleSide,
    });
    previous.dispose();
  });
}

function normalize(source: Object3D): Object3D {
  const oriented = new Group();
  oriented.add(source);
  source.updateMatrixWorld(true);
  const box = new Box3().setFromObject(source);
  source.position.sub(box.getCenter(new Vector3()));
  oriented.rotation.set(MODEL_ORIENTATION[0], MODEL_ORIENTATION[1], MODEL_ORIENTATION[2], 'ZYX');

  const root = new Group();
  root.name = 'spider-template';
  root.add(oriented);
  root.updateMatrixWorld(true);
  const size = new Box3().setFromObject(oriented).getSize(new Vector3());
  root.scale.setScalar(1 / Math.max(size.x, size.y, 1e-6));
  return root;
}

function disposeTree(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials as TexturedMaterial[]) {
      material.map?.dispose();
      material.dispose();
    }
  });
}

/** Una araña nueva. Cada llamada debe acompañarse de un `releaseSpider()`. */
export function acquireSpider(): Promise<Object3D> {
  holders += 1;
  if (!loading) {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loading = loader.loadAsync(SPIDER_MODEL_URL).then((gltf) => {
      const source = gltf.scene.getObjectByName('huntsman') ?? gltf.scene;
      source.removeFromParent();
      standardize(source);
      template = normalize(source);
      return template;
    });
    // Un fallo de red no debe dejar la caché envenenada para el próximo intento.
    loading.catch(() => {
      loading = null;
    });
  }
  return loading.then((loaded) => cloneSkinned(loaded));
}

export function releaseSpider(): void {
  holders = Math.max(0, holders - 1);
  if (holders > 0 || !template) return;
  disposeTree(template);
  template = null;
  loading = null;
}
