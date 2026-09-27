export const PREFERENCES_KEY = "12-phut-ben-chua:preferences:v1";
export type Preferences = {
  theme: "system" | "light" | "dark";
  fontSize: "normal" | "large" | "largest";
  paceMode: "auto" | "manual";
  volume: number;
  musicEnabled: boolean;
};
export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system", fontSize: "normal", paceMode: "auto", volume: 0.42, musicEnabled: true,
};

export function parsePreferences(raw: string | null): Preferences {
  try {
    const value = JSON.parse(raw ?? "{}");
    return {
      theme: ["system", "light", "dark"].includes(value.theme) ? value.theme : "system",
      fontSize: ["normal", "large", "largest"].includes(value.fontSize) ? value.fontSize : "normal",
      paceMode: value.paceMode === "manual" ? "manual" : "auto",
      volume: typeof value.volume === "number" && Number.isFinite(value.volume)
        && value.volume >= 0 && value.volume <= 1 ? value.volume : 0.42,
      musicEnabled: typeof value.musicEnabled === "boolean" ? value.musicEnabled : true,
    };
  } catch { return { ...DEFAULT_PREFERENCES }; }
}
