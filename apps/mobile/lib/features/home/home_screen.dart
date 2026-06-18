import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../children/children_controller.dart';

/// Home / Família (P-05) with bottom tab bar (one-handed navigation).
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final children = ref.watch(childrenProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Olá 👋'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('As tuas crianças', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Expanded(
                child: children.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (_, __) => const Center(child: Text('Não foi possível carregar.')),
                  data: (list) => list.isEmpty
                      ? const _EmptyChildren()
                      : ListView(
                          children: [
                            for (final c in list)
                              Card(
                                child: ListTile(
                                  leading: const CircleAvatar(child: Icon(Icons.child_care)),
                                  title: Text(c.name),
                                  trailing: const Icon(Icons.chevron_right),
                                ),
                              ),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Início'),
          NavigationDestination(icon: Icon(Icons.child_care_outlined), label: 'Crianças'),
          NavigationDestination(icon: Icon(Icons.add_circle), label: 'Consultar'),
          NavigationDestination(icon: Icon(Icons.calendar_today_outlined), label: 'Agenda'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Conta'),
        ],
      ),
    );
  }
}

class _EmptyChildren extends StatelessWidget {
  const _EmptyChildren();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.child_care, size: 48),
          const SizedBox(height: 12),
          const Text('Ainda não tens crianças.'),
          const SizedBox(height: 12),
          FilledButton(onPressed: () {}, child: const Text('Adicionar criança')),
        ],
      ),
    );
  }
}
