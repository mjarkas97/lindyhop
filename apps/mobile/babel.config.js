module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', {
        jsxImportSource: 'nativewind',
        // Hermes 0.12 can't parse native private class fields (#x); this
        // profile makes the preset downlevel them. Without it, RN's
        // DOMRectReadOnly polyfill crashes the app on boot.
        unstable_transformProfile: 'hermes-v0',
      }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  }
}
