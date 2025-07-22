import { JSDOM } from 'jsdom';

// Create a virtual DOM and assign its properties to the global scope
const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost' });

global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
global.navigator = dom.window.navigator;