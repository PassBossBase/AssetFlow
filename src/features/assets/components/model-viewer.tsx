"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";

type ModelErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type ModelErrorBoundaryState = {
  hasError: boolean;
};

class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  state: ModelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  return (
    <Bounds fit clip observe margin={1.15}>
      <primitive object={scene} />
    </Bounds>
  );
}

function ModelLoading({ loadingLabel, preparingLabel }: { loadingLabel: string; preparingLabel: string }) {
  const { progress } = useProgress();
  const isPreparing = progress >= 96;

  return (
    <Html center>
      <div className="w-52 rounded-xl border border-white/[0.12] bg-[#081321]/90 px-4 py-3 text-center shadow-[0_14px_34px_rgba(0,0,0,0.3)] backdrop-blur-sm">
        <span className="mx-auto block size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-2 text-xs font-medium text-foreground">{isPreparing ? preparingLabel : loadingLabel}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
}

export function ModelViewer({ url, label, hint, loadingLabel, preparingLabel }: { url: string; label: string; hint: string; loadingLabel: string; preparingLabel: string }) {
  return (
    <div className="relative h-[min(62vh,38rem)] min-h-80 overflow-hidden rounded-xl border border-primary/20 bg-[radial-gradient(circle_at_30%_20%,rgb(96_165_250_/_0.16),transparent_42%),radial-gradient(circle_at_80%_85%,rgb(192_132_252_/_0.14),transparent_38%),rgb(8_15_30_/_0.86)]">
      <ModelErrorBoundary fallback={<div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">{label}</div>}>
        <Canvas frameloop="demand" camera={{ position: [3, 2.4, 3], fov: 42 }} dpr={[1, 1.35]} gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}>
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 6, 3]} intensity={2.4} color="#dbeafe" />
          <directionalLight position={[-4, 2, -2]} intensity={1.1} color="#c4b5fd" />
          <Suspense fallback={<ModelLoading loadingLabel={loadingLabel} preparingLabel={preparingLabel} />}>
            <Model url={url} />
          </Suspense>
          <OrbitControls enablePan={false} makeDefault />
        </Canvas>
      </ModelErrorBoundary>
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm">{hint}</p>
    </div>
  );
}
