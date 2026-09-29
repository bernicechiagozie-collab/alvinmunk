import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({ useInView: () => true }));

import { NumberTicker } from './number-ticker';

describe('NumberTicker', () => {
  let container: HTMLDivElement;
  let root: Root;
  let frames: FrameRequestCallback[];
  let reduceMotion: boolean;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    frames = [];
    reduceMotion = false;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('matchMedia', () => ({ matches: reduceMotion }));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function renderedValue() {
    return container.querySelector('span')?.textContent ?? '';
  }

  function render(value: number) {
    act(() => {
      root.render(<NumberTicker value={value} durationMs={1000} />);
    });
  }

  function runFrame(timestamp: number) {
    const frame = frames.shift();
    expect(frame).toBeDefined();
    act(() => frame?.(timestamp));
  }

  it('animates its first in-view appearance from zero to the requested value', () => {
    render(5);
    runFrame(0);
    expect(renderedValue()).toBe('0');
    runFrame(1000);
    expect(renderedValue()).toBe('5');
  });

  it('animates updates from the completed value without resetting through zero', () => {
    render(5);
    runFrame(0);
    runFrame(1000);

    render(4);
    runFrame(2000);
    expect(renderedValue()).toBe('5');
    runFrame(2500);
    expect(renderedValue()).not.toBe('0');
    expect(Number(renderedValue())).toBeGreaterThan(0);
    runFrame(3000);
    expect(renderedValue()).toBe('4');
  });

  it('snaps under reduced motion and uses the snapped value for later animations', () => {
    reduceMotion = true;
    render(5);
    expect(renderedValue()).toBe('5');
    expect(frames).toHaveLength(0);

    reduceMotion = false;
    render(4);
    runFrame(2000);
    expect(renderedValue()).toBe('5');
    runFrame(3000);
    expect(renderedValue()).toBe('4');
  });
});
