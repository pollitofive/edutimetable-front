# Student Enrollment Smart Filtering Implementation

## Overview
This document describes the smart filtering feature implemented for the Student Enrollments create modal, which filters available schedules based on student availability and groups them by `group_id`.

## Features Implemented

### 1. Student Availability-Based Filtering
When a student is selected in the create modal:
- The system automatically loads the student's availabilities (day_of_week, start_time, end_time)
- Only schedules that fit within the student's availability windows are shown
- Example: If a student is available Monday 10:00-14:00, only schedules on Monday that start >= 10:00 and end <= 14:00 will be displayed

### 2. Schedule Grouping by `group_id`
Schedules with the same `group_id` are grouped together:
- Multiple schedule slots for the same course are grouped
- Display format: "Course Name - Description (Teacher) - Mon 10:00-12:00, Wed 10:00-12:00"
- Each time slot within a group can be selected individually

### 3. User Experience Enhancements
- **No student selected**: Shows a blue info message prompting to select a student
- **Loading availabilities**: Shows a loading spinner while fetching data
- **No availabilities configured**: Shows a yellow warning that the student has no availability
- **No matching schedules**: Shows a yellow warning when no schedules fit the student's availability
- **Schedule cleared on student change**: When changing the selected student, the schedule selection is automatically cleared

## Technical Implementation

### New Interfaces
```typescript
interface StudentAvailability {
  id: string
  student_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface ScheduleGroup {
  group_id: string
  course: Course
  teacher: Teacher
  description: string
  schedules: Schedule[]
  displayText: string
}
```

### New GraphQL Query
```graphql
query GetStudentAvailabilities($student_id: ID!) {
  studentAvailabilities(student_id: $student_id) {
    data {
      id
      student_id
      day_of_week
      start_time
      end_time
    }
  }
}
```

### Key Functions

#### `scheduleFitsInAvailability()`
Checks if a schedule fits within any of the student's availability slots:
- Matches day of week
- Verifies schedule start time >= availability start time
- Verifies schedule end time <= availability end time

#### `filteredSchedules` (computed)
Filters all schedules based on student availability:
- Returns empty array if no student selected
- Returns empty array if no availabilities loaded
- Returns schedules that fit within availability windows

#### `groupedSchedules` (computed)
Groups filtered schedules by `group_id`:
- Groups schedules with the same `group_id`
- Sorts schedules within each group by day and time
- Generates display text showing all time slots
- Returns sorted array of ScheduleGroup objects

### Watchers

#### Student Selection Watcher
```typescript
watch(() => formData.value.student_id, (newStudentId) => {
  // Clear schedule selection when student changes
  formData.value.schedule_id = ''

  // Load student availabilities if a student is selected
  if (newStudentId && !isEditMode.value) {
    studentAvailabilities.value = []
    refetchAvailabilities({ student_id: newStudentId })
  } else {
    studentAvailabilities.value = []
  }
})
```

## UI Components

### Schedule Dropdown (Create Mode)
- Uses `<optgroup>` for grouped schedules
- Each optgroup shows: "Course - Description (Teacher) - Day Time, Day Time"
- Individual options show: "Day HH:MM-HH:MM"
- Disabled when no student selected or no matching schedules

### Schedule Dropdown (Edit Mode)
- Shows all schedules without filtering
- Disabled (read-only) to prevent changing enrollment schedule

### Status Messages
1. **Info (Blue)**: "Please select a student first to see available schedules"
2. **Warning (Yellow)**: "This student has no availability configured"
3. **Warning (Yellow)**: "No schedules match this student's availability"
4. **Loading (Gray)**: "Loading student availabilities..."

## Example Display

### Grouped Schedule Display
```
English I 9 - Morning Session (John Doe) - Mon 10:00-12:00, Wed 10:00-12:00
  ├─ Monday 10:00-12:00
  └─ Wednesday 10:00-12:00
```

### Selection Flow
1. User selects a student
2. System loads student's availabilities
3. System filters schedules that fit within availability windows
4. System groups schedules by `group_id`
5. Dropdown shows grouped schedules with all time slots
6. User selects a specific time slot from the group
7. Enrollment is created for that specific schedule

## Benefits

1. **Prevents conflicts**: Only shows schedules the student can attend
2. **Better UX**: Groups related schedules for easier selection
3. **Clear feedback**: Informative messages guide the user
4. **Data integrity**: Ensures enrollments match student availability
5. **Automatic updates**: Schedule selection clears when student changes

## Future Enhancements

Potential improvements for future versions:
- Show number of available slots in each schedule group
- Add visual indicators for partially filled schedules
- Include capacity information (current/max students)
- Allow filtering by course level or year
- Add search functionality for schedules
