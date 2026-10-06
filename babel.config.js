// The project has no implicit babel config — Metro's babel-preset-expo has to
// be declared here because the worklet plugins below need a home.
//
// Two separate worklet runtimes are in play, and each needs its own transform:
//
//  - react-native-worklets/plugin backs Reanimated 4. (In Reanimated 3 this was
//    'react-native-reanimated/plugin'; the worklet machinery moved out into its
//    own package for v4, and the old plugin path no longer exists.)
//  - react-native-worklets-core/plugin backs the VisionCamera frame processor
//    that the heart-rate screen reads PPG samples from.
//
// The worklets plugin MUST stay last: it rewrites worklets and expects to run
// after every other transform has had its turn.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets-core/plugin',
      'react-native-worklets/plugin',
    ],
  };
};
