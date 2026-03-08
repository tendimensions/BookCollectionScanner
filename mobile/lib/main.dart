import 'package:flutter/material.dart';
import 'screens/setup_screen.dart';
import 'services/api_service.dart';

// TODO: Update SERVER_URL to your server's local IP or mDNS hostname
const _serverUrl = 'http://192.168.1.100:8000';

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
      home: SetupScreen(api: ApiService(baseUrl: _serverUrl)),
    );
  }
}
