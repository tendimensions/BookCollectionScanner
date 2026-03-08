import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/book_models.dart';

class ApiService {
  final String baseUrl;

  const ApiService({required this.baseUrl});

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  // ── Categories ────────────────────────────────────────────────────────────

  Future<List<Category>> getCategories() async {
    final resp = await http.get(_uri('/api/categories'));
    _checkStatus(resp);
    final list = jsonDecode(resp.body) as List;
    return list.map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Category> createCategory(String name) async {
    final resp = await http.post(
      _uri('/api/categories'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name}),
    );
    _checkStatus(resp);
    return Category.fromJson(jsonDecode(resp.body) as Map<String, dynamic>);
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  Future<List<Tag>> getTags() async {
    final resp = await http.get(_uri('/api/tags'));
    _checkStatus(resp);
    final list = jsonDecode(resp.body) as List;
    return list.map((e) => Tag.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Tag> createTag(String name) async {
    final resp = await http.post(
      _uri('/api/tags'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name}),
    );
    _checkStatus(resp);
    return Tag.fromJson(jsonDecode(resp.body) as Map<String, dynamic>);
  }

  // ── Books ─────────────────────────────────────────────────────────────────

  Future<void> createBook(CreateBookRequest request) async {
    final resp = await http.post(
      _uri('/api/books'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(request.toJson()),
    );
    _checkStatus(resp);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  void _checkStatus(http.Response resp) {
    if (resp.statusCode >= 400) {
      throw ApiException(resp.statusCode, resp.body);
    }
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String body;
  const ApiException(this.statusCode, this.body);

  @override
  String toString() => 'ApiException($statusCode): $body';
}
