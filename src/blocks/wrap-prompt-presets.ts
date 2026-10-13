import { m } from '@/paraglide/messages.js';
import type { PromptPreset } from '@/components/wrap-generation-controls';

export function wrapPromptPresets(): PromptPreset[] {
  return [
    {
      label: m['generator.idea_sunset'](),
      prompt: m['generator.idea_sunset_prompt'](),
    },
    {
      label: m['generator.idea_gold'](),
      prompt: m['generator.idea_gold_prompt'](),
    },
    {
      label: m['generator.idea_flames'](),
      prompt: m['generator.idea_flames_prompt'](),
    },
    {
      label: m['generator.idea_space'](),
      prompt: m['generator.idea_space_prompt'](),
    },
    {
      label: m['generator.idea_sakura'](),
      prompt: m['generator.idea_sakura_prompt'](),
    },
    {
      label: m['generator.idea_neon'](),
      prompt: m['generator.idea_neon_prompt'](),
    },
    {
      label: m['generator.idea_camo'](),
      prompt: m['generator.idea_camo_prompt'](),
    },
    {
      label: m['generator.idea_porcelain'](),
      prompt: m['generator.idea_porcelain_prompt'](),
    },
    {
      label: m['generator.chip_ocean'](),
      prompt: m['generator.chip_ocean_prompt'](),
    },
    {
      label: m['generator.chip_racing'](),
      prompt: m['generator.chip_racing_prompt'](),
    },
    {
      label: m['generator.chip_contours'](),
      prompt: m['generator.chip_contours_prompt'](),
    },
  ];
}
