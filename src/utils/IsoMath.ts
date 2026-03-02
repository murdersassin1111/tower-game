import { ISO } from '../config';
import type { Vec2 } from '../types';

export const IsoMath = {
  /**
   * Convert isometric world coords to screen coords
   * Standard 2:1 isometric projection
   */
  toScreen(isoX: number, isoY: number, isoZ: number = 0): Vec2 {
    const tw = ISO.TILE_W;
    const th = ISO.TILE_H;
    const screenX = (isoX - isoY) * (tw / 2);
    const screenY = (isoX + isoY) * (th / 2) - isoZ * ISO.CUBE_H;
    return { x: screenX, y: screenY };
  },

  /** Get depth sort value (higher = drawn on top) */
  getDepth(isoX: number, isoY: number, isoZ: number = 0): number {
    return isoX + isoY - isoZ * 0.01;
  },

  /** Draw a filled isometric cube face using Phaser Graphics */
  drawCubeTop(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number) {
    // Top face: diamond/rhombus shape
    g.fillPoints([
      { x: cx,     y: cy - h },      // top
      { x: cx + w, y: cy },          // right
      { x: cx,     y: cy + h },      // bottom
      { x: cx - w, y: cy },          // left
    ], true);
  },

  drawCubeLeft(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, faceH: number) {
    // Left face
    g.fillPoints([
      { x: cx - w, y: cy },          // top-left
      { x: cx,     y: cy + h },      // top-right
      { x: cx,     y: cy + h + faceH },  // bottom-right
      { x: cx - w, y: cy + faceH },  // bottom-left
    ], true);
  },

  drawCubeRight(g: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, faceH: number) {
    // Right face
    g.fillPoints([
      { x: cx,     y: cy + h },      // top-left
      { x: cx + w, y: cy },          // top-right
      { x: cx + w, y: cy + faceH },  // bottom-right
      { x: cx,     y: cy + h + faceH },  // bottom-left
    ], true);
  },

  /** Draw complete cube at center position cx,cy (cy is the topmost point) */
  drawCube(
    g: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    w: number, h: number, faceH: number,
    colorTop: number, colorLeft: number, colorRight: number,
    alpha: number = 1,
    edgeColor: number = 0x4ade80,
    edgeAlpha: number = 0.4
  ) {
    g.fillStyle(colorTop, alpha);
    IsoMath.drawCubeTop(g, cx, cy + h, w, h);

    g.fillStyle(colorLeft, alpha * 0.75);
    IsoMath.drawCubeLeft(g, cx, cy + h, w, h, faceH);

    g.fillStyle(colorRight, alpha * 0.55);
    IsoMath.drawCubeRight(g, cx, cy + h, w, h, faceH);

    // Edges
    g.lineStyle(1, edgeColor, edgeAlpha);
    // Top face outline
    g.strokePoints([
      { x: cx,     y: cy + h - h },
      { x: cx + w, y: cy + h },
      { x: cx,     y: cy + h + h },
      { x: cx - w, y: cy + h },
    ], true);
  },
};

export default IsoMath;
