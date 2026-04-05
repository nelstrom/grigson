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
  minor: '<small>m</small>',
  dominant7: '<sup>7</sup>',
  halfDiminished: '<sup><small>ø</small></sup>',
  diminished: '<sup><small>o</small></sup>',
  maj7: '<sup><small>△</small></sup>',
  min7: '<small>m</small><sup>7</sup>',
  dim7: '<sup><small>o</small>7</sup>',
  dom7flat5: '<sup>7♭5</sup>',
};

/** Real Book chord symbol dialect (e.g. CMA7, CMI, CMI7(♭5)). */
export const REALBOOK_PRESET: NotationPreset = {
  major: '',
  minor: '<small><small>MI</small></small>',
  dominant7: '<sup>7</sup>',
  halfDiminished: '<small><small>MI</small></small><sup>7(♭5)</sup>',
  diminished: '<sup>dim.</sup>',
  maj7: '<small><small>MA</small></small><sup>7</sup>',
  min7: '<small><small>MI</small></small><sup>7</sup>',
  dim7: '<sup><small>o</small>7</sup>',
  dom7flat5: '<sup>7(♭5)</sup>',
};
