import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';

class Child {
  Child({required this.id, required this.name, required this.birthDate});
  final String id;
  final String name;
  final DateTime birthDate;

  factory Child.fromJson(Map<String, dynamic> json) => Child(
        id: json['id'] as String,
        name: json['name'] as String,
        birthDate: DateTime.parse(json['birthDate'] as String),
      );
}

/// Async children list (FutureProvider) for the Home/Children tabs.
final childrenProvider = FutureProvider<List<Child>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.dio.get('/children');
  return (res.data as List).map((e) => Child.fromJson(e as Map<String, dynamic>)).toList();
});
