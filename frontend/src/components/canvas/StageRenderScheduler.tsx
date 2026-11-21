import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';

/** Demand frames keep rendering independent of playback clocks. */
export function StageRenderScheduler({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const { invalidate, gl } = useThree();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const schedule = () => {
      clearInterval(timer);
      if (document.hidden || gl.getContext().isContextLost()) return;
      invalidate();
      if (!reducedMotion) timer = setInterval(invalidate, document.hasFocus() ? 1000 / 30 : 250);
    };
    const oldShaderError = gl.debug.onShaderError;
    gl.debug.onShaderError = () => setFailed(true);
    const events: Array<[EventTarget, string]> = [[document, 'visibilitychange'], [window, 'focus'], [window, 'blur'], [gl.domElement, 'webglcontextlost'], [gl.domElement, 'webglcontextrestored']];
    events.forEach(([target, event]) => target.addEventListener(event, schedule)); schedule();
    return () => { clearInterval(timer); gl.debug.onShaderError = oldShaderError; events.forEach(([target, event]) => target.removeEventListener(event, schedule)); };
  }, [invalidate, gl, reducedMotion]);
  if (failed) throw new Error('Visual shader failed to compile');
  return null;
}
