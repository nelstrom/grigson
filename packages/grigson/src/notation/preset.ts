/**
 * Controls how chord qualities are rendered as HTML strings.
 *
 * Each field is an HTML fragment appended after the chord root. Fields accept
 * any inline HTML — the built-in presets use `<sup>`, `<small>`, and Unicode
 * glyphs to produce typographically correct chord symbols.
 *
 * Unspecified fields fall back to `DEFAULT_PRESET` when passed to `definePreset`.
 */
export interface NotationPreset {
  /** Major quality suffix. Typically empty — the root alone implies major. */
  major: string;
  /** Minor quality suffix (e.g. `<small>m</small>`). */
  minor: string;
  /** Dominant 7th suffix (e.g. `<sup>7</sup>`). */
  dominant7: string;
  /** Half-diminished / minor 7♭5 suffix (e.g. `<sup><small>ø</small></sup>`). */
  halfDiminished: string;
  /** Diminished triad suffix (e.g. `<sup><small>o</small></sup>`). */
  diminished: string;
  /** Major 7th suffix (e.g. `<sup><small>△</small></sup>`). */
  maj7: string;
  /** Minor 7th suffix (e.g. `<small>m</small><sup>7</sup>`). */
  min7: string;
  /** Diminished 7th suffix (e.g. `<sup><small>o</small>7</sup>`). */
  dim7: string;
  /** Dominant 7♭5 suffix (e.g. `<sup>7♭5</sup>`). */
  dom7flat5: string;
  /** Dominant 9th suffix (e.g. `<sup>9</sup>`). */
  dom9: string;
  /** Dominant 11th suffix (e.g. `<sup>11</sup>`). */
  dom11: string;
  /** Dominant 13th suffix (e.g. `<sup>13</sup>`). */
  dom13: string;
  /** Dominant 7♭9 suffix (e.g. `<sup>7♭9</sup>`). */
  dom7flat9: string;
  /** Dominant 7♯9 suffix (e.g. `<sup>7♯9</sup>`). */
  dom7sharp9: string;
  /** Dominant 7♯5 / augmented 7th suffix (e.g. `<sup>7♯5</sup>`). */
  dom7sharp5: string;
  /** Dominant 7♭13 suffix (e.g. `<sup>7♭13</sup>`). */
  dom7flat13: string;
  /** Suspended 4th suffix (e.g. `<sup><small>sus4</small></sup>`). */
  sus4: string;
  /** Suspended 2nd suffix (e.g. `<sup><small>sus2</small></sup>`). */
  sus2: string;
  /** Added 6th suffix (e.g. `<sup>6</sup>`). */
  add6: string;
}

/** Default notation preset. Uses Unicode musical glyphs (♭ ♯ ø ° △) and HTML superscripts. */
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
