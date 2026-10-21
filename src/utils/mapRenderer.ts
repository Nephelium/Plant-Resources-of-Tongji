import L from "leaflet";

type ScheduledCanvas = L.Canvas & {
  _redrawRequest?: number | null;
  _redraw: () => void;
};

const canvasPrototype = L.Canvas.prototype as ScheduledCanvas;

// Leaflet 1.9.4 的 _updatePaths 会同步调用 _redraw，并清空待执行帧的 ID。
// 先取消该帧，避免窗口缩放后紧接着卸载地图时，旧帧访问已销毁的 Canvas。
// 保持原绘制流程，只有帧的生命周期由这里补全。
const FrameSafeCanvas = L.Canvas.extend({
  _redraw(this: ScheduledCanvas) {
    if (this._redrawRequest != null)
      L.Util.cancelAnimFrame(this._redrawRequest);
    canvasPrototype._redraw.call(this);
  },
}) as typeof L.Canvas;

export const createMapRenderer = () => new FrameSafeCanvas({ padding: 0.3 });
