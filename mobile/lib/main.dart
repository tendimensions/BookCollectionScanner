import 'package:flutter/material.dart';
import 'screens/server_config_screen.dart';
import 'screens/setup_screen.dart';
import 'services/api_service.dart';

void main() {
  runApp(const BookScannerApp());
}

class BookScannerApp extends StatelessWidget {
  const BookScannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Book Collection Scanner',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const _StartupRouter(),
    );
  }
}

/// Loads the saved server URL and routes to the correct first screen.
class _StartupRouter extends StatefulWidget {
  const _StartupRouter();

  @override
  State<_StartupRouter> createState() => _StartupRouterState();
}

class _StartupRouterState extends State<_StartupRouter> {
  @override
  void initState() {
    super.initState();
    _route();
  }

  Future<void> _route() async {
    final url = await loadSavedServerUrl();
    if (!mounted) return;
    if (url != null) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => SetupScreen(api: ApiService(baseUrl: url)),
        ),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const ServerConfigScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
