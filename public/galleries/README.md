# Per-memory gallery media

Each memory has its own folder here. Drop files in, then list their public
paths in `src/lib/galleries.ts` under the matching memory id.

```
galleries/
  <memory-id>/
    photos/    <- .jpg / .jpeg / .png stills
    videos/    <- .mp4 videos
    posters/   <- one .jpg thumbnail per video (same base filename as the .mp4)
```

## Steps to add media for a memory

1. Copy your stills into `galleries/<id>/photos/`.
2. Copy your videos into `galleries/<id>/videos/`.
3. For each video, add a poster image into `galleries/<id>/posters/` with the
   SAME base name (e.g. `clip01.mp4` -> `posters/clip01.jpg`).
4. Open `src/lib/galleries.ts` and list the public paths, e.g.:

   ```ts
   tokyo: {
     photos: ['/galleries/tokyo/photos/01.jpg'],
     videos: ['/galleries/tokyo/videos/clip01.mp4'],
     posterDir: '/galleries/tokyo/posters/',
     centerModel: '/models/orange+payphone+3d+model.glb',
   },
   ```

Memories left with empty `photos` / `videos` arrays show placeholder tiles.

Current memory ids: `tokyo`, `poppy`, `graduation`, `beach-day`,
`first-apartment`, `riverside`. (Poppy already uses the existing
`public/poppy/` assets.)
