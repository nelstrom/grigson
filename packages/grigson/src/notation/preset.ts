export interface NotationPreset {
  major: string;
  minor: string;
  dominant7: string;
  halfDiminished: string;
  diminished: string;
  maj7: string;
  min7: string;
  dim7: string;
  dom7flat5: string;
  flat: string;
  sharp: string;
}

export const DEFAULT_PRESET: NotationPreset = {
  major: '',
  minor: 'm',
  dominant7: '7',
  halfDiminished: 'ø',
  diminished: '°',
  maj7: '△',
  min7: 'm7',
  dim7: '°7',
  dom7flat5: '7♭5',
  flat: '♭',
  sharp: '♯',
};
