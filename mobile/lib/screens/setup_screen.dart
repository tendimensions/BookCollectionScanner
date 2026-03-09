import 'package:flutter/material.dart';
import '../models/book_models.dart';
import '../services/api_service.dart';
import 'scan_screen.dart';
import 'server_config_screen.dart';

class SetupScreen extends StatefulWidget {
  final ApiService api;
  const SetupScreen({super.key, required this.api});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  List<Category> _categories = [];
  List<Tag> _tags = [];
  Category? _selectedCategory;
  final Set<int> _selectedTagIds = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        widget.api.getCategories(),
        widget.api.getTags(),
      ]);
      setState(() {
        _categories = results[0] as List<Category>;
        _tags = results[1] as List<Tag>;
        _loading = false;
      });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _addCategory() async {
    final name = await _showNameDialog('New Category');
    if (name == null || name.trim().isEmpty) return;
    try {
      final cat = await widget.api.createCategory(name.trim());
      setState(() {
        _categories.add(cat);
        _selectedCategory = cat;
      });
    } catch (e) {
      _showError(e.toString());
    }
  }

  Future<void> _addTag() async {
    final name = await _showNameDialog('New Tag');
    if (name == null || name.trim().isEmpty) return;
    try {
      final tag = await widget.api.createTag(name.trim());
      setState(() {
        _tags.add(tag);
        _selectedTagIds.add(tag.id);
      });
    } catch (e) {
      _showError(e.toString());
    }
  }

  Future<String?> _showNameDialog(String title) => showDialog<String>(
        context: context,
        builder: (ctx) {
          final controller = TextEditingController();
          return AlertDialog(
            title: Text(title),
            content: TextField(controller: controller, autofocus: true, decoration: const InputDecoration(labelText: 'Name')),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
              TextButton(onPressed: () => Navigator.pop(ctx, controller.text), child: const Text('Create')),
            ],
          );
        },
      );

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  void _startScanning() {
    if (_selectedCategory == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ScanScreen(
          api: widget.api,
          category: _selectedCategory!,
          tags: _tags.where((t) => _selectedTagIds.contains(t.id)).toList(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Collection Scanner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Server settings',
            onPressed: () async {
              final navigator = Navigator.of(context);
              final newUrl = await navigator.push<String>(
                MaterialPageRoute(
                  builder: (_) => const ServerConfigScreen(allowBack: true),
                ),
              );
              if (newUrl != null) {
                navigator.pushReplacement(
                  MaterialPageRoute(
                    builder: (_) => SetupScreen(api: ApiService(baseUrl: newUrl)),
                  ),
                );
              }
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text('Error: $_error', style: const TextStyle(color: Colors.red)),
                  ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
                ]))
              : Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Category selector
                      Row(children: [
                        Expanded(
                          child: DropdownButtonFormField<Category>(
                            decoration: const InputDecoration(labelText: 'Category *', border: OutlineInputBorder()),
                            value: _selectedCategory,
                            items: _categories
                                .map((c) => DropdownMenuItem(value: c, child: Text(c.name)))
                                .toList(),
                            onChanged: (c) => setState(() => _selectedCategory = c),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(icon: const Icon(Icons.add), onPressed: _addCategory, tooltip: 'New Category'),
                      ]),
                      const SizedBox(height: 24),
                      // Tags multi-select
                      Row(children: [
                        const Text('Tags:', style: TextStyle(fontSize: 16)),
                        const Spacer(),
                        TextButton.icon(icon: const Icon(Icons.add), label: const Text('New Tag'), onPressed: _addTag),
                      ]),
                      Expanded(
                        child: _tags.isEmpty
                            ? const Center(child: Text('No tags yet. Create one above.'))
                            : ListView(
                                children: _tags.map((tag) => CheckboxListTile(
                                  title: Text(tag.name),
                                  value: _selectedTagIds.contains(tag.id),
                                  onChanged: (v) => setState(() {
                                    if (v == true) {
                                      _selectedTagIds.add(tag.id);
                                    } else {
                                      _selectedTagIds.remove(tag.id);
                                    }
                                  }),
                                )).toList(),
                              ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.qr_code_scanner),
                        label: const Text('Start Scanning'),
                        onPressed: _selectedCategory != null ? _startScanning : null,
                        style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
                      ),
                    ],
                  ),
                ),
    );
  }
}
