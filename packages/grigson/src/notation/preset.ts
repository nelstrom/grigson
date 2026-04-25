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
  dom9: string;
  dom11: string;
  dom13: string;
  dom7flat9: string;
  dom7sharp9: string;
  dom7sharp5: string;
  dom7flat13: string;
  sus4: string;
  sus2: string;
  add6: string;
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
  dom9: '<sup>9</sup>',
  dom11: '<sup>11</sup>',
  dom13: '<sup>13</sup>',
  dom7flat9: '<sup>7♭9</sup>',
  dom7sharp9: '<sup>7♯9</sup>',
  dom7sharp5: '<sup>7♯5</sup>',
  dom7flat13: '<sup>7♭13</sup>',
  sus4: '<sup><small>sus4</small></sup>',
  sus2: '<sup><small>sus2</small></sup>',
  add6: '<sup>6</sup>',
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
  dom9: '<sup>9</sup>',
  dom11: '<sup>11</sup>',
  dom13: '<sup>13</sup>',
  dom7flat9: '<sup>7(♭9)</sup>',
  dom7sharp9: '<sup>7(♯9)</sup>',
  dom7sharp5: '<sup>7(♯5)</sup>',
  dom7flat13: '<sup>7(♭13)</sup>',
  sus4: '<sup>sus4</sup>',
  sus2: '<sup>sus2</sup>',
  add6: '<sup>6</sup>',
};
