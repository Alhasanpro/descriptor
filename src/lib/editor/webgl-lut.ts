export function resetLutPixelStore(gl: WebGL2RenderingContext) {
  gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
  gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0);
  gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
  gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 0);
}

function clearWebGlErrors(gl: WebGL2RenderingContext) {
  for (let count = 0; count < 32; count += 1) {
    if (gl.getError() === gl.NO_ERROR) return;
  }
  throw new Error("WebGL remained in an invalid state before the LUT upload.");
}

export function createLutTexture(gl: WebGL2RenderingContext, rgba: Uint8Array, size: number) {
  if (!Number.isInteger(size) || size < 2 || size > 65 || rgba.length !== size * size * size * 4) throw new Error("The generated preview LUT is incomplete.");
  const texture = gl.createTexture();
  if (!texture) throw new Error("The color preview texture could not be created.");

  try {
    resetLutPixelStore(gl);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    clearWebGlErrors(gl);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL rejected the color preview texture (error ${error}).`);
    return texture;
  } catch (error) {
    gl.deleteTexture(texture);
    throw error;
  }
}
