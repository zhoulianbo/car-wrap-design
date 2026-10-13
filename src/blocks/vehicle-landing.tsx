import type { VehicleSlug } from '@/lib/vehicle-catalog';
import type { PublicDesignSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import {
  VehicleLandingPage,
  type VehicleLandingContent,
} from '@/components/marketing/vehicle-landing-page';

export function VehicleLanding({
  path,
  content,
  vehicleSlug,
  vehicles,
  initialDesigns,
}: {
  initialDesigns?: PublicDesignSummary[] | null;
  path: string;
  content: VehicleLandingContent;
  vehicleSlug: VehicleSlug;
  vehicles: Array<{
    slug: VehicleSlug;
    label: string;
    note?: string;
    image?: string;
  }>;
}) {
  return (
    <VehicleLandingPage
      locale={getLocale()}
      initialDesigns={initialDesigns}
      path={path}
      content={content}
      vehicleSlug={vehicleSlug}
      vehicles={vehicles}
      labels={{
        home: m['common.systems.home'](),
        openDesigner: m['landing.vehicle.open_designer'](),
        seeIdeas: m['landing.vehicle.see_ideas'](),
        designThis: m['landing.vehicle.design_this'](),
        questions: content.faqTitle,
        start: m['landing.vehicle.start'](),
        ctaEyebrow: m['landing.cta.eyebrow'](),
        loading: m['landing.vehicle.loading'](),
        imageError: m['landing.vehicle.image_error'](),
        imageLoading: m['landing.vehicle.image_loading'](),
        viewer: {
          loadingDescription: m['viewer.description'](),
          loadingModel: m['viewer.loading_model'](),
          vehicleDescription: (model, year) =>
            m['viewer.vehicle_description']({ model, year }),
          pause: m['viewer.pause'](),
          play: m['viewer.play'](),
          reset: m['viewer.reset'](),
          fullscreen: m['viewer.fullscreen'](),
          screenshot: m['viewer.screenshot'](),
          exitFullscreen: m['landing.vehicle.exit_fullscreen'](),
          fullscreenError: m['landing.vehicle.fullscreen_error'](),
          customColor: m['landing.vehicle.custom_color'](),
          selectVehicle: m['landing.vehicle.select_vehicle'](),
          chooseImage: m['landing.vehicle.choose_image'](),
          removeImage: m['landing.vehicle.remove_image'](),
          color: (color) => m['viewer.color']({ color }),
          finishes: {
            gloss: m['viewer.finish.gloss'](),
            satin: m['viewer.finish.satin'](),
            matte: m['viewer.finish.matte'](),
            metallic: m['viewer.finish.metallic'](),
            pearlescent: m['viewer.finish.pearlescent'](),
          },
        },
      }}
    />
  );
}
