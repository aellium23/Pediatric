import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/token_storage.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({this.status = AuthStatus.unknown, this.loading = false, this.error});
  final AuthStatus status;
  final bool loading;
  final String? error;

  AuthState copyWith({AuthStatus? status, bool? loading, String? error}) => AuthState(
        status: status ?? this.status,
        loading: loading ?? this.loading,
        error: error,
      );
}

/// Riverpod StateNotifier driving the auth lifecycle (OAuth2.1/Apple/Google/Passkey).
class AuthController extends StateNotifier<AuthState> {
  AuthController(this._api, this._storage) : super(const AuthState()) {
    _bootstrap();
  }

  final ApiClient _api;
  final TokenStorage _storage;

  Future<void> _bootstrap() async {
    final token = await _storage.accessToken;
    state = state.copyWith(
      status: token != null ? AuthStatus.authenticated : AuthStatus.unauthenticated,
    );
  }

  Future<void> signInWithApple(String identityToken) =>
      _exchange('/auth/apple', {'identityToken': identityToken});

  Future<void> signInWithGoogle(String idToken) =>
      _exchange('/auth/google', {'idToken': idToken});

  Future<void> _exchange(String path, Map<String, dynamic> body) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final res = await _api.dio.post(path, data: body);
      await _storage.save(
        access: res.data['accessToken'] as String,
        refresh: res.data['refreshToken'] as String,
      );
      state = state.copyWith(status: AuthStatus.authenticated, loading: false);
    } catch (_) {
      state = state.copyWith(loading: false, error: 'Não foi possível entrar. Tenta outro método.');
    }
  }

  Future<void> signOut() async {
    await _storage.clear();
    state = state.copyWith(status: AuthStatus.unauthenticated);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(apiClientProvider), ref.watch(tokenStorageProvider));
});
