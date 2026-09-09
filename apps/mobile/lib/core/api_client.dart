import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'env.dart';
import 'token_storage.dart';

/// Dio-based API client with bearer-token injection and refresh-on-401.
class ApiClient {
  ApiClient(this._storage) : dio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl)) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.accessToken;
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            final refreshed = await _tryRefresh();
            if (refreshed) {
              final clone = await dio.fetch(error.requestOptions);
              return handler.resolve(clone);
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;
  final TokenStorage _storage;

  Future<bool> _tryRefresh() async {
    final refresh = await _storage.refreshToken;
    if (refresh == null) return false;
    try {
      final res = await Dio(BaseOptions(baseUrl: Env.apiBaseUrl))
          .post('/auth/refresh', data: {'refreshToken': refresh});
      await _storage.save(
        access: res.data['accessToken'] as String,
        refresh: res.data['refreshToken'] as String,
      );
      return true;
    } catch (_) {
      await _storage.clear();
      return false;
    }
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(tokenStorageProvider));
});
