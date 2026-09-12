import { Suspense } from "react";
import { AnalyzerShell } from "@/components/analyzer/analyzer-shell";

export default function SlayerLegendsAnalyzerPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <AnalyzerShell />
    </Suspense>
  );
}
