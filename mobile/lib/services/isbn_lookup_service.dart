import 'dart:convert';
import 'package:http/http.dart' as http;

class IsbnMetadata {
  final String? title;
  final List<String> authors;
  final String? publisher;
  final String? publishedDate;
  final String? description;
  final int? pageCount;
  final String? thumbnailUrl;
  final String? language;
  final Map<String, dynamic> rawData;

  const IsbnMetadata({
    this.title,
    this.authors = const [],
    this.publisher,
    this.publishedDate,
    this.description,
    this.pageCount,
    this.thumbnailUrl,
    this.language,
    required this.rawData,
  });
}

class IsbnLookupService {
  static const _googleBooksUrl = 'https://www.googleapis.com/books/v1/volumes';
  static const _openLibraryUrl = 'https://openlibrary.org/api/books';

  final String? googleApiKey;

  const IsbnLookupService({this.googleApiKey});

  Future<IsbnMetadata?> lookup(String isbn) async {
    return await _googleBooks(isbn) ?? await _openLibrary(isbn);
  }

  Future<IsbnMetadata?> _googleBooks(String isbn) async {
    try {
      final params = {'q': 'isbn:$isbn', if (googleApiKey != null) 'key': googleApiKey!};
      final uri = Uri.parse(_googleBooksUrl).replace(queryParameters: params);
      final resp = await http.get(uri).timeout(const Duration(seconds: 10));
      if (resp.statusCode != 200) return null;

      final data = jsonDecode(resp.body) as Map<String, dynamic>;
      if ((data['totalItems'] as int? ?? 0) == 0) return null;

      final items = data['items'] as List;
      final info = (items.first as Map<String, dynamic>)['volumeInfo'] as Map<String, dynamic>;

      final imageLinks = info['imageLinks'] as Map<String, dynamic>?;

      return IsbnMetadata(
        title: info['title'] as String?,
        authors: (info['authors'] as List?)?.cast<String>() ?? [],
        publisher: info['publisher'] as String?,
        publishedDate: info['publishedDate'] as String?,
        description: info['description'] as String?,
        pageCount: info['pageCount'] as int?,
        thumbnailUrl: imageLinks?['thumbnail'] as String?,
        language: info['language'] as String?,
        rawData: data,
      );
    } catch (_) {
      return null;
    }
  }

  Future<IsbnMetadata?> _openLibrary(String isbn) async {
    try {
      final uri = Uri.parse(_openLibraryUrl).replace(queryParameters: {
        'bibkeys': 'ISBN:$isbn',
        'format': 'json',
        'jscmd': 'data',
      });
      final resp = await http.get(uri).timeout(const Duration(seconds: 10));
      if (resp.statusCode != 200) return null;

      final data = jsonDecode(resp.body) as Map<String, dynamic>;
      final key = 'ISBN:$isbn';
      if (!data.containsKey(key)) return null;

      final book = data[key] as Map<String, dynamic>;
      final authorsRaw = book['authors'] as List? ?? [];
      final authors = authorsRaw
          .cast<Map<String, dynamic>>()
          .map((a) => a['name'] as String? ?? '')
          .where((s) => s.isNotEmpty)
          .toList();

      final cover = book['cover'] as Map<String, dynamic>?;
      final thumbnail = cover?['medium'] ?? cover?['small'] ?? cover?['large'];

      final publishers = book['publishers'] as List? ?? [];
      final publisher = publishers.isNotEmpty
          ? (publishers.first as Map<String, dynamic>)['name'] as String?
          : null;

      return IsbnMetadata(
        title: book['title'] as String?,
        authors: authors,
        publisher: publisher,
        publishedDate: book['publish_date'] as String?,
        description: null,
        pageCount: book['number_of_pages'] as int?,
        thumbnailUrl: thumbnail as String?,
        language: null,
        rawData: data,
      );
    } catch (_) {
      return null;
    }
  }
}
