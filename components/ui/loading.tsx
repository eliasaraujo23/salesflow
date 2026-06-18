'use client'

import { useEffect } from "react";
import { Progress } from "./progress";
import { useLoading } from "@/contexts/loading-context";

export const Loading = () => {
  return (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-65" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="50.2655, 50.2655" d="M2,12a10,10 0 1,0 20,0a10,10 0 1,0 -20,0"></path>
    </svg>
  );
};

export function LoadingBar({ progress }: { progress: number }) {
  return (
    <div className="fixed top-16 w-full z-50">
      <Progress value={progress} />
    </div>
  );
};

export function ServerLoadingBar() {
  const { loading, setLoading, progress, setProgress } = useLoading();

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Aumenta o progresso em partes específicas
      if (progress < 30) {
        setLoading(true)
        setProgress(prevProgress => prevProgress + 1);
      } else if (progress < 50) {
        setProgress(prevProgress => prevProgress + 1);
      } else if (progress < 80) {
        setProgress(prevProgress => prevProgress + 1);
      } else if (progress < 100) {
        setProgress(prevProgress => prevProgress + 1);
      } else {
        // Quando atingir 100%, reseta o progresso
        setProgress(0);
        setLoading(false)
      }
    }, 100); // Tempo de intervalo reduzido para uma animação mais suave

    return () => clearTimeout(timeout);
  }, [progress, setLoading, setProgress]);

  return (
    <>
      {loading &&
        <div className="fixed top-16 w-full z-50">
          <Progress value={progress} />
        </div>
      }
    </>
  );
};



export function LoadingOverley({ isLoading }: { isLoading: boolean }) {
  return (
    <>
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-zinc-/95 z-[100] flex items-center justify-center">
          <Loading />
        </div>
      )}
    </>
  )
}