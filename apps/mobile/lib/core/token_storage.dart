import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure token storage backed by Keychain (iOS) / Keystore (Android).
class TokenStorage {
  TokenStorage(this._storage);
  final FlutterSecureStorage _storage;

  static const _access = 'access_token';
  static const _refresh = 'refresh_token';

  Future<void> save({required String access, required String refresh}) async {
    await _storage.write(key: _access, value: access);
    await _storage.write(key: _refresh, value: refresh);
  }

  Future<String?> get accessToken => _storage.read(key: _access);
  Future<String?> get refreshToken => _storage.read(key: _refresh);

  Future<void> clear() async {
    await _storage.delete(key: _access);
    await _storage.delete(key: _refresh);
  }
}

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(
    const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    ),
  );
});
