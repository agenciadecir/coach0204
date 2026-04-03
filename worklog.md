# Fitness Coach Webapp - Worklog

---
## Task ID: improvements-001 - All Tasks
### Work Task
Implement 4 improvements for the Fitness Coach webapp:
1. Student access to archived routines/diets
2. Progress improvements for students
3. Fix payment method selector
4. Exercises view improvements

### Work Summary

#### Task 1: Student access to archived routines/diets
- **Status**: Already implemented - verified that the toggle "Ver archivadas" exists in student-detail-view.tsx
- The API already supports `includeArchived` parameter
- Edit/delete buttons are hidden for non-coaches (`isCoach` check)
- Students can view archived routines/diets in read-only mode

#### Task 2: Progress improvements for students
**Files Modified:**
- `/home/z/my-project/src/components/views/student-detail-view.tsx`
- `/home/z/my-project/src/app/api/progress/route.ts`

**Changes:**
1. Updated ProgressRecord interface to include `frontPhoto`, `backPhoto`, `sidePhoto` fields
2. Updated progressForm state to use new simplified fields:
   - `weight` (Peso)
   - `back` (Espalda)
   - `chest` (Pecho)
   - `arms` (Brazos - combined left/right)
   - `waist` (Abdomen)
   - `hip` (Glúteo)
   - `thighs` (Piernas - combined left/right)
   - `frontPhoto`, `backPhoto`, `sidePhoto` (image URLs)
3. Removed `isCoach` check from "Nuevo Registro" button - students can now add their own progress
4. Updated `handleSaveProgress` function to map new form fields to database fields
5. Updated progress dialog form with new fields and photo URL inputs
6. Updated API to handle `frontPhoto`, `backPhoto`, `sidePhoto` fields

#### Task 3: Fix payment method selector
**Files Modified:**
- `/home/z/my-project/src/components/views/student-detail-view.tsx`

**Changes:**
1. Added shadcn/ui Select component imports
2. Replaced native HTML `<select>` with shadcn/ui Select component
3. Added new payment method option: "Mercado Pago"
4. Options: Efectivo (cash), Transferencia (transfer), Tarjeta (card), Mercado Pago

#### Task 4: Exercises view for Coach
**Files Modified:**
- `/home/z/my-project/src/components/views/exercises-view.tsx`
- `/home/z/my-project/src/app/page.tsx`

**Changes:**
1. Added Accordion component imports
2. Replaced static section headers with collapsible Accordion sections by muscle group
3. Added `imageUrl` field support in formData state
4. Updated `openCreateDialog` and `openEditDialog` to handle imageUrl
5. Added image thumbnail display in exercise cards (when imageUrl is available)
6. Added imageUrl input field in the exercise form dialog
7. Added "Ejercicios" navigation item for students (read-only access to exercise library)

### Files Changed Summary
- `src/components/views/student-detail-view.tsx` - Progress form, payment selector, archived toggle
- `src/components/views/exercises-view.tsx` - Accordion sections, imageUrl support
- `src/app/api/progress/route.ts` - Added photo URL fields
- `src/app/page.tsx` - Added exercises to student navigation

### Lint Status
All changes pass ESLint validation.
