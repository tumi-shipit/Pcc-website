export function getTournamentGalleryStoragePath(imageUrl: string) {
  const marker = "/storage/v1/object/public/tournament-gallery/";
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) return null;

  const pathWithQuery = imageUrl.slice(markerIndex + marker.length);
  const path = pathWithQuery.split("?")[0];

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
