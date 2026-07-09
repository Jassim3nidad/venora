"use client";

import { useMutation } from "@tanstack/react-query";
import { comparePackages } from "../api/ai-package-comparison.client";
import type {
  ComparePackagesRequest,
  ComparePackagesResponse,
} from "../schemas/comparison.schema";

export function usePackageComparison() {
  return useMutation<ComparePackagesResponse, Error, ComparePackagesRequest>({
    mutationFn: comparePackages,
  });
}
