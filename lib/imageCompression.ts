type ResizeImageOptions = {
  maxDimension?: number;
  quality?: number;
  minBytes?: number;
};

const defaultMaxDimension = 1800;
const defaultQuality = 0.82;
const defaultMinBytes = 450 * 1024;

function replaceExtension(name: string, extension: string) {
  const cleanName = name.replace(/\.[^.]+$/, "");
  return `${cleanName || "image"}.${extension}`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not compress image."));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

export async function resizeImageForUpload(
  file: File,
  options: ResizeImageOptions = {}
) {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml" ||
    file.size < (options.minBytes ?? defaultMinBytes)
  ) {
    return file;
  }

  const maxDimension = options.maxDimension ?? defaultMaxDimension;
  const quality = options.quality ?? defaultQuality;
  const image = await loadImageFromFile(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
  );

  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, quality);
  if (blob.size >= file.size) return file;

  return new File([blob], replaceExtension(file.name, "jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
