import * as Manipulator from 'expo-image-manipulator';

// Shrinks a picked photo to about 1080px wide at 60% quality (roughly 150-400 KB).
// If shrinking fails, the original is used so posting never gets blocked.
export async function shrink(asset, maxWidth = 1080) {
  try {
    const tooBig = !asset.width || asset.width > maxWidth;
    if (Manipulator.ImageManipulator?.manipulate) {
      const ctx = Manipulator.ImageManipulator.manipulate(asset.uri);
      if (tooBig) ctx.resize({ width: maxWidth });
      const image = await ctx.renderAsync();
      const out = await image.saveAsync({ compress: 0.6, format: Manipulator.SaveFormat.JPEG });
      return { ...asset, uri: out.uri, width: out.width, height: out.height };
    }
    const out = await Manipulator.manipulateAsync(
      asset.uri,
      tooBig ? [{ resize: { width: maxWidth } }] : [],
      { compress: 0.6, format: Manipulator.SaveFormat.JPEG }
    );
    return { ...asset, uri: out.uri, width: out.width, height: out.height };
  } catch (e) {
    console.warn('shrink failed, using original photo:', e.message);
    return asset;
  }
}
