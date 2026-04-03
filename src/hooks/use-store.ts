import { create } from 'zustand'

export type View = 'dashboard' | 'students' | 'student-detail' | 'exercises' | 'routines' | 'diets' | 'progress' | 'payments'

interface AppState {
  currentView: View
  selectedStudentId: string | null
  setCurrentView: (view: View) => void
  setSelectedStudentId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  selectedStudentId: null,
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedStudentId: (id) => set({ selectedStudentId: id })
}))
