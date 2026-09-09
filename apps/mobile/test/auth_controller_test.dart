import 'package:flutter_test/flutter_test.dart';
import 'package:pedia/features/auth/auth_controller.dart';

void main() {
  group('AuthState', () {
    test('defaults to unknown status, not loading', () {
      const state = AuthState();
      expect(state.status, AuthStatus.unknown);
      expect(state.loading, false);
      expect(state.error, isNull);
    });

    test('copyWith updates fields and clears error by default', () {
      const state = AuthState(status: AuthStatus.unauthenticated, error: 'x');
      final next = state.copyWith(status: AuthStatus.authenticated);
      expect(next.status, AuthStatus.authenticated);
      expect(next.error, isNull); // error intentionally not carried over
    });
  });
}
