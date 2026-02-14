/**
 * @fileoverview Public API type definitions.
 */

/**
 * @typedef {Object} EditorInstanceAPI
 * @property {function(): string} getContent
 * @property {function(string): void} setContent
 * @property {function(): Object} getJSON
 * @property {function(): void} focus
 * @property {function(): void} blur
 * @property {function(): void} undo
 * @property {function(): void} redo
 * @property {function(string): void} insertContent
 * @property {function(string, function): void} registerCommand
 * @property {function(Object): void} registerPlugin
 * @property {function(): Object|null} getSelection
 * @property {Object} formatter
 * @property {function(string): void} formatter.toggle
 * @property {function(string): boolean} formatter.match
 */

export default {}
