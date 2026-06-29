// Per-memory gallery media.
//
// Each memory id maps to its own set of photos, videos and (optional) centre
// 3D model. To add real media for a memory, drop files into
// public/galleries/<id>/photos , /videos and /posters , then list their
// public paths in the arrays below.
//
// Memories with empty arrays render placeholder tiles until files are added.

export type GalleryMedia = {
  /** Public paths to still images, e.g. '/galleries/tokyo/photos/01.jpg' */
  photos: string[];
  /** Public paths to videos, e.g. '/galleries/tokyo/videos/01.mp4' */
  videos: string[];
  /** Folder (with trailing slash) holding video poster .jpg thumbnails */
  posterDir: string;
  /** Optional GLB shown spinning in the centre of the gallery sphere */
  centerModel?: string;
};

export const DEFAULT_GALLERY: GalleryMedia = {
  photos: [],
  videos: [],
  posterDir: '',
};

export const GALLERIES: Record<string, GalleryMedia> = {
  // Poppy — fully populated (existing assets in public/poppy)
  poppy: {
    photos: [
      '/poppy/Belgian_Shepherd_Corgi_mix_dog_202606071745.jpeg',
      '/poppy/Belgian_Shepherd_Corgi_mix_dog_202606071747.jpeg',
      '/poppy/Belgian_Shepherd_Corgi_mix_run_202606071747.jpeg',
      '/poppy/Dog_looking_under_picnic_table_202606071745.jpeg',
      '/poppy/Dog_running_on_pebbled_beach_202606071747.jpeg',
      '/poppy/Dog_running_through_park_202606071745.jpeg',
      '/poppy/Dog_searching_near_tree_roots_202606071745.jpeg',
      '/poppy/Dog_splashing_in_forest_stream_202606071747.jpeg',
    ],
    videos: [
      '/poppy/Belgian_Shepherd_Corgi_mix_dog_202606071751.mp4',
      '/poppy/Dog_finds_purple_ball_202606071753.mp4',
      '/poppy/Dog_running_mountain_meadow_202606071755.mp4',
      '/poppy/Dog_running_park_finding_ball_202606071742.mp4',
      '/poppy/Dog_running_through_park_202606071750.mp4',
    ],
    posterDir: '/poppy/posters/',
    centerModel: '/models/dog_head_simple_model.glb',
  },

  // --- Placeholders: drop files into public/galleries/<id>/ then list them here ---

  tokyo: {
    photos: [], // e.g. '/galleries/tokyo/photos/01.jpg'
    videos: [], // e.g. '/galleries/tokyo/videos/01.mp4'
    posterDir: '/galleries/tokyo/posters/',
    centerModel: '/models/orange+payphone+3d+model.glb',
  },

  graduation: {
    photos: [],
    videos: [],
    posterDir: '/galleries/graduation/posters/',
    centerModel: '/models/disco_ball.glb',
  },

  'beach-day': {
    photos: [],
    videos: [],
    posterDir: '/galleries/beach-day/posters/',
    centerModel: '/models/old_tv_usssr.glb',
  },

  'first-apartment': {
    photos: [],
    videos: [],
    posterDir: '/galleries/first-apartment/posters/',
    centerModel: '/models/monalisa.glb',
  },

  riverside: {
    photos: [],
    videos: [],
    posterDir: '/galleries/riverside/posters/',
    centerModel: '/models/pancake.glb',
  },
};

export function getGallery(memoryId?: string | null): GalleryMedia {
  if (memoryId && GALLERIES[memoryId]) return GALLERIES[memoryId];
  return DEFAULT_GALLERY;
}
