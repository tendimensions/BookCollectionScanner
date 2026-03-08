import 'package:flutter_test/flutter_test.dart';

import 'package:book_collection_scanner/main.dart';

void main() {
  testWidgets('App launches smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const BookScannerApp());
    expect(find.byType(BookScannerApp), findsOneWidget);
  });
}
