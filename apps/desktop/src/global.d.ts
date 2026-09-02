export {};
declare global {
  interface Window {
    remoteNative: {
      setControl(enabled: boolean): Promise<{ enabled: boolean; reason?: string }>;
      input(event: unknown): Promise<{ accepted: boolean; injected?: boolean }>;
    };
  }
}
