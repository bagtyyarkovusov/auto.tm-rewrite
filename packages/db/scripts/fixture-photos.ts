/**
 * Photo sources for the local UI evaluation fixture.
 *
 * Every entry is a Wikimedia Commons file under a Creative Commons licence.
 * The bytes are deliberately **not** committed: `ui-fixture.ts` downloads them
 * at seed time into a gitignored cache and uploads them to the local MinIO.
 * That keeps a CC BY-SA corpus out of the repository (and out of any app
 * binary), which matters because share-alike obligations would otherwise
 * attach to whatever we shipped them in. These are development fixtures for
 * evaluating the mobile UI on an emulator — not product or marketing assets.
 *
 * Each photo was opened and visually checked before being listed here, and the
 * listing data in `ui-fixture.ts` (model, colour, body type, drivetrain) was
 * written to match what the photo actually shows. Do not repoint a URL without
 * re-checking the image and updating the listing that uses it.
 */
export type FixturePhoto = {
  readonly url: string;
  readonly sourceFile: string;
  readonly license: string;
  readonly author: string;
};

export const FIXTURE_PHOTOS: Record<string, FixturePhoto> = {
  "camry-beige": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/TOYOTA_CAMRY_%28XV70%29_China.jpg/1920px-TOYOTA_CAMRY_%28XV70%29_China.jpg",
    sourceFile: "TOYOTA CAMRY (XV70) China.jpg",
    license: "CC BY-SA 4.0",
    author: "Dinkun Chen",
  },
  "camry-red": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/TOYOTA_CAMRY_%28XV70%29_China_%282%29.jpg/1920px-TOYOTA_CAMRY_%28XV70%29_China_%282%29.jpg",
    sourceFile: "TOYOTA CAMRY (XV70) China (2).jpg",
    license: "CC BY-SA 4.0",
    author: "Dinkun Chen",
  },
  "corolla-silver": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d0/TOYOTA_COROLLA_SEDAN_HYBRID_%28E210%29_China.jpg/1920px-TOYOTA_COROLLA_SEDAN_HYBRID_%28E210%29_China.jpg",
    sourceFile: "TOYOTA COROLLA SEDAN HYBRID (E210) China.jpg",
    license: "CC BY-SA 4.0",
    author: "Dinkun Chen",
  },
  "prado-white": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/2018_Toyota_Land_Cruiser_Prado_%28GDJ150R%29_VX_4WD_wagon_%282018-07-19%29_01.jpg/1920px-2018_Toyota_Land_Cruiser_Prado_%28GDJ150R%29_VX_4WD_wagon_%282018-07-19%29_01.jpg",
    sourceFile: "2018 Toyota Land Cruiser Prado (GDJ150R) VX 4WD wagon (2018-07-19) 01.jpg",
    license: "CC BY-SA 4.0",
    author: "EurovisionNim",
  },
  "sonata-white": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/2020_Hyundai_Sonata_SEL_%28Quartz_White%29%2C_front_right.jpg/1920px-2020_Hyundai_Sonata_SEL_%28Quartz_White%29%2C_front_right.jpg",
    sourceFile: "2020 Hyundai Sonata SEL (Quartz White), front right.jpg",
    license: "CC BY-SA 3.0",
    author: "Mr.choppers",
  },
  "sportage-silver-front": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/00_Kia_Sportage_%28QL%29_1.jpg/1920px-00_Kia_Sportage_%28QL%29_1.jpg",
    sourceFile: "00 Kia Sportage (QL) 1.jpg",
    license: "CC BY-SA 4.0",
    author: "Benespit",
  },
  "sportage-silver-rear": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/00_Kia_Sportage_%28QL%29_2.jpg/1920px-00_Kia_Sportage_%28QL%29_2.jpg",
    sourceFile: "00 Kia Sportage (QL) 2.jpg",
    license: "CC BY-SA 4.0",
    author: "Benespit",
  },
  "eclass-black": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/MERCEDES-BENZ_E_CLASS_LWB_%28V213%29_China_%283%29.jpg/1920px-MERCEDES-BENZ_E_CLASS_LWB_%28V213%29_China_%283%29.jpg",
    sourceFile: "MERCEDES-BENZ E CLASS LWB (V213) China (3).jpg",
    license: "CC BY-SA 4.0",
    author: "Dinkun Chen",
  },
  "eclass-white": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/MERCEDES-BENZ_E_CLASS_LWB_%28V213%29_China_%289%29.jpg/1920px-MERCEDES-BENZ_E_CLASS_LWB_%28V213%29_China_%289%29.jpg",
    sourceFile: "MERCEDES-BENZ E CLASS LWB (V213) China (9).jpg",
    license: "CC BY-SA 4.0",
    author: "Dinkun Chen",
  },
  "lx-black": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Lexus_LX_570_%28URJ201W%29_IMG_4913.jpg/1920px-Lexus_LX_570_%28URJ201W%29_IMG_4913.jpg",
    sourceFile: "Lexus LX 570 (URJ201W) IMG 4913.jpg",
    license: "CC BY-SA 4.0",
    author: "Alexander Migl",
  },
  "lx-white": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/LEXUS_LX_570_%28200%29_China.jpg/1920px-LEXUS_LX_570_%28200%29_China.jpg",
    sourceFile: "LEXUS LX 570 (200) China.jpg",
    license: "CC BY-SA 4.0",
    author: "Dinkun Chen",
  },
  "hilux-red": {
    url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/2019_Toyota_Hilux_SR.jpg/1920px-2019_Toyota_Hilux_SR.jpg",
    sourceFile: "2019 Toyota Hilux SR.jpg",
    license: "CC BY-SA 2.0",
    author: "RL GNZLZ",
  },
};

export type FixturePhotoSlug = keyof typeof FIXTURE_PHOTOS;
