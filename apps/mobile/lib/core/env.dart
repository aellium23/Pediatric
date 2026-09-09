/// Build-time configuration. Override with --dart-define for each flavor.
class Env {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  static const String appScheme = 'https';
  static const String appHost = 'pedia.app';
}
