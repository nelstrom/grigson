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
}

export const DEFAULT_PRESET: NotationPreset = {
  major: '',
  minor: 'm',
  dominant7: '<sup>7</sup>',
  halfDiminished: '<sup>Ø</sup>',
  diminished: '°',
  maj7: '<sup>△</sup>',
  min7: 'm<sup>7</sup>',
  dim7: '°<sup>7</sup>',
  dom7flat5: '<sup>7♭5</sup>',
};

/** Real Book chord symbol dialect (e.g. CMA7, CMI, CMI7(♭5)). */
export const REALBOOK_PRESET: NotationPreset = {
  major: '',
  minor: '<small>MI</small>',
  dominant7: '<sup>7</sup>',
  halfDiminished: '<small>MI</small><sup>7(♭5)</sup>',
  diminished: '<sup>dim.</sup>',
  maj7: '<small>MA</small><sup>7</sup>',
  min7: '<small>MI</small><sup>7</sup>',
  dim7: '<sup>°7</sup>',
  dom7flat5: '<sup>7(♭5)</sup>',
};
