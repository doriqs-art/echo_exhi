export type MemoryEntry = {
  id: string;
  name: string;
  date: string;
  cover: string;
  mediaCount: number;
  tagline: string;
  prompt: string;
};

export const MEMORIES: MemoryEntry[] = [
  {
    id: 'tokyo',
    name: 'ECHO 01',
    date: 'April 2024',
    cover: '/poppy/Dog_running_through_park_202606071745.jpeg',
    mediaCount: 24,
    tagline: 'ECHO 01 _ Information',
    prompt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
  {
    id: 'poppy',
    name: 'Poppy',
    date: 'March 2024',
    cover: '/poppy/Belgian_Shepherd_Corgi_mix_dog_202606071745.jpeg',
    mediaCount: 18,
    tagline: 'The one who waited by the door.',
    prompt: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    id: 'graduation',
    name: 'ECHO 02',
    date: 'June 2023',
    cover: '/poppy/Dog_looking_under_picnic_table_202606071745.jpeg',
    mediaCount: 9,
    tagline: 'ECHO 02 _ Information',
    prompt: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },
  {
    id: 'beach-day',
    name: 'ECHO 03',
    date: 'August 2023',
    cover: '/poppy/Dog_running_on_pebbled_beach_202606071747.jpeg',
    mediaCount: 12,
    tagline: 'ECHO 03 _ Information',
    prompt: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    id: 'first-apartment',
    name: 'ECHO 04',
    date: 'February 2023',
    cover: '/poppy/Dog_searching_near_tree_roots_202606071745.jpeg',
    mediaCount: 7,
    tagline: 'ECHO 04 _ Information',
    prompt: 'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.',
  },
  {
    id: 'riverside',
    name: 'ECHO 05',
    date: 'May 2023',
    cover: '/poppy/Dog_splashing_in_forest_stream_202606071747.jpeg',
    mediaCount: 7,
    tagline: 'ECHO 05 _ Information',
    prompt: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Donec velit neque.',
  },
  {
    id: 'first-snow',
    name: 'ECHO 06',
    date: 'December 2021',
    cover: '/poppy/Belgian_Shepherd_Corgi_mix_run_202606071747.jpeg',
    mediaCount: 14,
    tagline: 'ECHO 06 _ Information',
    prompt: 'Curabitur aliquet quam id dui posuere blandit. Nulla porttitor accumsan tincidunt. Praesent sapien massa.',
  },
  {
    id: 'road-trip',
    name: 'ECHO 07',
    date: 'July 2022',
    cover: '/poppy/Belgian_Shepherd_Corgi_mix_dog_202606071747.jpeg',
    mediaCount: 21,
    tagline: 'ECHO 07 _ Information',
    prompt: 'Mauris blandit aliquet elit, eget tincidunt nibh pulvinar a. Vivamus suscipit tortor eget felis porttitor.',
  },
  {
    id: 'grandma',
    name: 'ECHO 08',
    date: 'September 2021',
    cover: '/poppy/Dog_running_through_park_202606071745.jpeg',
    mediaCount: 16,
    tagline: 'ECHO 08 _ Information',
    prompt: 'Quisque velit nisi, pretium ut lacinia in, elementum id enim. Cras ultricies ligula sed magna dictum porta.',
  },
  {
    id: 'new-year',
    name: 'ECHO 09',
    date: 'January 2022',
    cover: '/poppy/Dog_running_on_pebbled_beach_202606071747.jpeg',
    mediaCount: 10,
    tagline: 'ECHO 09 _ Information',
    prompt: 'Nulla quis lorem ut libero malesuada feugiat. Proin eget tortor risus. Donec rutrum congue leo eget malesuada.',
  },
];
