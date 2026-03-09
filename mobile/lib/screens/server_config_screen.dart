import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';
import 'setup_screen.dart';

const _prefKey = 'server_url';
const _defaultUrl = 'http://Locke.local';

/// Loads the saved server URL, or null if none has been configured yet.
Future<String?> loadSavedServerUrl() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_prefKey);
}

/// Saves the server URL to persistent storage.
Future<void> saveServerUrl(String url) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_prefKey, url);
}

class ServerConfigScreen extends StatefulWidget {
  /// When true the screen shows a back button (accessed from settings).
  /// When false it's the first-run flow with no way to go back.
  final bool allowBack;

  const ServerConfigScreen({super.key, this.allowBack = false});

  @override
  State<ServerConfigScreen> createState() => _ServerConfigScreenState();
}

class _ServerConfigScreenState extends State<ServerConfigScreen> {
  late final TextEditingController _controller;
  bool _testing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: _defaultUrl);
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final saved = await loadSavedServerUrl();
    if (saved != null && mounted) {
      setState(() => _controller.text = saved);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _testAndSave() async {
    final raw = _controller.text.trim();
    if (raw.isEmpty) return;

    // Normalise: strip trailing slash
    final url = raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;

    setState(() { _testing = true; _error = null; });

    try {
      final uri = Uri.parse('$url/api/health');
      final resp = await http.get(uri).timeout(const Duration(seconds: 5));
      if (resp.statusCode >= 400) throw Exception('Server returned ${resp.statusCode}');

      await saveServerUrl(url);

      if (!mounted) return;
      if (widget.allowBack) {
        // Return the new URL to the caller
        Navigator.pop(context, url);
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => SetupScreen(api: ApiService(baseUrl: url)),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _error = 'Could not reach server.\n${e.toString()}';
        _testing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Server Setup'),
        automaticallyImplyLeading: widget.allowBack,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.wifi_find, size: 64, color: Colors.deepPurple),
            const SizedBox(height: 24),
            const Text(
              'Enter your Book Scanner server address.',
              style: TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'If your server is named "Locke", try http://Locke.local',
              style: TextStyle(fontSize: 13, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _controller,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: 'http://Locke.local',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
              keyboardType: TextInputType.url,
              autocorrect: false,
              onSubmitted: (_) => _testAndSave(),
            ),
            const SizedBox(height: 16),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center,
                ),
              ),
            ElevatedButton.icon(
              icon: _testing
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.check_circle_outline),
              label: Text(_testing ? 'Testing…' : 'Connect'),
              onPressed: _testing ? null : _testAndSave,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
            ),
          ],
        ),
      ),
    );
  }
}
