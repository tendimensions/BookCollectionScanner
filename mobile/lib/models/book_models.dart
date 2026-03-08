class Category {
  final int id;
  final String name;

  const Category({required this.id, required this.name});

  factory Category.fromJson(Map<String, dynamic> json) =>
      Category(id: json['id'] as int, name: json['name'] as String);
}

class Tag {
  final int id;
  final String name;

  const Tag({required this.id, required this.name});

  factory Tag.fromJson(Map<String, dynamic> json) =>
      Tag(id: json['id'] as int, name: json['name'] as String);
}

class CreateBookRequest {
  final String isbn;
  final String? title;
  final List<String>? authors;
  final String? publisher;
  final String? publishedDate;
  final String? description;
  final int? pageCount;
  final String? thumbnailUrl;
  final String? language;
  final int categoryId;
  final List<int> tagIds;
  final Map<String, dynamic>? isbnRawData;

  const CreateBookRequest({
    required this.isbn,
    this.title,
    this.authors,
    this.publisher,
    this.publishedDate,
    this.description,
    this.pageCount,
    this.thumbnailUrl,
    this.language,
    required this.categoryId,
    required this.tagIds,
    this.isbnRawData,
  });

  Map<String, dynamic> toJson() => {
        'isbn': isbn,
        if (title != null) 'title': title,
        if (authors != null) 'authors': authors,
        if (publisher != null) 'publisher': publisher,
        if (publishedDate != null) 'published_date': publishedDate,
        if (description != null) 'description': description,
        if (pageCount != null) 'page_count': pageCount,
        if (thumbnailUrl != null) 'thumbnail_url': thumbnailUrl,
        if (language != null) 'language': language,
        'category_id': categoryId,
        'tag_ids': tagIds,
        if (isbnRawData != null) 'isbn_raw_data': isbnRawData,
      };
}
