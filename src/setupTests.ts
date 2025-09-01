/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "core-js/features/structured-clone";
import "@testing-library/jest-dom";

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return [];
  }
  addTrack(track: any) {}
  removeTrack(track: any) {}
}
(global as any).MediaStream = MockMediaStream;

process.env.REACT_APP_GEMINI_API_KEY = "test-key";

Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(new MediaStream()),
  },
  writable: true,
});

// Mock Web Audio API
const mockAudioContext = {
  createBuffer: jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(1024)),
    duration: 0.023, // a dummy duration
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    buffer: null,
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
    },
  })),
  destination: {},
  currentTime: 0,
  resume: jest.fn().mockResolvedValue(undefined),
};

(global as any).AudioContext = jest.fn(() => mockAudioContext);
(global as any).webkitAudioContext = jest.fn(() => mockAudioContext);

// Mock HTMLMediaElement.prototype.play for jsdom
if (window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => { /* do nothing */ };
}


jest.mock("./lib/utils", () => ({
  ...jest.requireActual("./lib/utils"),
  audioContext: jest.fn(() => Promise.resolve(mockAudioContext)),
}));
