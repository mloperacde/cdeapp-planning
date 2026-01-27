export const SHIFTS = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde',
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
  AFTERNOON_40H: {
    startHour: 14,
    endHour: 22
  }
};

export const WORKING_HOURS = {
  START_MINUTES: 7 * 60,
  END_MINUTES: 22 * 60
};
