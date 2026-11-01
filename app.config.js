export default {
  expo: {
    name: "Stream Toker",
    slug: "stream-toker-2",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    platforms: ["android", "ios"],
    sdkVersion: "53.0.0",

    android: {
      package: "com.streamtoker.app",
      permissions: ["CAMERA", "RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS"]
    },

    ios: {
      bundleIdentifier: "com.streamtoker.app",
      infoPlist: {
        NSCameraUsageDescription: "Stream Toker uses your camera when you start a live video.",
        NSMicrophoneUsageDescription: "Stream Toker uses your microphone when you start or join a live video."
      }
    },

    owner: "stream-toker-2",

    extra: {
      eas: {
        projectId: "68feb2f6-1068-44d8-818a-26c4f514fd52"
      }
    }
  }
};
