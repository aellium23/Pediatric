import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router.dart';
import 'core/theme.dart';

void main() {
  runApp(const ProviderScope(child: PediaApp()));
}

class PediaApp extends ConsumerWidget {
  const PediaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Pédia',
      debugShowCheckedModeBanner: false,
      theme: PediaTheme.light(),
      darkTheme: PediaTheme.dark(),
      themeMode: ThemeMode.system, // respects dark mode
      routerConfig: router,
    );
  }
}
