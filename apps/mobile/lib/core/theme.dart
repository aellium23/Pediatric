import 'package:flutter/material.dart';

/// Pédia design tokens → Material theme (light + dark). See design/04.
class PediaTheme {
  static const _primary = Color(0xFF1E6E6A);
  static const _secondary = Color(0xFF3DA35D);

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final scheme = ColorScheme.fromSeed(
      seedColor: _primary,
      brightness: brightness,
      secondary: _secondary,
    );
    return ThemeData(
      colorScheme: scheme,
      useMaterial3: true,
      // Premium, calm: rounded shapes, generous touch targets (>=48dp).
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
