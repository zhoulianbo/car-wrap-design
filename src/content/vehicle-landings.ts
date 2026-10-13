import type { Locale } from '@/paraglide/runtime.js';
import type { VehicleLandingContent } from '@/components/marketing/vehicle-landing-page';

import de from './vehicle-landings.de.json';
import it from './vehicle-landings.it.json';
import ko from './vehicle-landings.ko.json';

export const teslaWrapContent: Record<Locale, VehicleLandingContent> = {
  ko: ko.tesla,
  de: de.tesla,
  it: it.tesla,
  en: {
    eyebrow: 'Your car. Your color. Your style.',
    title: 'Design Your Tesla Wrap Online',
    introduction:
      'Find a Tesla wrap that feels like yours. Explore rich colors, subtle finishes and bold graphics on a 3D vehicle, then bring your favorite direction into the editor. Start with Model 3, Model Y, Cybertruck, Model S or Model X and see how a new look follows the shape of your car.',
    viewerCaption:
      'Preview your Tesla wrap with a color or image, then open the editor to create and save your design.',
    versionsTitle: 'Customize Your Tesla Wrap for Free',
    versionsDescription:
      'A great idea looks different on a compact sedan, a taller SUV or an angular truck. Choose your model and available version below to open its matching design template. Check the year and body before you begin so you can explore the proportions that matter to your car.',
    galleryTitle: 'Tesla Wrap Gallery',
    faqTitle: 'Tesla Wrap FAQ',
    galleryDescription:
      'Explore shared Tesla wrap designs for color combinations, graphic styles and a fresh perspective on familiar body lines. Open an example to inspect the artwork and its vehicle preview. Notice what catches your eye: the main color, the size of a pattern or the space left around a striking detail.',
    howTitle: 'Create a Tesla Wrap That Works from Every Angle',
    sections: [
      {
        title: 'Find your color and finish',
        paragraphs: [
          'Start your Tesla wrap with one color you would enjoy seeing every day. Deep blue can set a calm direction, a warm neutral can feel understated, and a bright accent can bring energy to a simple composition. Use the custom color control to explore your own palette. Rotate the vehicle and watch the same shade across the hood, doors and rear; those changing surfaces are part of the design.',
          'Compare gloss, satin, matte, metallic and pearlescent finishes while keeping the color consistent. Gloss gives reflections a sharper presence, while satin and matte offer softer alternatives. Metallic and pearlescent previews introduce other ways to explore light across the body. These digital choices help you narrow a visual direction before looking at real film samples. You do not need a complex pattern to create a distinctive result.',
        ],
      },
      {
        title: 'Explore Tesla wrap styles beyond a color change',
        paragraphs: [
          'A racing stripe can draw attention along the car, while geometric blocks can build contrast between broad surfaces. Flowing illustrations, contour lines and abstract textures offer a more expressive direction. Pick one idea as the focus and leave enough quiet space around it. A design often becomes easier to read when its main shape is clear from the side as well as from a front corner.',
          'Let the vehicle guide the composition. The sedan profile of Model 3 offers a different canvas from the taller sides of Model Y, and Cybertruck invites experiments with angular shapes. Model S and Model X give you further proportions to explore. Browse the gallery for inspiration, then develop a palette and arrangement of your own. Match an example to the correct template before judging how its artwork fits.',
        ],
      },
      {
        title: 'Build with your own artwork or start with AI',
        paragraphs: [
          'Open the browser editor for the selected vehicle when you are ready to build your Tesla wrap. Add your own images, create text and arrange shapes as separate layers. Position and resize those elements while reviewing the 3D result. For a business concept, uploading a logo as its own image gives you control over its placement. Keep important wording short enough to remain readable across the composition.',
          'For a new visual direction, use the AI generator with a description of the colors and pattern you want. You can also provide a reference image to guide the style. AI creates one flattened image: text, logos and graphics inside that image do not become editable objects. Add precise wording or a logo separately in the manual editor. To change details embedded in the AI artwork, revise the prompt and generate another version.',
        ],
      },
      {
        title: 'Give your favorite concept a complete review',
        paragraphs: [
          'Inspect your Tesla wrap from the front, both sides and the rear. Look at where stripes meet door edges, how an illustration crosses a wheel arch and whether the rear feels connected to the rest of the car. Take time to compare a quiet version with a bolder one. A strong concept should still feel balanced when you move away from the angle that first made you like it.',
          'Save your work in the editor so you can return to the composition. When you have a direction worth taking further, use the artwork and preview to explain it to a wrap professional. They can review the physical vehicle, film choice and production layout. The digital concept helps make that conversation clearer; measurements, print preparation and installation remain separate steps. Compare actual material samples before committing to a physical finish.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can I design a Tesla wrap online for free?',
        answer:
          'Yes. You can explore colors and finishes in the preview and use the free browser editor to build a design with your own layers. Follow the sign-in prompts when editing and saving a project. AI generation is an optional feature that uses credits. Start with the preview to find a direction, then open the editor when you want to arrange your artwork.',
      },
      {
        question: 'Which Tesla models and versions are available?',
        answer:
          'The library includes Model 3 Legacy, 2024 Base and 2024 Performance; Model Y Legacy, 2025 Base, Premium, Performance and Model Y L; Cybertruck; Model S 2021 and 2025 Plaid; and Model X 2021. Use the version cards or vehicle selector to choose the matching preview. These are the configurations represented in this studio, so check your own vehicle details when selecting a template.',
      },
      {
        question: 'Can I preview a picture I already have?',
        answer:
          'Yes. Choose a JPEG, PNG or WebP image up to 5 MB from your device. This page reads it locally in your browser, and the remove-image control or a page reload clears it. A texture prepared for the selected vehicle gives the most useful panel preview. The temporary image does not automatically transfer to the editor; add it there when you begin your project.',
      },
      {
        question:
          'What is the difference between a wrap preview and the editor?',
        answer:
          'The preview is a quick place to compare the vehicle, color, finish and an existing image. The editor is where you arrange your own text, images and shapes as independent layers and save the composition. A complete image stays a single image in either view. Letters or graphics already baked into it cannot be selected and moved individually.',
      },
      {
        question: 'How do I choose between a solid color and a graphic design?',
        answer:
          'Begin with the look you want at a glance. A single color lets the body and reflections carry the design; a stripe, illustration or geometric pattern adds another focal point. Try a restrained palette first, then introduce one accent. Compare the side and rear views as well as the front so your preferred idea works around the whole car.',
      },
      {
        question: 'Can I take my Tesla wrap design to an installer?',
        answer:
          'You can use your concept artwork to show a shop the colors, theme and placement you have in mind. Ask them to assess the actual vehicle, material and production requirements before printing. The preview does not provide a measured cutting layout or certify an installation file. It gives you a clearer design brief to discuss with the people preparing and fitting the wrap.',
      },
    ],
    ctaTitle: 'Your Next Tesla Wrap Starts with an Idea',
    ctaDescription:
      'Choose a color you love, try an unexpected pattern and see how it looks on your model. Open the editor to turn that first impression into your own Tesla wrap.',
  },
  zh: {
    eyebrow: '你的车，你的配色，你的风格',
    title: '在线设计你的专属特斯拉车衣',
    introduction:
      '从喜欢的颜色开始，为爱车找到新的模样。在线探索特斯拉车衣配色、材质与图案，在 3D 车身上比较效果，再进入编辑器完成自己的设计。无论偏爱简洁纯色，还是醒目的个性涂装，都可以从 Model 3、Model Y、Cybertruck、Model S 或 Model X 开始寻找灵感。',
    viewerCaption: '先试配色与图片效果，喜欢的方向可进入编辑器继续设计并保存。',
    versionsTitle: '免费自定义特斯拉车衣设计',
    versionsDescription:
      '同一种配色和图案，放在轿车、SUV 或棱角鲜明的皮卡上，会呈现不同气质。选择下面与你的车辆对应的版本，打开专属模板。先确认车身、年份与配置，再开始设计，能让你把注意力放在真正适合爱车的比例和细节上。',
    galleryTitle: '特斯拉车衣作品库',
    faqTitle: '特斯拉车衣常见问题',
    galleryDescription:
      '看看其他创作者如何搭配颜色、安排图案和利用车身留白。打开作品，可以进一步查看整体图案与车辆预览。先找到吸引你的细节：也许是一组大胆的撞色，也许是一条顺着车身延伸的线，再用自己的素材和构图发展出新的方向。',
    howTitle: '让特斯拉车衣从每个角度都耐看',
    sections: [
      {
        title: '先找到愿意每天看见的颜色',
        paragraphs: [
          '设计特斯拉车衣，不妨先从一种自己真正喜欢的颜色开始。深蓝可以沉稳，暖灰可以柔和，一点亮色也能让简洁车身更有活力。通过自定义颜色尝试不同色调，旋转车辆观察引擎盖、车门和车尾。相同的颜色经过不同曲面，会出现明暗和反射的变化，这些变化本身就能成为设计的一部分。',
          '保持配色不变，再比较亮光、缎面、哑光、金属和珠光五种表面效果。喜欢清晰反射，可以先看亮光；偏爱柔和光泽，可以比较缎面与哑光。金属和珠光则提供了另外的视觉方向。先在预览里缩小选择范围，再去查看真实车膜的色卡与样片。即使没有复杂图案，一种恰当的颜色也能让整车形成鲜明风格。',
        ],
      },
      {
        title: '从纯色进阶到条纹、几何与插画',
        paragraphs: [
          '想让特斯拉车衣更有个人特色，可以尝试赛车条纹、几何色块、等高线图案或流动的抽象插画。先确定一个视觉重点，再决定周围需要多少留白。条纹能够引导视线，色块可以制造对比，插画则适合表达主题。不要急着填满每一个面板，给主要图形留出空间，远看时往往更容易辨认。',
          '让车型参与构图：Model 3 的轿车轮廓适合观察线条如何前后延伸，Model Y 的侧面提供了另一种画面比例，Cybertruck 则适合尝试呼应棱角的图形。Model S 与 Model X 也有各自不同的车身形态。参考图库时，可以借鉴配色或节奏，再回到对应模板上调整自己的素材，看看灵感在你的车型上如何展开。',
        ],
      },
      {
        title: '用自己的素材创作，也可以从 AI 灵感开始',
        paragraphs: [
          '确定方向后，打开所选车型的编辑器。上传自己的图片，添加文字和形状，并作为独立图层安排位置、调整大小。需要做品牌配色方案时，可以把标志单独上传，再搭配简短名称或口号。边排版边查看 3D 效果，有助于判断重点是否清楚、图形是否太密，以及文字经过面板边缘后是否依然容易读懂。',
          '还没有具体图案时，可以让 AI 生成器根据颜色、主题或参考图片探索视觉方向。生成结果是一张完整图片，其中已有的文字、标志和图形不能逐个选中修改。需要准确的名称或标志，请在手动编辑器里另加独立图层；需要改变 AI 图片内部的细节，可以调整提示词重新生成。这样更容易分清哪些部分适合生成，哪些部分适合自己精细安排。',
        ],
      },
      {
        title: '把喜欢的方案放到整车上检查',
        paragraphs: [
          '一个让你满意的特斯拉车衣方案，值得多看几个角度。依次观察车头、左右两侧和车尾，看看线条如何经过车门边缘，插画是否被轮拱打断，后部配色能否呼应前部。也可以比较克制与大胆两种方向，想想哪一种更适合日常使用。不要只凭最漂亮的一个视角决定，让整车的视觉关系都成立，方案会更完整。',
          '在编辑器中保存项目，方便以后继续完善。准备制作实体车衣时，可以把概念图和预览效果交给施工门店，说明希望保留的配色、主题与构图重点。门店还需要核对实车尺寸、车膜材质和印刷排版，数字预览并不直接等同于施工文件。设计阶段把想法表达清楚，再结合真实样片讨论制作方案，沟通会更具体。',
        ],
      },
    ],
    faqs: [
      {
        question: '可以免费在线设计特斯拉车衣吗？',
        answer:
          '可以免费使用颜色与材质预览，也可以在浏览器编辑器里用自己的素材、文字和形状创作。编辑或保存项目时，按界面提示登录即可。AI 生成是使用积分的可选功能。你可以先在这里找到喜欢的配色，再进入编辑器安排构图，不需要一开始就决定所有细节。',
      },
      {
        question: '目前有哪些车型和版本可选？',
        answer:
          '目前包括 Model 3 初代、2024 基础版与性能版；Model Y 初代、2025 基础版、高配版、性能版与 Model Y L；以及 Cybertruck、Model S 2021、Model S 2025 Plaid 和 Model X 2021。通过车型卡片或预览选择器打开对应版本。这里列出的是工作室提供的配置，选择时请结合自己的车辆信息。',
      },
      {
        question: '已有图片可以直接放到车身上看看吗？',
        answer:
          '可以。选择设备中的 JPEG、PNG 或 WebP 图片，大小不超过 5 MB，即可在此预览。图片在浏览器本地读取，移除图片或刷新页面后会清除。按对应车型模板制作的图案更适合观察面板位置。这里临时选择的图片不会自动带入编辑器，开始正式设计时需要在编辑器中再次添加。',
      },
      {
        question: '这里的预览和编辑器有什么区别？',
        answer:
          '这里适合快速比较车型、配色、材质和已有图片；编辑器适合摆放独立素材、添加文字和形状，并保存自己的构图。完整图片在两种界面中都仍是一张图片，其中已经画好的字母或图形不会自动变成可编辑图层。需要单独控制位置的元素，请作为自己的文字或图片图层添加。',
      },
      {
        question: '纯色、条纹和大面积图案，应该怎么选？',
        answer:
          '先想想希望车辆给人的第一印象。纯色让车身轮廓和光泽成为主角，条纹能突出方向感，插画与几何图案则增加视觉重点。可以从简单配色开始，一次加入一个变化，再观察正侧面和车尾。如果缩小画面后仍能看清设计重点，通常更容易判断整车是否协调。',
      },
      {
        question: '设计完成后，可以交给门店制作吗？',
        answer:
          '可以把概念图作为沟通材料，向门店说明配色、主题和期望的图案位置。实际制作前，需要由专业人员检查车辆尺寸、材质、分块、出血和印刷要求。预览并不提供经过实车测量的裁切图，也不代表已完成施工文件验收。先确定视觉方向，再与门店一起落实制作细节。',
      },
    ],
    ctaTitle: '下一款特斯拉车衣，从你的灵感开始',
    ctaDescription:
      '选一个喜欢的颜色，试一种没尝试过的图案，在对应车型上看看效果。打开编辑器，把第一眼的心动慢慢做成自己的设计。',
  },
};

export const modelYWrapContent: Record<Locale, VehicleLandingContent> = {
  ko: ko.modelY,
  de: de.modelY,
  it: it.modelY,
  en: {
    eyebrow: 'A new look for your everyday drive',
    title: 'Design Your Tesla Model Y Wrap in 3D',
    introduction:
      'Give your everyday drive a look of its own. Explore a Tesla Model Y wrap in calm satin, deep gloss or a bold graphic style, then see it across the body in 3D. Choose your available version, try a color and build a design that feels as considered from the rear as it does from the side.',
    viewerCaption:
      'Explore colors and finishes here. Open the matching editor to arrange artwork and save.',
    versionsTitle: 'Customize Your Tesla Model Y Wrap for Free',
    versionsDescription:
      'Start with Legacy, 2025 Base, Premium, Performance or Model Y L. Each card opens the corresponding vehicle template. Choosing the right version gives your color study and graphics a more useful starting point than applying the same image to every body.',
    galleryTitle: 'Tesla Model Y Wrap Gallery',
    faqTitle: 'Tesla Model Y Wrap FAQ',
    galleryDescription:
      'Look through community designs for a palette, a stripe or an illustration that sparks an idea. Pay attention to the relationship between the front and rear doors, the wheel arches and the hatch. Open a design to explore its artwork and preview before developing your own take on the style.',
    howTitle: 'Bring Your Tesla Model Y Wrap Idea to Life',
    sections: [
      {
        title: 'Set the mood with color and finish',
        paragraphs: [
          'The broad side of Model Y gives color room to make an impression. Try a muted green, warm gray or deep blue for a restrained direction, or explore a brighter accent if you want more energy. Start with one main color and rotate the car before adding anything else. Look at the transition from the doors to the rear quarter: a shade you love in a flat swatch may feel different across those curves.',
          'Compare the five available finishes under the same preview lighting. Gloss emphasizes reflections, satin softens them and matte offers a quieter surface. Metallic and pearlescent provide other ways to explore your palette. Keep the color fixed while switching finishes so the difference is easy to judge. Once a direction stands out, compare physical film samples with a shop before deciding on an actual material.',
        ],
      },
      {
        title: 'Give the side graphic room to breathe',
        paragraphs: [
          'A Tesla Model Y wrap can use the doors as a broad canvas, but the strongest focal point does not need to fill every panel. Try a long stripe, a sequence of large geometric shapes or one illustration supported by quieter areas. Follow the composition from the front wheel to the rear, and notice where a line disappears into an arch or changes direction at a door edge.',
          'For a business or personal identity concept, keep a logo and essential wording visually separate from a busy background. Add them as your own image and text layers in the editor so you can adjust their size and position. View the result from a distance as well as close up. A clean area around important details can make the whole design easier to understand, especially when the car is seen at an angle.',
        ],
      },
      {
        title: 'Connect the hood, doors and hatch',
        paragraphs: [
          'Use a shared color or repeated shape to connect the front of the vehicle with the side and rear. A bold side pattern can be balanced by a simpler hood, while a small accent on the hatch can echo the main composition. Check both sides rather than assuming the same idea reads equally well everywhere. The rear view deserves its own moment: it should feel like part of the design, even without seeing the doors.',
          'The editor lets you arrange your own images, text and shapes in layers. If you want AI to suggest the background, describe the palette and pattern you have in mind, then review the generated image on the chosen vehicle. Its internal lettering and graphics remain part of a single image. Add exact wording separately, and generate another background when you want to change an element embedded in the AI artwork.',
        ],
      },
      {
        title: 'Develop a concept you can come back to',
        paragraphs: [
          'Before choosing your favorite Tesla Model Y wrap, compare its front, side and rear views using a consistent finish. Look for a clear focal point, comfortable spacing and colors that work together around the whole vehicle. You can start with an existing image in the preview, then add the artwork again in the editor to build your project. Save there when you want to return and continue refining the composition.',
          'When you are ready to discuss a physical wrap, use the concept to show a shop the look you want. Explain which colors, shapes and placements matter most. The installer will still need to assess the actual vehicle and prepare the measured production artwork. A digital preview is useful for choosing a direction, while real film samples and professional layout work help carry that direction into a physical installation.',
        ],
      },
    ],
    comparisonTitle: 'Choose a Starting Point for Your Model Y Version',
    comparisonDescription:
      'The studio represents the following bodies and configurations. Use your own vehicle details to choose a version, then review the artwork on its matching template. These notes describe the design previews available here rather than a complete equipment guide for every market.',
    comparisons: [
      {
        title: 'Legacy Model Y',
        description:
          'Begin with the original body template and explore how your main color meets the front and rear shapes. Check a stripe around the bumper corners before developing the rest of the side. An idea from a refreshed version can be useful inspiration, but deserves a fresh layout review here.',
      },
      {
        title: '2025 Base and Premium',
        description:
          'Choose the configuration that matches your intended preview and inspect its front, lower doors and wheel areas. The studio uses separate previews with different wheel sets. Keeping your palette consistent makes it easier to notice how the surrounding details affect the balance of the same graphic idea.',
      },
      {
        title: '2025 Performance',
        description:
          'Use the dedicated Performance preview to judge graphics around its body and wheels. A darker lower section or a small bright accent is one direction to explore. Review the rear as carefully as the front so a sporty theme carries through the entire composition.',
      },
      {
        title: 'Model Y L',
        description:
          'The longer side invites a different rhythm. Give repeated shapes enough space and reconsider where the main graphic begins and ends. Use the dedicated template to judge those proportions, rather than assuming a design arranged on the shorter body will keep the same balance.',
      },
    ],
    faqs: [
      {
        question:
          'Can I create a Tesla Model Y wrap without design experience?',
        answer:
          'Yes. Start with the color and finish controls to discover a direction, then open the matching editor when you want to add artwork. One image, a simple stripe or a small color accent can be enough for a first concept. Review it from several angles and adjust one element at a time. You can also use AI to explore an initial pattern.',
      },
      {
        question: 'Which Model Y versions can I use?',
        answer:
          'You can choose Legacy, 2025 Base, 2025 Premium, 2025 Performance and Model Y L. Each has a corresponding preview and editor template in the studio. Select the version before judging the placement of your artwork. If your configuration is not represented, use the available previews for style exploration without assuming they are an exact match for your vehicle.',
      },
      {
        question: 'Can I use a Legacy design on a newer Model Y or Model Y L?',
        answer:
          'You can explore the same visual theme, but review the layout on the destination template. Different body shapes and proportions can change where a stripe ends or how an illustration crosses a panel. For Model Y L, pay particular attention to spacing along the side. Reposition your own editable layers and inspect the whole car before saving the new composition.',
      },
      {
        question: 'Can I try my own picture before opening the editor?',
        answer:
          'Yes. The preview accepts local JPEG, PNG and WebP images up to 5 MB. A matching wrap texture is the best starting point for panel placement; a normal picture may appear split because different parts map to different body panels. The image stays local in this preview and clears on reload. Add it separately in the editor to work on a saved project.',
      },
      {
        question: 'Can I change words or logos inside an AI design?',
        answer:
          'AI output is one flattened image, so its existing letters, logos and illustrations cannot be selected independently. Use the manual editor to create your own text or upload a logo as a separate layer when exact placement matters. Those new layers can be positioned and resized. If the background itself needs changing, revise the prompt and generate a different image.',
      },
      {
        question: 'Is the preview free, and can I have the design printed?',
        answer:
          'The browser preview and manual editor are free to use; AI generation is optional and uses credits. You can take a concept to a wrap shop to discuss the look, but the preview is not a measured print layout. A professional needs to check the physical vehicle, material, resolution and panel preparation before production. Use real samples to confirm your chosen finish.',
      },
    ],
    ctaTitle: 'Make Your Tesla Model Y Wrap Your Own',
    ctaDescription:
      'Start with a subtle color or a bold pattern. Choose your version and open the editor to give the doors, hood and hatch a style that belongs together.',
  },
  zh: {
    eyebrow: '让每天的出行，多一点自己的风格',
    title: '在线设计特斯拉 Model Y 车衣',
    introduction:
      '为熟悉的日常座驾，换一个让自己心动的模样。从柔和缎面、深色亮光到醒目图案，在线探索特斯拉 Model Y 车衣，并在 3D 中观察整车效果。选择对应版本，试试喜欢的配色，让侧面、车头和车尾都有呼应，而不只是某个角度好看。',
    viewerCaption: '先在这里比较配色和材质，再进入对应编辑器排版并保存作品。',
    versionsTitle: '免费自定义特斯拉 Model Y 车衣设计',
    versionsDescription:
      '从初代、2025 基础版、高配版、性能版或 Model Y L 开始。每张卡片都会打开对应车型的编辑器与模板。先选对车身，再观察颜色和图案的位置，更容易判断一个设计是否适合自己的车辆，也方便后续继续完善构图。',
    galleryTitle: '特斯拉 Model Y 车衣作品库',
    faqTitle: '特斯拉 Model Y 车衣常见问题',
    galleryDescription:
      '浏览社区作品，寻找喜欢的配色、线条或插画主题。留意前后车门如何衔接，图案怎样经过轮拱，以及尾门是否呼应侧面。打开作品后，可以进一步查看图案和车身预览。参考吸引你的部分，再用自己的素材发展成另一种表达。',
    howTitle: '把特斯拉 Model Y 车衣灵感变成完整构图',
    sections: [
      {
        title: '用颜色与光泽确定整体气质',
        paragraphs: [
          'Model Y 的侧面为颜色提供了充分的展示空间。偏灰的绿色、暖灰或深蓝可以成为低调方案的起点；如果希望更有活力，也可以试试一小块亮色。先用一种主色旋转观察整车，尤其留意车门过渡到后翼子板的位置。同一种颜色放在平面色卡和弯曲车身上，给人的感觉可能不同，预览正适合用来比较这种差别。',
          '保持颜色不变，再切换亮光、缎面、哑光、金属和珠光。亮光让反射更突出，缎面显得柔和，哑光可以呈现更克制的视觉效果。金属与珠光则提供另外的表面观感。一次只改变一个因素，更容易看清自己究竟喜欢配色还是光泽。找到方向后，再结合实体车膜样片与门店沟通最终材质。',
        ],
      },
      {
        title: '让侧面图案有重点，也有留白',
        paragraphs: [
          '设计特斯拉 Model Y 车衣时，可以把前后车门看作一幅连续画面，但不必把每一处都填满。尝试一条长线、一组大几何图形，或以一幅插画作为主角，再用安静的背景衬托。沿着前轮到后轮观察图案，看看哪些部分被轮拱打断，哪些线条在车门边缘改变方向，逐步找到舒服的视觉节奏。',
          '如果是品牌配色或个人标志方案，尽量让名称、标志与复杂背景分开。在编辑器里把标志作为独立图片上传，再单独创建文字，就能调整各自的位置和大小。除了近距离看细节，也试着把视线放远，检查最重要的信息是否仍然清楚。重点周围的一点留白，往往比继续增加装饰更有助于形成整体感。',
        ],
      },
      {
        title: '把车头、车门与尾门连接起来',
        paragraphs: [
          '用一种共同的颜色或重复出现的形状，让各个角度互相呼应。侧面图案较丰富时，引擎盖可以简洁一些；尾门的一小块强调色，也可以延续侧面的主题。左右两侧都值得单独检查，不能只看一边就假定另一边同样协调。最后从正后方观察一次，即使看不到侧面，也应能感受到它们属于同一套设计。',
          '编辑器支持把自己添加的图片、文字和形状分层安排。想让 AI 先探索背景时，可以描述配色和图案方向，再到所选车身上查看结果。生成图片内部的字母和图形属于整张图片，不能拆开单独移动。准确的文字或标志适合另外添加为独立图层；如果要改的是 AI 背景本身，则需要调整提示词重新生成。',
        ],
      },
      {
        title: '留下值得继续完善的方案',
        paragraphs: [
          '挑选喜欢的特斯拉 Model Y 车衣方案时，尽量在相同材质下比较车头、侧面和车尾。检查视觉重点是否明确、图案之间是否有合适间距、颜色能否贯穿整车。已有图片可以先放在这里快速预览，再到编辑器里重新添加并开展正式排版。在编辑器中保存后，就可以保留构图，方便以后继续调整细节。',
          '准备制作实体车衣时，把概念图交给门店，并说清最希望保留的配色、形状和位置。专业人员还需要核对实车、选择车膜并准备符合尺寸的生产图稿。数字预览适合确定视觉方向，真实样片则有助于确认材质和颜色。把设计想法表达得具体一些，也能让后续讨论更容易围绕你在意的细节展开。',
        ],
      },
    ],
    comparisonTitle: '不同 Model Y 版本，从哪里开始构思？',
    comparisonDescription:
      '下面介绍工作室提供的车身预览与设计起点。请结合自己的车辆信息选择对应版本，再使用匹配模板检查图案。这些说明围绕设计预览展开，并不是覆盖各地区全部销售配置的车型参数表。',
    comparisons: [
      {
        title: '初代 Model Y',
        description:
          '从初代模板开始，观察主色如何经过车头和车尾的曲面。安排条纹时，可以先检查保险杠转角处的走向，再延伸到整个侧面。新款作品也能提供灵感，但放到初代车身后，仍值得重新安排并检查图案位置。',
      },
      {
        title: '2025 基础版与高配版',
        description:
          '选择你需要的预览配置，观察车头、车门下缘和轮毂周围。工作室为两个版本提供独立预览，并采用不同轮毂搭配。保持配色一致进行比较，更容易看出车身细节如何影响同一组图形的视觉平衡。',
      },
      {
        title: '2025 性能版',
        description:
          '使用性能版专属预览，检查图案与车身及轮毂的关系。可以尝试较深的下部配色，或用少量亮色突出运动感。除了车头，也看看后部构图是否延续同一主题，让整车的风格有连贯性。',
      },
      {
        title: 'Model Y L',
        description:
          '更长的侧面适合重新考虑图案节奏。给重复形状留出适当间隔，再决定主图形从哪里开始、在哪里收尾。使用专属模板观察比例，不要直接假定较短车身上的构图在这里仍然保持相同效果。',
      },
    ],
    faqs: [
      {
        question: '没有设计经验，也能尝试特斯拉 Model Y 车衣吗？',
        answer:
          '可以。先用颜色和材质控制找到喜欢的方向，准备加入图案时，再打开对应编辑器。一张图片、一条简单条纹或一小块强调色，都可以成为第一版方案。多看几个角度，一次调整一个重点，就能逐渐理清自己的偏好。需要新的图案灵感，也可以尝试 AI 生成。',
      },
      {
        question: '目前支持哪些 Model Y 版本？',
        answer:
          '目前可选初代、2025 基础版、2025 高配版、2025 性能版和 Model Y L，工作室提供对应预览与编辑器模板。请先选好版本，再判断图案的位置和比例。如果你的具体配置尚未列出，可以借助现有车身探索风格，但不要把它直接视为与实车完全匹配的模板。',
      },
      {
        question: '初代方案可以用在新款或 Model Y L 上吗？',
        answer:
          '可以沿用配色和主题，但应在目标车型的模板上重新检查排版。车身形态和比例变化，可能让条纹终点、插画位置和面板衔接发生改变。Model Y L 尤其需要检查侧面的图案间距。自行添加的独立图层可以重新定位，完成后再从整车角度判断构图是否协调。',
      },
      {
        question: '能先用自己的图片看看效果吗？',
        answer:
          '可以选择不超过 5 MB 的 JPEG、PNG 或 WebP 本地图片。对应车型的车衣贴图更适合检查面板位置；普通照片可能被分配到不同面板，看起来像被分割了。这里的图片只在浏览器本地读取，刷新后清除，也不会自动传入编辑器。需要保存项目时，请在编辑器中另外添加素材。',
      },
      {
        question: 'AI 图案里的文字和标志可以改吗？',
        answer:
          'AI 结果是一张完整图片，其中已有的文字、标志和插画不能单独选中修改。需要控制准确文字或标志位置时，请在手动编辑器里创建文字，或把标志上传为独立图片图层。这些新图层可以调整位置和大小。如果要修改的是生成背景内部的元素，需要改变提示词后重新生成。',
      },
      {
        question: '预览是否免费，设计能直接印刷吗？',
        answer:
          '浏览器预览和手动编辑器可免费使用，AI 生成是使用积分的可选功能。设计概念可以带给门店讨论，但预览不是经过实车测量的印刷排版。制作前仍需要专业人员核对车辆、材质、分辨率和分块准备，最终的颜色及光泽也应结合实物样片确认。',
      },
    ],
    ctaTitle: '开始你的特斯拉 Model Y 车衣设计',
    ctaDescription:
      '从低调纯色到大胆图案，挑一个想尝试的方向。选择对应版本，打开编辑器，让车门、引擎盖和尾门一起呈现你的风格。',
  },
};

export const model3WrapContent: Record<Locale, VehicleLandingContent> = {
  ko: ko.model3,
  de: de.model3,
  it: it.model3,
  en: {
    eyebrow: 'Clean lines. A look of your own.',
    title: 'Create Your Tesla Model 3 Wrap Online',
    introduction:
      'Find a fresh expression for a familiar silhouette. Design a Tesla Model 3 wrap with a subtle satin color, a crisp racing stripe or an illustrated theme, and explore the result in 3D. Start with Legacy, 2024 Base or 2024 Performance, then build a look that follows the car from its nose to its rear.',
    viewerCaption:
      'Try your palette on the car, then open the editor to build and save the composition.',
    versionsTitle: 'Customize Your Tesla Model 3 Wrap for Free',
    versionsDescription:
      'Choose the body you want to work with before arranging a graphic. Legacy, 2024 Base and 2024 Performance each open a matching editor template. Compare the front and rear shapes in the preview so your design begins with the right proportions.',
    galleryTitle: 'Tesla Model 3 Wrap Gallery',
    faqTitle: 'Tesla Model 3 Wrap FAQ',
    galleryDescription:
      'Explore community designs to see how a simple palette, a stripe or a full illustration changes the car’s character. Open a work to inspect its image and preview. Notice how the design handles the hood, the lower doors and the rear, then use that observation to develop your own direction.',
    howTitle: 'Shape Your Tesla Model 3 Wrap Around the Car',
    sections: [
      {
        title: 'Let a simple palette show the silhouette',
        paragraphs: [
          'Start with a color that suits the character you want: restrained, playful or more dramatic. A charcoal, warm white or muted blue can give the sedan a quiet presence, while a brighter hue shifts attention toward the body itself. Use the custom color control to explore alternatives and rotate the car as you compare. Look at how the hood, door surfaces and rear quarters reflect the same color differently.',
          'Keep that palette in place while trying gloss, satin, matte, metallic and pearlescent finishes. The finish changes the way light describes the surfaces, so the same shade can suggest several directions. You might prefer a sharp gloss reflection on a simple design or a softer satin effect with a small accent. Use the preview to choose a visual mood, then look at real film samples before selecting physical vinyl.',
        ],
      },
      {
        title: 'Use stripes and geometry with a clear direction',
        paragraphs: [
          'A Tesla Model 3 wrap can feel energetic with just a few deliberate lines. Explore a central stripe, an offset accent or a geometric block that draws the eye along the doors. Begin with a main shape and one supporting color. Follow the design from a front corner to the side and rear, checking where it meets a bumper edge or passes close to a wheel arch.',
          'For a track-inspired concept, consider the balance between the hood graphic and the side treatment. A bold front can work with quieter doors; a strong side illustration may need more space elsewhere. Add numbers or wording as separate text layers if you want to control them precisely. Review both sides in the editor, especially when a graphic has a direction, so the composition feels intentional all around the car.',
        ],
      },
      {
        title: 'Give illustrations and personal details their own space',
        paragraphs: [
          'An illustrated theme can be expressive without covering every surface equally. Choose a focal area, then repeat a color or a smaller detail elsewhere to connect the design. Bring your own artwork into the editor, adjust the image layers and create any wording separately. For a logo, use a separate uploaded image so its placement and scale remain under your control. Step back in the preview to judge the overall impression.',
          'If you are still looking for a starting pattern, describe a palette and theme in the AI generator or add a reference image. Review the resulting texture on the selected vehicle before deciding what to add. Generated lettering, logos and illustrations are pixels in one flat image, so they cannot be moved individually. For exact details, add your own layers; for a different generated composition, revise the prompt and try another image.',
        ],
      },
      {
        title: 'Check the details that connect front and rear',
        paragraphs: [
          'Review your Tesla Model 3 wrap beyond the angle that first caught your eye. Look at the hood near the lights, the lower doors, the rear quarter and the trunk area. Keep important details away from awkward panel transitions in your own layer arrangement. A small adjustment in spacing can help a stripe or illustration read more clearly. Compare the full car again after each meaningful change rather than judging only a close-up.',
          'Save the composition in the editor when it feels ready to revisit or share as a concept. If you plan to have a physical wrap made, use the artwork to explain the colors and graphic placement to a shop. They will need to check your actual vehicle, choose the material and prepare production files. The preview helps you decide on the look; it does not replace measured panel layouts, print checks or installation planning.',
        ],
      },
    ],
    comparisonTitle: 'A Design Starting Point for Each Model 3',
    comparisonDescription:
      'These are the versions represented in this studio. Match your vehicle details to the available preview, then inspect the areas that matter to your design. Use the notes to guide your composition rather than as a complete specification list for every market.',
    comparisons: [
      {
        title: 'Legacy Model 3',
        description:
          'Work with the original silhouette and its dedicated template. Check the hood and bumper edges early if your design includes stripes, repeated shapes or a large front graphic. Let the panel boundaries guide your placement so the theme continues naturally from the front into the side.',
      },
      {
        title: '2024 Base',
        description:
          'Explore the updated body using its matching preview and template. Pay attention to graphics near the lights and around the front and rear corners. A familiar palette can still work, but a layout created for the Legacy body deserves another review before you build on it.',
      },
      {
        title: '2024 Performance',
        description:
          'The Performance preview uses its own body and wheel configuration. Try the same palette here to see how contrast around the wheel areas and rear affects the overall feel. Build the graphic around what you can see in this version instead of assuming the Base composition needs no changes.',
      },
    ],
    faqs: [
      {
        question: 'How do I start a Tesla Model 3 wrap design?',
        answer:
          'Choose Legacy, 2024 Base or 2024 Performance, then try one color and a finish in the preview. Rotate the car to see whether you like the direction before adding detail. When you want to arrange images, text or shapes, open the matching editor. Starting with a simple palette gives you a clear base for a stripe, illustration or personal accent.',
      },
      {
        question: 'Can I preview the refreshed Model 3?',
        answer:
          'Yes. The studio includes 2024 Base and 2024 Performance alongside the Legacy body. Select the corresponding version to use its preview and template. Review your vehicle information when choosing: the available models are design references for the listed configurations, not a guarantee that every regional trim or later model year shares the same body details.',
      },
      {
        question: 'What colors and finishes can I try?',
        answer:
          'You can use the color controls to explore your own palette and compare gloss, satin, matte, metallic and pearlescent finishes. Try holding the color constant while changing the finish, then reverse the comparison. That makes it easier to separate a color preference from a reflection preference. The display is a visual reference; confirm actual vinyl with physical samples.',
      },
      {
        question: 'Can I use a picture or a design from the Legacy body?',
        answer:
          'The preview accepts JPEG, PNG and WebP images up to 5 MB, read locally in your browser. A matching wrap texture maps more usefully than a regular photograph. You can compare a Legacy image on another version, but recheck its layout on the target template, especially around the lights and bumpers. Add the image again in the editor when you want to build a saved project.',
      },
      {
        question: 'Can I add a logo, a number or my own wording?',
        answer:
          'Yes. In the manual editor, create text or upload a logo as an independent image layer, then adjust its size and position. These elements remain separate from a background image. Text and graphics already inside an AI-generated picture cannot be edited individually. For precise wording, ask for an AI background without lettering and add your own text afterward.',
      },
      {
        question: 'Is the tool free, and is the result ready to install?',
        answer:
          'The 3D preview and manual browser editor are free; optional AI generation uses credits. Your design can serve as a visual brief for a wrap shop. Before producing a physical wrap, the shop needs to review measurements, materials, image resolution and print layout. A concept preview is not a measured cutting file, so agree on production preparation separately.',
      },
    ],
    ctaTitle: 'Find Your Tesla Model 3 Wrap Style',
    ctaDescription:
      'Start with a color you keep coming back to. Add a line, an illustration or a personal detail, and build a design that feels right from the front bumper to the rear.',
  },
  zh: {
    eyebrow: '简洁的线条，也能拥有鲜明个性',
    title: '在线创作特斯拉 Model 3 车衣',
    introduction:
      '让熟悉的轿车轮廓，呈现新的个人风格。在线设计特斯拉 Model 3 车衣，尝试细腻缎面、利落条纹或个性插画，并在 3D 中查看效果。从初代、2024 基础版或性能版开始，让喜欢的颜色和图形顺着车身展开，从车头到车尾都有自己的表达。',
    viewerCaption: '先把配色放到车身上看看，再进入编辑器完成构图并保存。',
    versionsTitle: '免费自定义特斯拉 Model 3 车衣设计',
    versionsDescription:
      '先选择需要设计的车身，再安排图案。初代、2024 基础版和性能版都会打开各自对应的编辑器模板。通过预览比较车头与车尾的形态，让设计从合适的比例开始，也便于后续检查细节位置。',
    galleryTitle: '特斯拉 Model 3 车衣作品库',
    faqTitle: '特斯拉 Model 3 车衣常见问题',
    galleryDescription:
      '看看一组简单配色、一条条纹或一幅完整插画，如何改变整车气质。打开社区作品，进一步查看图案和车辆预览。留意引擎盖、车门下部与车尾的处理方式，找到值得借鉴的思路，再把它发展成自己的设计。',
    howTitle: '顺着车身线条，设计特斯拉 Model 3 车衣',
    sections: [
      {
        title: '用简洁配色突出轿车轮廓',
        paragraphs: [
          '先想想希望车辆呈现哪一种气质：安静、轻快，还是更有表现力。炭灰、暖白或低饱和蓝色，可以成为简洁方案的起点；更明亮的颜色，则容易把注意力引向车身本身。通过自定义颜色尝试不同方向，同时旋转车辆观察。引擎盖、车门与后翼子板对同一种颜色的呈现并不相同，这种差异也会影响整车观感。',
          '固定配色，依次看看亮光、缎面、哑光、金属与珠光的变化。材质会改变光线描绘车身的方式，让相同颜色产生不同气质。简单构图可以试试清晰亮光，少量强调色也可以搭配柔和缎面。先利用预览判断自己喜欢哪种视觉氛围，再去比较真实车膜样片，选择适合实体制作的颜色与表面效果。',
        ],
      },
      {
        title: '用条纹与几何建立方向感',
        paragraphs: [
          '一款有运动感的特斯拉 Model 3 车衣，可以从几条经过考虑的线开始。尝试居中条纹、偏置线条，或沿车门延伸的几何色块，先用一个主图形搭配一种辅助色。由斜前方转到侧面，再看车尾，检查图案如何经过保险杠边缘，以及靠近轮拱时有没有被打断。让线条的起点与终点都看起来有安排。',
          '如果喜欢赛车风格，可以比较引擎盖图案与侧面处理的轻重关系。车头很醒目时，车门可以更简洁；侧面插画较丰富时，其他区域可以多留一点空间。号码与文字适合单独创建图层，方便精确控制。带有明显方向的图案尤其需要检查左右两侧，让整个方案看起来连贯，而不只是某一面漂亮。',
        ],
      },
      {
        title: '给插画和个人标记留出空间',
        paragraphs: [
          '插画主题不必平均覆盖所有面板。先选择一个重点区域，再把其中的颜色或小元素带到其他位置，形成呼应。把自己的作品导入编辑器，调整图片图层，再单独添加需要的文字。标志也可以作为独立图片上传，方便控制位置和大小。除了近看细节，也从整车尺度观察一次，判断最想表达的主题是否清楚。',
          '还没有具体图案时，可以在 AI 生成器里描述配色和主题，也可以上传参考图片帮助表达风格。生成后先在对应车型上查看，再决定要加哪些个人细节。图片里已有的文字、标志和插画是同一张图的一部分，不能逐个移动。准确细节适合另外添加为自己的图层，想改变生成构图本身时，则调整提示词重新尝试。',
        ],
      },
      {
        title: '让车头到车尾的细节彼此呼应',
        paragraphs: [
          '检查特斯拉 Model 3 车衣时，可以从最吸引你的视角开始，再依次看看灯组附近、车门下缘、后翼子板和后备厢区域。自行排版时，尽量让重要元素避开不自然的面板转折。有时只需调整一点间距，就能让条纹或插画更清楚。每次做了明显改动，都回到整车视角看一次，避免局部越改越精细，整体却失去平衡。',
          '满意后在编辑器里保存构图，方便以后继续修改。计划制作实体车衣时，可以把图案作为沟通材料，向门店说明喜欢的配色与位置。对方仍需要检查实车、选择材料并准备生产文件。预览帮助确定外观方向，实测面板、印刷检查和施工准备则由专业人员完成。先把视觉想法定下来，后续讨论会更明确。',
        ],
      },
    ],
    comparisonTitle: '不同 Model 3 版本，各有怎样的设计起点？',
    comparisonDescription:
      '下面是工作室当前提供的版本。请根据车辆信息选择对应预览，再重点检查与自己图案有关的区域。这些说明用于帮助构图，并不代替各地区完整的车型配置资料。',
    comparisons: [
      {
        title: '初代 Model 3',
        description:
          '围绕初代车身轮廓和专属模板展开设计。如果喜欢条纹、重复图形或大面积前部图案，可以先检查引擎盖与保险杠边缘。顺着面板关系安排位置，再把主题延续到侧面，有助于形成自然的整体节奏。',
      },
      {
        title: '2024 基础版',
        description:
          '使用新款车身对应的预览和模板，重点留意灯组附近以及前后部转角的图案。熟悉的配色依然可以继续探索，但初代模板上的排版值得重新检查。先确认位置，再逐步加入细节，比直接沿用整张构图更容易判断效果。',
      },
      {
        title: '2024 性能版',
        description:
          '性能版预览使用对应车身与轮毂配置。可以保持配色一致，比较轮毂周围的对比和车尾布局如何改变整车感觉。围绕这个版本实际展示的形态安排图形，重点检查它与基础版构图之间需要调整的地方。',
      },
    ],
    faqs: [
      {
        question: '第一次设计特斯拉 Model 3 车衣，应该怎么开始？',
        answer:
          '先选择初代、2024 基础版或性能版，再尝试一种颜色和一种材质。旋转整车，确认喜欢这个方向之后，再增加细节。需要摆放图片、文字或形状时，打开对应编辑器。简单配色可以作为清晰的底子，随后加上条纹、插画或一个个人标记，逐步形成完整方案。',
      },
      {
        question: '可以预览焕新版 Model 3 吗？',
        answer:
          '可以。工作室在初代车身之外，还提供 2024 基础版和 2024 性能版的预览与模板。选择时请结合自己的车辆信息。现有模型用于对应配置的设计参考，并不保证所有地区版本或后续年份都采用完全相同的车身细节，具体排版仍应在合适的模板上检查。',
      },
      {
        question: '有哪些颜色和材质可以尝试？',
        answer:
          '可以通过颜色控制探索自己的配色，再比较亮光、缎面、哑光、金属和珠光。建议先固定颜色切换材质，再固定材质尝试不同颜色，这样更容易分清自己喜欢的是色调还是反射效果。屏幕预览用于寻找视觉方向，实际购买车膜时，仍应结合真实样片判断。',
      },
      {
        question: '自己的图片或初代车身图案可以导入吗？',
        answer:
          '可以选择不超过 5 MB 的 JPEG、PNG 或 WebP 图片，预览会在浏览器本地读取。匹配车型的车衣贴图比普通照片更适合查看面板分布。初代图案也可以放到其他版本上比较，但需要重新检查目标模板，尤其是灯组和保险杠附近。正式保存项目时，请在编辑器里再次添加图片。',
      },
      {
        question: '可以加标志、号码和自己的文字吗？',
        answer:
          '可以在手动编辑器里创建文字，或者把标志作为独立图片上传，再调整位置和大小。这些元素与背景图片分开。已经画在 AI 生成图片里的字母、标志和图形不能单独编辑。如果希望文字准确，可以先生成不带字的背景，再用自己的文字图层完成表达。',
      },
      {
        question: '工具是否免费，结果能直接用于施工吗？',
        answer:
          '3D 预览和浏览器手动编辑器可免费使用，AI 生成是使用积分的可选功能。完成的概念图可以帮助门店理解设计想法。实体制作前，门店还需要检查尺寸、材质、图像分辨率和印刷排版。预览不是经过实测的裁切文件，因此施工准备需要另外确认。',
      },
    ],
    ctaTitle: '找到你的特斯拉 Model 3 车衣风格',
    ctaDescription:
      '从一个越看越喜欢的颜色开始，加上一条线、一幅插画，或一个属于自己的标记。打开编辑器，让设计从前保险杠到车尾都经得起细看。',
  },
};
