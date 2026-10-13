import { FileLoader, LoaderUtils } from 'three';
import {
  GLTFLoader,
  type GLTF,
} from 'three/examples/jsm/loaders/GLTFLoader.js';

import { decryptModel } from '@/lib/model-assets';

/** Keeps Three's loading manager and R3F's useLoader cache for encrypted GLBs. */
export class EncryptedModelLoader extends GLTFLoader {
  override load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void
  ) {
    const resourcePath =
      this.resourcePath || this.path || LoaderUtils.extractUrlBase(url);
    this.manager.itemStart(url);
    const fail = (error: unknown) => {
      this.manager.itemError(url);
      this.manager.itemEnd(url);
      onError?.(error);
    };
    const loader = new FileLoader(this.manager);
    loader.setPath(this.path);
    loader.setResponseType('arraybuffer');
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);
    loader.load(
      url,
      (data) => {
        void decryptModel(data as ArrayBuffer)
          .then((decoded) => this.parseAsync(decoded, resourcePath))
          .then((gltf) => {
            onLoad(gltf);
            this.manager.itemEnd(url);
          })
          .catch(fail);
      },
      onProgress,
      fail
    );
  }
}
