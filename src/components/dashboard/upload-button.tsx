"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadModal } from "./upload-modal";

interface UploadButtonProps {
  variant?: "primary" | "secondary" | "text" | "card";
  className?: string;
  children?: React.ReactNode;
}

export function UploadButton({
  variant = "primary",
  className = "",
  children,
}: UploadButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    router.refresh();
  };

  const baseStyles = {
    primary:
      "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition",
    secondary:
      "px-4 py-2 border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-medium rounded-lg transition",
    text:
      "text-emerald-600 hover:text-emerald-700 font-medium transition",
    card:
      "flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-100 w-full text-left",
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`${baseStyles[variant]} ${className}`}
      >
        {children || "+ Novo Extrato"}
      </button>
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
