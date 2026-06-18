import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_controller.dart';

/// Sign-in screen (P-02). Bottom-anchored CTAs for one-handed use.
class SignInScreen extends ConsumerWidget {
  const SignInScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authControllerProvider);
    final controller = ref.read(authControllerProvider.notifier);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Text(
                'O pediatra de confiança,\nà distância de uma mensagem.',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text('Pediatras verificados · Seguro e privado 🔒'),
              const Spacer(),
              if (state.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(state.error!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ),
              // Zona quente: ações primárias ao alcance do polegar.
              FilledButton.icon(
                onPressed: state.loading
                    ? null
                    : () => controller.signInWithApple('DEMO_APPLE_TOKEN'),
                icon: const Icon(Icons.apple),
                label: const Text('Continuar com Apple'),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: state.loading
                    ? null
                    : () => controller.signInWithGoogle('DEMO_GOOGLE_TOKEN'),
                icon: const Icon(Icons.account_circle_outlined),
                label: const Text('Continuar com Google'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: state.loading ? null : () {},
                child: const Text('Usar passkey 🔑'),
              ),
              const SizedBox(height: 8),
              const Text(
                'Ao continuar aceitas os Termos e a Privacidade.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
