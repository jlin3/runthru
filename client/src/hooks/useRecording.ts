import { useQuery } from "@tanstack/react-query";
import type { Recording } from "@shared/schema";

export function useRecording() {
  const {
    data: recordings,
    isLoading,
    error,
  } = useQuery<Recording[]>({
    queryKey: ["/api/recordings"],
  });

  return {
    recordings,
    isLoading,
    error,
  };
}

export function useRecordingDetails(id: number) {
  const {
    data: recording,
    isLoading,
    error,
  } = useQuery<Recording>({
    queryKey: [`/api/recordings/${id}`],
    enabled: !!id,
  });

  return {
    recording,
    isLoading,
    error,
  };
}
