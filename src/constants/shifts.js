export const SHIFTS = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
  NIGHT: 'Noche',
  FIXED_MORNING: 'Fijo Mañana',
  FIXED_AFTERNOON: 'Fijo Tarde',
  ROTATING: 'Rotativo'
};

export const WORK_SCHEDULES = {
  MORNING: {
    startHour: 7,
    endHour: 15
  },
  AFTERNOON: {
    startHour: 15,
    endHour: 22
  },
  NIGHT: {
    startHour: 22,
    endHour: 6
  },
  AFTERNOON_40H: {
    startHour: 14,
    endHour: 22
  }
};

export const WORKING_HOURS = {
  START_MINUTES: 6 * 60, // Start at 6:00 for Night shift overlap or general view
  END_MINUTES: 22 * 60 + 60 // End at 23:00? Or handle next day?
};
