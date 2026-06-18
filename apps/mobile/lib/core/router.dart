import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/sign_in_screen.dart';
import '../features/home/home_screen.dart';

/// App router with auth-aware redirect and deep-link support
/// (Universal Links / App Links resolve to these paths).
final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      if (auth.status == AuthStatus.unknown) return null;
      final authed = auth.status == AuthStatus.authenticated;
      final atSignIn = state.matchedLocation == '/sign-in';
      if (!authed) return atSignIn ? null : '/sign-in';
      if (authed && atSignIn) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/sign-in', builder: (_, __) => const SignInScreen()),
      // Deep links (Increment 2): /consult/:id, /child/:id, /pediatrician/:slug
    ],
  );
});
