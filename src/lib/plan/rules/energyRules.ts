import { DayMode, EnergyLevel } from "@/types";

export interface EnergyConfig {
  maxTasks: number;
  maxMinutes: number;
  maxDifficulty: 1 | 2 | 3 | 4 | 5;
  taskTypes: string[];
}

export function getEnergyConfig(mode: DayMode, energy: EnergyLevel): EnergyConfig {
  const matrix: Record<DayMode, Record<EnergyLevel, EnergyConfig>> = {
    attack: {
      100: { maxTasks: 5, maxMinutes: 90, maxDifficulty: 5, taskTypes: ["create", "publish", "sales", "decide"] },
      70:  { maxTasks: 4, maxMinutes: 60, maxDifficulty: 4, taskTypes: ["create", "publish", "organize"] },
      40:  { maxTasks: 2, maxMinutes: 30, maxDifficulty: 3, taskTypes: ["create_light", "organize"] },
      10:  { maxTasks: 1, maxMinutes: 15, maxDifficulty: 2, taskTypes: ["minimum"] },
    },
    progress: {
      100: { maxTasks: 3, maxMinutes: 45, maxDifficulty: 4, taskTypes: ["create", "draft", "organize"] },
      70:  { maxTasks: 3, maxMinutes: 30, maxDifficulty: 3, taskTypes: ["draft", "organize", "reply"] },
      40:  { maxTasks: 2, maxMinutes: 20, maxDifficulty: 2, taskTypes: ["draft", "check"] },
      10:  { maxTasks: 1, maxMinutes: 10, maxDifficulty: 1, taskTypes: ["minimum"] },
    },
    maintain: {
      100: { maxTasks: 3, maxMinutes: 30, maxDifficulty: 2, taskTypes: ["organize", "environment", "plan"] },
      70:  { maxTasks: 2, maxMinutes: 20, maxDifficulty: 2, taskTypes: ["organize", "environment"] },
      40:  { maxTasks: 1, maxMinutes: 15, maxDifficulty: 1, taskTypes: ["environment", "minimum"] },
      10:  { maxTasks: 1, maxMinutes: 5,  maxDifficulty: 1, taskTypes: ["minimum"] },
    },
    protect: {
      100: { maxTasks: 2, maxMinutes: 30, maxDifficulty: 3, taskTypes: ["organize", "reply", "check"] },
      70:  { maxTasks: 2, maxMinutes: 20, maxDifficulty: 2, taskTypes: ["organize", "minimum_create"] },
      40:  { maxTasks: 1, maxMinutes: 15, maxDifficulty: 2, taskTypes: ["minimum_create", "open_only"] },
      10:  { maxTasks: 1, maxMinutes: 5,  maxDifficulty: 1, taskTypes: ["open_only"] },
    },
    recover: {
      100: { maxTasks: 2, maxMinutes: 15, maxDifficulty: 1, taskTypes: ["rest", "minimum_connect"] },
      70:  { maxTasks: 1, maxMinutes: 10, maxDifficulty: 1, taskTypes: ["minimum_connect"] },
      40:  { maxTasks: 1, maxMinutes: 5,  maxDifficulty: 1, taskTypes: ["minimum_connect"] },
      10:  { maxTasks: 1, maxMinutes: 5,  maxDifficulty: 1, taskTypes: ["rest"] },
    },
  };

  return matrix[mode][energy];
}
