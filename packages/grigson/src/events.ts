/**
 * Dispatched by a renderer element when its configuration changes and
 * GrigsonChart should re-render with the updated renderer settings.
 */
export class GrigsonRendererUpdateEvent extends Event {
  static readonly type = 'grigson:renderer-update';

  constructor() {
    super(GrigsonRendererUpdateEvent.type, { bubbles: true, composed: true });
  }
}

/**
 * Dispatched by GrigsonChart when the chart source fails to parse.
 */
export class GrigsonParseErrorEvent extends Event {
  static readonly type = 'grigson:parse-error';

  readonly error: unknown;

  constructor(error: unknown) {
    super(GrigsonParseErrorEvent.type, { bubbles: true, composed: true });
    this.error = error;
  }
}

/**
 * Dispatched by GrigsonChart when the renderer element throws during renderChart().
 */
export class GrigsonRenderErrorEvent extends Event {
  static readonly type = 'grigson:render-error';

  readonly error: unknown;

  constructor(error: unknown) {
    super(GrigsonRenderErrorEvent.type, { bubbles: true, composed: true });
    this.error = error;
  }
}
