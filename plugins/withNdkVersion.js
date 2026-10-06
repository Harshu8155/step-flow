// Pin the Android NDK to a version that's actually installed on this machine.
//
// RN 0.85 defaults to NDK 27.1.12297006, which the local SDK only has as an
// empty stub from an aborted download, so Gradle fails at configuration time
// with "did not have a source.properties file". expo-build-properties used to
// expose `android.ndkVersion`, but SDK 56 dropped that key — so the value is
// assigned directly on the root project instead.
//
// The assignment has to go ABOVE `apply plugin: "com.facebook.react.rootproject"`:
// that plugin configures :app during root evaluation, and :app reads
// `rootProject.ext.ndkVersion` as it's configured. Appending to the end of the
// file sets the value after :app has already been configured, which silently
// does nothing and leaves the build on RN's default NDK.
//
// Delete this plugin once `sdkmanager "ndk;27.1.12297006"` has been run
// successfully — matching RN's pinned NDK is preferable to overriding it.
const { withProjectBuildGradle } = require('@expo/config-plugins');

const NDK_VERSION = '29.0.14206865';
const MARKER = '// expo-config-plugin: local NDK override';

module.exports = function withNdkVersion(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withNdkVersion: expected android/build.gradle to be Groovy.');
    }
    if (!cfg.modResults.contents.includes(MARKER)) {
      const anchor = 'apply plugin: "expo-root-project"';
      if (!cfg.modResults.contents.includes(anchor)) {
        throw new Error(`withNdkVersion: could not find '${anchor}' in android/build.gradle`);
      }
      // Setting the root version is not enough: individual native modules pin
      // their own (react-native-worklets-core asks for 27.0.12077973), and
      // Gradle will sit there trying to auto-download each missing one before
      // failing. The subprojects block reassigns every Android module to the
      // installed NDK once it has been evaluated.
      const block = [
        MARKER,
        `ext.ndkVersion = "${NDK_VERSION}"`,
        '',
        'subprojects { subproject ->',
        '  afterEvaluate {',
        '    if (subproject.extensions.findByName("android") != null) {',
        '      subproject.android.ndkVersion = rootProject.ext.ndkVersion',
        '    }',
        '  }',
        '}',
        '',
      ].join('\n');

      cfg.modResults.contents = cfg.modResults.contents.replace(anchor, `${block}\n${anchor}`);
    }
    return cfg;
  });
};
