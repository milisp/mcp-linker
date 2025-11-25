import { create } from "zustand";

interface TaskStore {
  taskStartTime: number | null;
  taskEndTime: number | null;
  taskDuration: number | null;
  setTaskStartTime: (time: number | null) => void;
  setTaskEndTime: (time: number | null) => void;
  setTaskDuration: (duration: number | null) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  taskStartTime: null,
  taskEndTime: null,
  taskDuration: null,
  setTaskStartTime: (time) => set({ taskStartTime: time, taskEndTime: null, taskDuration: null }),
  setTaskEndTime: (time) => set((state) => {
    const duration = state.taskStartTime && time !== null ? (time - state.taskStartTime) / 1000 : null;
    return { taskEndTime: time, taskDuration: duration };
  }),
  setTaskDuration: (duration) => set({ taskDuration: duration }),
}));