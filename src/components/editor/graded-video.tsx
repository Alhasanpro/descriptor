"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { CubeLut } from "@/lib/editor/cube-lut";
import type { ColorGradeSettings } from "@/lib/editor/types";
import { createLutTexture } from "@/lib/editor/webgl-lut";

type PreviewState = "checking" | "ready" | "unavailable" | "error";
type LutWorkerRequest = {
  id: number;
  settings: ColorGradeSettings;
  lut?: { title?: string; size: number; domainMin: [number, number, number]; domainMax: [number, number, number]; values: ArrayBuffer };
};
type LutWorkerResult = { id: number; size?: number; rgba?: ArrayBuffer; error?: string };

const vertexSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler2D uVideo;
uniform sampler3D uLut;
uniform float uLutSize;
uniform float uVignette;
uniform float uBefore;
uniform float uAspect;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 source = texture(uVideo, vUv).rgb;
  if (uBefore > 0.5) {
    outColor = vec4(source, 1.0);
    return;
  }
  float inset = 0.5 / uLutSize;
  vec3 lookup = clamp(source, 0.0, 1.0) * (1.0 - 2.0 * inset) + inset;
  vec3 graded = texture(uLut, lookup).rgb;
  vec2 centered = (vUv - 0.5) * vec2(max(1.0, uAspect), 1.0);
  float edge = smoothstep(0.28, 0.78, length(centered));
  graded *= 1.0 - edge * uVignette * 0.62;
  outColor = vec4(graded, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader could not be created.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "WebGL shader could not compile.");
  return shader;
}

export function GradedVideo({ videoRef, src, grade, sourceLut, before, onStateChange, onPlay, onPause, onEnded }: { videoRef: RefObject<HTMLVideoElement | null>; src: string; grade: ColorGradeSettings; sourceLut?: CubeLut; before: boolean; onStateChange: (state: PreviewState) => void; onPlay: () => void; onPause: () => void; onEnded: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<{ gl: WebGL2RenderingContext; program: WebGLProgram; videoTexture: WebGLTexture; lutTexture: WebGLTexture; lutSize: number; frame: number | null; videoFrame: number | null; render: () => void } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRequestRef = useRef<LutWorkerRequest | null>(null);
  const workerBusyRef = useRef(false);
  const flushWorkerRef = useRef<() => void>(() => undefined);
  const gradeRef = useRef(grade);
  const beforeRef = useRef(before);
  const [appliedRequestId, setAppliedRequestId] = useState(0);
  const [previewState, setPreviewState] = useState<PreviewState>("checking");

  useEffect(() => { onStateChange(previewState); }, [onStateChange, previewState]);

  useEffect(() => {
    gradeRef.current = grade;
    beforeRef.current = before;
    runtimeRef.current?.render();
  }, [before, grade]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) { queueMicrotask(() => setPreviewState("unavailable")); return; }
    try {
      const program = gl.createProgram();
      const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
      const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
      if (!program) throw new Error("WebGL program could not be created.");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "WebGL program could not link.");
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const videoTexture = gl.createTexture();
      if (!videoTexture) throw new Error("WebGL textures could not be created.");
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, "uVideo"), 0);
      const lutTexture = createLutTexture(gl, new Uint8Array([0,0,0,255,255,0,0,255,0,255,0,255,255,255,0,255,0,0,255,255,255,0,255,255,0,255,255,255,255,255,255,255]), 2);
      gl.uniform1i(gl.getUniformLocation(program, "uLut"), 1);
      gl.uniform1f(gl.getUniformLocation(program, "uLutSize"), 2);
      const render = () => {
        const runtime = runtimeRef.current;
        const currentVideo = videoRef.current;
        if (!runtime || !currentVideo || currentVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        const width = currentVideo.videoWidth || 2;
        const height = currentVideo.videoHeight || 2;
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; runtime.gl.viewport(0, 0, width, height); }
        runtime.gl.useProgram(runtime.program);
        runtime.gl.activeTexture(runtime.gl.TEXTURE1);
        runtime.gl.bindTexture(runtime.gl.TEXTURE_3D, runtime.lutTexture);
        runtime.gl.uniform1f(runtime.gl.getUniformLocation(runtime.program, "uLutSize"), runtime.lutSize);
        runtime.gl.pixelStorei(runtime.gl.UNPACK_FLIP_Y_WEBGL, 1);
        runtime.gl.activeTexture(runtime.gl.TEXTURE0);
        runtime.gl.bindTexture(runtime.gl.TEXTURE_2D, runtime.videoTexture);
        runtime.gl.texImage2D(runtime.gl.TEXTURE_2D, 0, runtime.gl.RGB, runtime.gl.RGB, runtime.gl.UNSIGNED_BYTE, currentVideo);
        const currentGrade = gradeRef.current;
        runtime.gl.uniform1f(runtime.gl.getUniformLocation(runtime.program, "uVignette"), currentGrade.enabled ? currentGrade.vignette / 100 : 0);
        runtime.gl.uniform1f(runtime.gl.getUniformLocation(runtime.program, "uBefore"), beforeRef.current || !currentGrade.enabled ? 1 : 0);
        runtime.gl.uniform1f(runtime.gl.getUniformLocation(runtime.program, "uAspect"), width / height);
        runtime.gl.drawArrays(runtime.gl.TRIANGLES, 0, 6);
      };
      runtimeRef.current = { gl, program, videoTexture, lutTexture, lutSize: 2, frame: null, videoFrame: null, render };
      const schedule = () => {
        render();
        const currentVideo = videoRef.current;
        const runtime = runtimeRef.current;
        if (!runtime || !currentVideo) return;
        if (typeof currentVideo.requestVideoFrameCallback === "function") runtime.videoFrame = currentVideo.requestVideoFrameCallback(schedule);
        else runtime.frame = window.requestAnimationFrame(schedule);
      };
      schedule();
      queueMicrotask(() => setPreviewState("ready"));
    } catch {
      queueMicrotask(() => setPreviewState("error"));
    }
    return () => {
      const runtime = runtimeRef.current;
      if (runtime && runtime.frame !== null) window.cancelAnimationFrame(runtime.frame);
      if (runtime && runtime.videoFrame !== null && typeof video.cancelVideoFrameCallback === "function") video.cancelVideoFrameCallback(runtime.videoFrame);
      if (runtime) {
        runtime.gl.deleteTexture(runtime.videoTexture);
        runtime.gl.deleteTexture(runtime.lutTexture);
        runtime.gl.deleteProgram(runtime.program);
      }
      runtimeRef.current = null;
    };
  }, [src, videoRef]);

  useEffect(() => {
    if (previewState !== "ready") return;
    const worker = workerRef.current ?? new Worker(new URL("../../workers/color-lut-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    const flush = () => {
      if (workerBusyRef.current || !pendingRequestRef.current) return;
      const request = pendingRequestRef.current;
      pendingRequestRef.current = null;
      workerBusyRef.current = true;
      const transfers = request.lut ? [request.lut.values] : [];
      worker.postMessage(request, { transfer: transfers });
    };
    flushWorkerRef.current = flush;

    const receive = (event: MessageEvent<LutWorkerResult>) => {
      workerBusyRef.current = false;
      const current = runtimeRef.current;
      if (event.data.error || !event.data.rgba || !event.data.size) {
        if (!pendingRequestRef.current) setPreviewState("error");
        flush();
        return;
      }
      if (current) {
        try {
          const nextTexture = createLutTexture(current.gl, new Uint8Array(event.data.rgba), event.data.size);
          const previousTexture = current.lutTexture;
          current.lutTexture = nextTexture;
          current.lutSize = event.data.size;
          current.gl.deleteTexture(previousTexture);
          setAppliedRequestId(event.data.id);
          current.render();
        } catch {
          setPreviewState("error");
        }
      }
      flush();
    };

    worker.addEventListener("message", receive);
    flush();
    return () => {
      worker.removeEventListener("message", receive);
      flushWorkerRef.current = () => undefined;
    };
  }, [previewState]);

  useEffect(() => {
    if (previewState !== "ready") return;
    const id = ++requestIdRef.current;
    const values = sourceLut ? sourceLut.values.slice().buffer : undefined;
    pendingRequestRef.current = { id, settings: grade, lut: sourceLut && values ? { title: sourceLut.title, size: sourceLut.size, domainMin: sourceLut.domainMin, domainMax: sourceLut.domainMax, values } : undefined };
    flushWorkerRef.current();
  }, [grade, previewState, sourceLut, src]);

  useEffect(() => () => {
    pendingRequestRef.current = null;
    workerBusyRef.current = false;
    workerRef.current?.terminate();
  }, []);

  const canvasVisible = previewState === "ready";
  return <div className={`graded-video${canvasVisible ? " is-ready" : " is-fallback"}`}>
    <video ref={videoRef} className="graded-video-source" src={src} playsInline onPlay={onPlay} onPause={onPause} onEnded={onEnded} />
    <canvas ref={canvasRef} className="graded-video-canvas" aria-label={grade.enabled ? "Live color-graded video preview" : "Video preview"} data-grade-applied={appliedRequestId} />
  </div>;
}
