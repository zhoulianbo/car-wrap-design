/** Provider contract fixtures only; never contacts Kie or spends credits. */
import assert from 'node:assert/strict';

import { KieProvider } from '../src/core/ai/kie';
import { AIMediaType, AITaskStatus } from '../src/core/ai/types';

const originalFetch = globalThis.fetch;
const provider = new KieProvider({ apiKey: 'fixture-only' });
let payload: any;
try {
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.kie.ai/api/v1/jobs/createTask');
    assert.equal(init?.method, 'POST');
    payload = JSON.parse(String(init?.body));
    return Response.json({ code: 200, data: { taskId: 'fixture-task' } });
  };
  for (const model of [
    'gpt-image-2-5-sunburst-image-to-image',
    'gpt-image-2-5-flare-image-to-image',
    'legacy-fixture',
  ]) {
    const result = await provider.generate({
      params: {
        model,
        mediaType: AIMediaType.IMAGE,
        prompt: 'Preserve the first reference layout.',
        options: {
          image_input: [
            'https://fixture.invalid/uv.png',
            'https://fixture.invalid/style.png',
          ],
          background: 'transparent',
          aspect_ratio: '1:1',
          resolution: '1K',
          output_format: 'png',
        },
      },
    });
    assert.equal(result.taskId, 'fixture-task');
    assert.equal(result.taskStatus, AITaskStatus.PENDING);
    const isLegacy = model === 'legacy-fixture';
    assert.deepEqual(payload.input[isLegacy ? 'image_input' : 'input_urls'], [
      'https://fixture.invalid/uv.png',
      'https://fixture.invalid/style.png',
    ]);
    assert.equal(
      payload.input[isLegacy ? 'input_urls' : 'image_input'],
      undefined
    );
    assert.equal(
      payload.input.background,
      isLegacy ? undefined : 'transparent'
    );
    assert.equal(payload.input.output_format, isLegacy ? 'png' : undefined);
    assert.equal(
      payload.callBackUrl,
      undefined,
      'local generation needs no callback'
    );
  }
  for (const [state, status] of [
    ['waiting', AITaskStatus.PENDING],
    ['queuing', AITaskStatus.PENDING],
    ['generating', AITaskStatus.PROCESSING],
    ['success', AITaskStatus.SUCCESS],
    ['fail', AITaskStatus.FAILED],
  ] as const) {
    globalThis.fetch = async (url) => {
      assert.equal(
        String(url),
        'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=fixture-task'
      );
      return Response.json({
        code: 200,
        data: {
          state,
          createTime: 0,
          resultJson:
            state === 'success'
              ? JSON.stringify({
                  resultUrls: ['https://fixture.invalid/output.png'],
                })
              : null,
          failCode: state === 'fail' ? '500' : null,
          failMsg: state === 'fail' ? 'Fixture failure' : null,
        },
      });
    };
    const result = await provider.query({
      taskId: 'fixture-task',
      mediaType: AIMediaType.IMAGE,
    });
    assert.equal(result.taskStatus, status);
    if (state === 'success')
      assert.equal(
        result.taskInfo?.images?.[0].imageUrl,
        'https://fixture.invalid/output.png'
      );
    if (state === 'fail')
      assert.equal(result.taskInfo?.errorMessage, 'Fixture failure');
  }
  console.log(
    'PASS: Kie reference field/order, transparent background, legacy compatibility, local polling, success and failure parsing.'
  );
} finally {
  globalThis.fetch = originalFetch;
}
